import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { sha256 } from "@/server/auth/crypto";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { getRequestMeta } from "@/server/auth/request";
import { AppError } from "@/server/errors";
import { parseInput } from "@/server/utils/result";
import { forgotPasswordSchema, resetPasswordSchema } from "@/server/validation/auth";
import { sendMail } from "@/server/email/mailer";
import { passwordResetEmail } from "@/server/email/templates";

export async function requestPasswordReset(input: unknown) {
  const data = parseInput(forgotPasswordSchema, input);
  const meta = await getRequestMeta();
  const limiter = checkRateLimit(makeRateLimitKey("forgot-password", meta.ipAddress, data.email), 4, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many password reset attempts", 429);

  const user = await db.user.findUnique({ where: { email: data.email }, select: { id: true, email: true, status: true } });
  if (!user || user.status === "DELETED") return { ok: true };

  const rawToken = randomBytes(32).toString("base64url");
  const identifier = `password-reset:${user.email}`;
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({
      data: { identifier, token: sha256(rawToken), expires: new Date(Date.now() + 1000 * 60 * 30) }
    }),
    db.securityEvent.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET_REQUESTED",
        severity: "info",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent
      }
    })
  ]);

  const resetUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/reset-password?email=${encodeURIComponent(user.email)}&token=${rawToken}`;
  const email = passwordResetEmail(resetUrl);
  await sendMail({ to: user.email, ...email });

  return { ok: true, resetToken: process.env.NODE_ENV === "production" ? undefined : rawToken };
}

export async function resetPassword(input: unknown) {
  const data = parseInput(resetPasswordSchema, input);
  const tokenHash = sha256(data.token);
  const token = await db.verificationToken.findFirst({
    where: { identifier: { startsWith: "password-reset:" }, token: tokenHash }
  });
  if (!token || token.expires < new Date()) throw new AppError("TOKEN_INVALID", "Invalid or expired reset token", 400);

  const email = token.identifier.replace("password-reset:", "");
  const passwordHash = await hashPassword(data.password);
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new AppError("TOKEN_INVALID", "Invalid or expired reset token", 400);

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, mustChangePassword: false }
    }),
    db.verificationToken.delete({ where: { identifier_token: { identifier: token.identifier, token: token.token } } }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.securityEvent.create({ data: { userId: user.id, type: "PASSWORD_CHANGED", severity: "info" } })
  ]);

  return { ok: true };
}
