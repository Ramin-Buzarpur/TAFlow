import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { sha256 } from "@/server/auth/crypto";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { getRequestMeta } from "@/server/auth/request";
import { parseInput } from "@/server/utils/result";
import { registerSchema, changePasswordSchema, updateProfileSchema, resendVerificationEmailSchema } from "@/server/validation/auth";
import { AppError, ValidationError, PermissionError } from "@/server/errors";
import { sendMail } from "@/server/email/mailer";
import { verifyEmailEmail } from "@/server/email/templates";
import { verifyPassword } from "@/server/auth/password";

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

function emailVerificationIdentifier(email: string) {
  return `email:${email.toLowerCase()}`;
}

function buildEmailVerificationUrl(email: string, rawToken: string) {
  return `${process.env.AUTH_URL || "http://localhost:3000"}/verify-email?email=${encodeURIComponent(email)}&token=${rawToken}`;
}

export async function registerUser(input: unknown) {
  const data = parseInput(registerSchema, input);
  const meta = await getRequestMeta();
  const limiter = await checkRateLimit(makeRateLimitKey("register", meta.ipAddress, data.email), 5, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many registration attempts", 429);

  const exists = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (exists) throw new ValidationError({ email: ["Email is already registered"] });

  const passwordHash = await hashPassword(data.password);
  const shouldVerifyEmail = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
  const rawVerificationToken = randomBytes(32).toString("base64url");

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        passwordChangedAt: new Date(),
        status: shouldVerifyEmail ? "PENDING_EMAIL" : "ACTIVE",
        emailVerified: shouldVerifyEmail ? null : new Date(),
        timezone: data.timezone,
        studentProfile: data.studentNumber
          ? {
              create: {
                studentNumber: data.studentNumber
              }
            }
          : undefined
      },
      select: { id: true, email: true, name: true, status: true }
    });

    if (shouldVerifyEmail) {
      await tx.verificationToken.create({
        data: {
          identifier: emailVerificationIdentifier(created.email),
          token: sha256(rawVerificationToken),
          expires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
        }
      });
    }

    await tx.securityEvent.create({
      data: {
        userId: created.id,
        type: "LOGIN_SUCCESS",
        severity: "info",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { event: "account_registered", requiresEmailVerification: shouldVerifyEmail }
      }
    });

    return created;
  });

  if (shouldVerifyEmail) {
    const verifyUrl = buildEmailVerificationUrl(user.email, rawVerificationToken);
    const email = verifyEmailEmail(verifyUrl);
    await sendMail({ to: user.email, ...email });
  }

  return {
    user,
    verificationToken: process.env.NODE_ENV === "production" || !shouldVerifyEmail ? undefined : rawVerificationToken
  };
}

export async function markEmailVerified(email: string, rawToken: string) {
  const tokenHash = sha256(rawToken);
  const key = emailVerificationIdentifier(email);
  const token = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: key, token: tokenHash } }
  });
  if (!token || token.expires < new Date()) throw new AppError("TOKEN_INVALID", "Invalid or expired verification token", 400);

  await db.$transaction([
    db.user.update({ where: { email: email.toLowerCase() }, data: { emailVerified: new Date(), status: "ACTIVE" } }),
    db.verificationToken.delete({ where: { identifier_token: { identifier: key, token: tokenHash } } })
  ]);
}

export async function resendVerificationEmail(input: unknown) {
  const data = parseInput(resendVerificationEmailSchema, input);
  const meta = await getRequestMeta();
  const limiter = await checkRateLimit(makeRateLimitKey("resend-verification", meta.ipAddress, data.email), 4, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many verification email requests", 429);

  const user = await db.user.findUnique({
    where: { email: data.email },
    select: { id: true, email: true, status: true, emailVerified: true }
  });

  if (!user || user.status === "DELETED" || user.status === "SUSPENDED" || user.emailVerified) {
    return { ok: true, verificationToken: undefined };
  }

  const rawVerificationToken = randomBytes(32).toString("base64url");
  const identifier = emailVerificationIdentifier(user.email);

  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({
      data: {
        identifier,
        token: sha256(rawVerificationToken),
        expires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS)
      }
    }),
    db.securityEvent.create({
      data: {
        userId: user.id,
        type: "LOGIN_SUCCESS",
        severity: "info",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { event: "email_verification_resent" }
      }
    })
  ]);

  const email = verifyEmailEmail(buildEmailVerificationUrl(user.email, rawVerificationToken));
  await sendMail({ to: user.email, ...email });

  return {
    ok: true,
    verificationToken: process.env.NODE_ENV === "production" ? undefined : rawVerificationToken
  };
}

export type UserSafeSelect = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true; globalRole: true; status: true; timezone: true }
}>;

export async function getMyProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, globalRole: true, status: true, timezone: true, twoFactorEnabled: true, twoFactorRequired: true, twoFactorChangedAt: true, studentProfile: true, professorProfile: true }
  });
  if (!user) throw new AppError("NOT_FOUND", "User not found", 404);
  return user;
}

export async function updateMyProfile(userId: string, input: unknown) {
  const data = parseInput(updateProfileSchema, input);
  return db.user.update({ where: { id: userId }, data, select: { id: true, name: true, timezone: true } });
}

export async function changeMyPassword(userId: string, input: unknown) {
  const data = parseInput(changePasswordSchema, input);
  const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user?.passwordHash) throw new PermissionError("Password login is not enabled for this account");
  const valid = await verifyPassword(user.passwordHash, data.currentPassword);
  if (!valid) throw new AppError("INVALID_PASSWORD", "Current password is incorrect", 401);
  const passwordHash = await hashPassword(data.newPassword);
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
    db.session.deleteMany({ where: { userId } })
  ]);
  return { ok: true };
}
