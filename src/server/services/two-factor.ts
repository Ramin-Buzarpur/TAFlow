import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { buildTotpUri, encryptTotpSecret, generateTotpSecret, verifyTotpCode } from "@/server/auth/totp";

export async function createTwoFactorSetup(userId: string, label = "Authenticator app") {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw new AppError("USER_NOT_ACTIVE", "User account is not active", 403);

  await db.twoFactorMethod.deleteMany({ where: { userId, lastUsedAt: null } });
  const secret = generateTotpSecret();
  const method = await db.twoFactorMethod.create({
    data: {
      userId,
      label,
      encryptedSecret: encryptTotpSecret(secret)
    },
    select: { id: true }
  });

  return {
    methodId: method.id,
    secret,
    otpauthUrl: buildTotpUri(user.email, secret)
  };
}

export async function verifyAndEnableTwoFactor(userId: string, methodId: string, code: string) {
  const method = await db.twoFactorMethod.findFirst({ where: { id: methodId, userId } });
  if (!method) throw new AppError("TWO_FACTOR_METHOD_NOT_FOUND", "2FA method was not found", 404);
  if (!/^\d{6}$/.test(code)) throw new AppError("TWO_FACTOR_INVALID_CODE", "Invalid 2FA code", 400);

  const ok = verifyTotpCode(method.encryptedSecret, code);
  if (!ok) throw new AppError("TWO_FACTOR_INVALID_CODE", "Invalid 2FA code", 400);

  await db.$transaction([
    db.twoFactorMethod.update({ where: { id: method.id }, data: { lastUsedAt: new Date() } }),
    db.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } }),
    db.securityEvent.create({ data: { userId, type: "TWO_FACTOR_ENABLED", severity: "info" } })
  ]);

  return { ok: true };
}

export async function disableTwoFactor(userId: string) {
  await db.$transaction([
    db.twoFactorMethod.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { twoFactorEnabled: false } })
  ]);
  return { ok: true };
}
