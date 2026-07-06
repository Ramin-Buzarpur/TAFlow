import { GlobalRole, PrismaClient, UserStatus } from "@prisma/client";
import { authenticator } from "otplib";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { hashPassword } from "@/server/auth/password";
import {
  consumeRecoveryCode,
  confirmRequiredTwoFactorSetup,
  createRequiredTwoFactorSetup,
  createTwoFactorSetup,
  disableTwoFactor,
  regenerateRecoveryCodes,
  verifyAndEnableTwoFactor
} from "@/server/services/two-factor";

const prisma = new PrismaClient();
const runId = `two-factor-${Date.now()}-${randomUUID().slice(0, 8)}`;
const password = "Strong@2FA123456";
const originalEnforceStaff2fa = process.env.AUTH_ENFORCE_2FA_FOR_STAFF;

function email(label: string) {
  return `${runId}-${label}@example.test`;
}

async function createUser(label: string, role: GlobalRole = GlobalRole.PROFESSOR) {
  return prisma.user.create({
    data: {
      email: email(label),
      name: `Two Factor ${label}`,
      passwordHash: await hashPassword(password),
      globalRole: role,
      status: UserStatus.ACTIVE,
      emailVerified: new Date()
    }
  });
}

afterAll(async () => {
  process.env.AUTH_ENFORCE_2FA_FOR_STAFF = originalEnforceStaff2fa;
  const users = await prisma.user.findMany({ where: { email: { contains: runId } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await prisma.verificationToken.deleteMany({ where: { identifier: { contains: "2fa-setup:" } } });
  await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.twoFactorMethod.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { contains: runId } } });
  await prisma.$disconnect();
});

describe("TOTP enrollment", () => {
  it("does not activate 2FA until a valid TOTP confirmation succeeds", async () => {
    const user = await createUser("activation");
    const setup = await createTwoFactorSetup(user.id);

    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ twoFactorEnabled: false });
    await expect(verifyAndEnableTwoFactor(user.id, setup.methodId, "000000")).rejects.toMatchObject({ code: "TWO_FACTOR_INVALID_CODE" });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ twoFactorEnabled: false });

    const result = await verifyAndEnableTwoFactor(user.id, setup.methodId, authenticator.generate(setup.secret));
    expect(result.ok).toBe(true);
    expect(result.recoveryCodes).toHaveLength(10);
    expect(result).not.toHaveProperty("secret");

    const enabled = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(enabled.twoFactorEnabled).toBe(true);
    expect(enabled.twoFactorChangedAt).toBeInstanceOf(Date);
  }, 30_000);

  it("supports mandatory staff enrollment without creating an unrestricted session", async () => {
    process.env.AUTH_ENFORCE_2FA_FOR_STAFF = "true";
    const user = await createUser("required");

    const setup = await createRequiredTwoFactorSetup({ email: user.email, password });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ twoFactorEnabled: false });

    await expect(confirmRequiredTwoFactorSetup({ methodId: setup.methodId, setupToken: setup.setupToken, code: "000000" }))
      .rejects.toMatchObject({ code: "TWO_FACTOR_INVALID_CODE" });
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ twoFactorEnabled: false });

    const result = await confirmRequiredTwoFactorSetup({
      methodId: setup.methodId,
      setupToken: setup.setupToken,
      code: authenticator.generate(setup.secret)
    });
    expect(result.ok).toBe(true);
    await expect(confirmRequiredTwoFactorSetup({
      methodId: setup.methodId,
      setupToken: setup.setupToken,
      code: authenticator.generate(setup.secret)
    })).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  }, 30_000);
});

describe("recovery codes", () => {
  async function enableUser(label: string) {
    const user = await createUser(label);
    const setup = await createTwoFactorSetup(user.id);
    const enabled = await verifyAndEnableTwoFactor(user.id, setup.methodId, authenticator.generate(setup.secret));
    return { user, recoveryCodes: enabled.recoveryCodes };
  }

  it("stores recovery codes only as hashes and consumes each code once", async () => {
    const { user, recoveryCodes } = await enableUser("codes");
    const stored = await prisma.twoFactorRecoveryCode.findMany({ where: { userId: user.id } });
    expect(stored).toHaveLength(10);
    expect(stored.map((row) => row.codeHash)).not.toContain(recoveryCodes[0]);

    await expect(consumeRecoveryCode(user.id, recoveryCodes[0])).resolves.toEqual({ ok: true });
    await expect(consumeRecoveryCode(user.id, recoveryCodes[0])).rejects.toMatchObject({ code: "RECOVERY_CODE_INVALID" });
  }, 30_000);

  it("regenerates recovery codes by replacing and invalidating the previous set", async () => {
    const { user, recoveryCodes } = await enableUser("regen");
    const regenerated = await regenerateRecoveryCodes(user.id);
    expect(regenerated.recoveryCodes).toHaveLength(10);
    expect(regenerated.recoveryCodes).not.toContain(recoveryCodes[0]);

    await expect(consumeRecoveryCode(user.id, recoveryCodes[1])).rejects.toMatchObject({ code: "RECOVERY_CODE_INVALID" });
    await expect(consumeRecoveryCode(user.id, regenerated.recoveryCodes[0])).resolves.toEqual({ ok: true });
  }, 30_000);

  it("does not allow the same recovery code to succeed twice under concurrent use", async () => {
    const { user, recoveryCodes } = await enableUser("race");
    const attempts = await Promise.allSettled([
      consumeRecoveryCode(user.id, recoveryCodes[0]),
      consumeRecoveryCode(user.id, recoveryCodes[0])
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
  }, 30_000);

  it("denies recovery-code use for suspended or deleted users", async () => {
    const { user, recoveryCodes } = await enableUser("status");
    await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.SUSPENDED } });
    await expect(consumeRecoveryCode(user.id, recoveryCodes[0])).rejects.toMatchObject({ code: "USER_NOT_ACTIVE" });

    await prisma.user.update({ where: { id: user.id }, data: { status: UserStatus.DELETED } });
    await expect(consumeRecoveryCode(user.id, recoveryCodes[1])).rejects.toMatchObject({ code: "USER_NOT_ACTIVE" });
  }, 30_000);

  it("disabling 2FA removes methods and recovery codes and invalidates stored sessions", async () => {
    const { user } = await enableUser("disable");
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: `${runId}-disable-session`,
        expires: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    await disableTwoFactor(user.id);
    await expect(prisma.twoFactorMethod.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.twoFactorRecoveryCode.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.session.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expect(prisma.user.findUniqueOrThrow({ where: { id: user.id } })).resolves.toMatchObject({ twoFactorEnabled: false });
  }, 30_000);
});
