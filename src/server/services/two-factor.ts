import "server-only";
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { sha256 } from "@/server/auth/crypto";
import { verifyPassword } from "@/server/auth/password";
import { buildTotpUri, encryptTotpSecret, generateTotpSecret, verifyTotpCode } from "@/server/auth/totp";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";
import { staffRoleRequiresTwoFactor } from "@/server/auth/two-factor-policy";

const RECOVERY_CODE_COUNT = 10;

function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function hashRecoveryCode(userId: string, code: string) {
  return sha256(`${userId}:${normalizeRecoveryCode(code)}`);
}

function newRecoveryCode() {
  return randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12).replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

function newSetupToken() {
  return randomBytes(32).toString("base64url");
}

async function replaceRecoveryCodes(userId: string, tx: Prisma.TransactionClient = db) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => newRecoveryCode());
  await tx.twoFactorRecoveryCode.deleteMany({ where: { userId } });
  await tx.twoFactorRecoveryCode.createMany({
    data: codes.map((code) => ({ userId, codeHash: hashRecoveryCode(userId, code) }))
  });
  return codes;
}

async function assertActiveUser(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw new AppError("USER_NOT_ACTIVE", "User account is not active", 403);
  return user;
}

export async function createTwoFactorSetup(userId: string, label = "Authenticator app") {
  const limiter = await checkRateLimit(makeRateLimitKey("2fa-setup", userId), 5, 15 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many 2FA setup attempts", 429);
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

export async function createRequiredTwoFactorSetup(input: { email: string; password: string; label?: string }) {
  const limiter = await checkRateLimit(makeRateLimitKey("2fa-required-setup", input.email), 5, 15 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many 2FA setup attempts", 429);

  const user = await db.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      status: true,
      globalRole: true,
      twoFactorEnabled: true,
      twoFactorRequired: true
    }
  });
  if (!user || !user.passwordHash || user.status !== "ACTIVE") throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
  if (!(await verifyPassword(user.passwordHash, input.password))) throw new AppError("INVALID_CREDENTIALS", "Invalid credentials", 401);
  if (user.twoFactorEnabled) throw new AppError("TWO_FACTOR_ALREADY_ENABLED", "2FA is already enabled", 409);
  if (!user.twoFactorRequired && !staffRoleRequiresTwoFactor(user.globalRole)) {
    throw new AppError("TWO_FACTOR_NOT_REQUIRED", "2FA enrollment is not required for this account", 400);
  }

  await db.twoFactorMethod.deleteMany({ where: { userId: user.id, lastUsedAt: null } });
  const secret = generateTotpSecret();
  const setupToken = newSetupToken();
  const method = await db.$transaction(async (tx) => {
    const created = await tx.twoFactorMethod.create({
      data: {
        userId: user.id,
        label: input.label ?? "Authenticator app",
        encryptedSecret: encryptTotpSecret(secret)
      },
      select: { id: true }
    });
    await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: `2fa-setup:${user.id}:` } } });
    await tx.verificationToken.create({
      data: {
        identifier: `2fa-setup:${user.id}:${created.id}`,
        token: sha256(setupToken),
        expires: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
    return created;
  });

  return {
    methodId: method.id,
    setupToken,
    secret,
    otpauthUrl: buildTotpUri(user.email, secret)
  };
}

export async function confirmRequiredTwoFactorSetup(input: { methodId: string; setupToken: string; code: string }) {
  const tokenHash = sha256(input.setupToken);
  const setupToken = await db.verificationToken.findFirst({
    where: { identifier: { startsWith: `2fa-setup:` }, token: tokenHash }
  });
  if (!setupToken || setupToken.expires < new Date()) throw new AppError("TOKEN_INVALID", "Invalid or expired 2FA setup token", 400);

  const [, userId, methodId] = setupToken.identifier.split(":");
  if (!userId || !methodId || methodId !== input.methodId) throw new AppError("TOKEN_INVALID", "Invalid or expired 2FA setup token", 400);

  const result = await verifyAndEnableTwoFactor(userId, methodId, input.code);
  await db.verificationToken.delete({ where: { identifier_token: { identifier: setupToken.identifier, token: setupToken.token } } });
  return result;
}

