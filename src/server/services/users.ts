import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { sha256 } from "@/server/auth/crypto";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { getRequestMeta } from "@/server/auth/request";
import { parseInput } from "@/server/utils/result";
import { registerSchema } from "@/server/validation/auth";
import { AppError, ValidationError } from "@/server/errors";

export async function registerUser(input: unknown) {
  const data = parseInput(registerSchema, input);
  const meta = await getRequestMeta();
  const limiter = checkRateLimit(makeRateLimitKey("register", meta.ipAddress, data.email), 5, 60 * 60 * 1000);
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
          identifier: `email:${created.email}`,
          token: sha256(rawVerificationToken),
          expires: new Date(Date.now() + 1000 * 60 * 60 * 24)
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

  return {
    user,
    verificationToken: process.env.NODE_ENV === "production" || !shouldVerifyEmail ? undefined : rawVerificationToken
  };
}

export async function markEmailVerified(email: string, rawToken: string) {
  const tokenHash = sha256(rawToken);
  const key = `email:${email.toLowerCase()}`;
  const token = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: key, token: tokenHash } }
  });
  if (!token || token.expires < new Date()) throw new AppError("TOKEN_INVALID", "Invalid or expired verification token", 400);

  await db.$transaction([
    db.user.update({ where: { email: email.toLowerCase() }, data: { emailVerified: new Date(), status: "ACTIVE" } }),
    db.verificationToken.delete({ where: { identifier_token: { identifier: key, token: tokenHash } } })
  ]);
}

export type UserSafeSelect = Prisma.UserGetPayload<{
  select: { id: true; name: true; email: true; globalRole: true; status: true; timezone: true }
}>;