export async function verifyAndEnableTwoFactor(userId: string, methodId: string, code: string) {
  await assertActiveUser(userId);
  const method = await db.twoFactorMethod.findFirst({ where: { id: methodId, userId } });
  if (!method) throw new AppError("TWO_FACTOR_METHOD_NOT_FOUND", "2FA method was not found", 404);
  if (!/^\d{6}$/.test(code)) throw new AppError("TWO_FACTOR_INVALID_CODE", "Invalid 2FA code", 400);

  const ok = verifyTotpCode(method.encryptedSecret, code);
  if (!ok) throw new AppError("TWO_FACTOR_INVALID_CODE", "Invalid 2FA code", 400);

  const now = new Date();
  const recoveryCodes = await db.$transaction(async (tx) => {
    await tx.twoFactorMethod.deleteMany({ where: { userId, id: { not: method.id } } });
    await tx.twoFactorMethod.update({ where: { id: method.id }, data: { lastUsedAt: now } });
    await tx.user.update({ where: { id: userId }, data: { twoFactorEnabled: true, twoFactorChangedAt: now } });
    const codes = await replaceRecoveryCodes(userId, tx);
    await tx.securityEvent.create({ data: { userId, type: "TWO_FACTOR_ENABLED", severity: "info" } });
    await tx.securityEvent.create({ data: { userId, type: "RECOVERY_CODES_GENERATED", severity: "info" } });
    await tx.session.deleteMany({ where: { userId } });
    return codes;
  });

  return { ok: true, recoveryCodes };
}

export async function consumeRecoveryCode(userId: string, code: string) {
  const limiter = await checkRateLimit(makeRateLimitKey("2fa-recovery-verify", userId), 8, 15 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many recovery code attempts", 429);

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, status: true, twoFactorEnabled: true } });
  if (!user || user.status !== "ACTIVE") throw new AppError("USER_NOT_ACTIVE", "User account is not active", 403);
  if (!user.twoFactorEnabled) throw new AppError("TWO_FACTOR_NOT_ENABLED", "2FA is not enabled", 400);

  const result = await db.twoFactorRecoveryCode.updateMany({
    where: { userId, codeHash: hashRecoveryCode(userId, code), usedAt: null },
    data: { usedAt: new Date() }
  });
  if (result.count !== 1) throw new AppError("RECOVERY_CODE_INVALID", "Invalid recovery code", 400);

  await db.securityEvent.create({ data: { userId, type: "RECOVERY_CODE_USED", severity: "info" } });
  return { ok: true };
}

export async function regenerateRecoveryCodes(userId: string) {
  await assertActiveUser(userId);
  const limiter = await checkRateLimit(makeRateLimitKey("2fa-recovery-regenerate", userId), 4, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many recovery code regeneration attempts", 429);

  const user = await db.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
  if (!user?.twoFactorEnabled) throw new AppError("TWO_FACTOR_NOT_ENABLED", "2FA is not enabled", 400);

  const now = new Date();
  const recoveryCodes = await db.$transaction(async (tx) => {
    const codes = await replaceRecoveryCodes(userId, tx);
    await tx.user.update({ where: { id: userId }, data: { twoFactorChangedAt: now } });
    await tx.securityEvent.create({ data: { userId, type: "RECOVERY_CODES_GENERATED", severity: "info" } });
    await tx.session.deleteMany({ where: { userId } });
    return codes;
  });
  return { ok: true, recoveryCodes };
}

export async function disableTwoFactor(userId: string) {
  await assertActiveUser(userId);
  const limiter = await checkRateLimit(makeRateLimitKey("2fa-disable", userId), 4, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many 2FA disable attempts", 429);

  const now = new Date();
  await db.$transaction([
    db.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
    db.twoFactorMethod.deleteMany({ where: { userId } }),
    db.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorChangedAt: now } }),
    db.securityEvent.create({ data: { userId, type: "TWO_FACTOR_DISABLED", severity: "info" } }),
    db.session.deleteMany({ where: { userId } })
  ]);
  return { ok: true };
}
