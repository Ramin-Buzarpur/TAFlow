import { GlobalRole, PrismaClient, UserStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { sha256 } from "@/server/auth/crypto";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { requestPasswordReset, resetPassword } from "@/server/services/password-reset";
import { markEmailVerified, registerUser, resendVerificationEmail } from "@/server/services/users";

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-real-ip": "127.0.0.1", "user-agent": "vitest integration" })
}));

vi.mock("@/server/email/mailer", () => ({
  sendMail: vi.fn(async () => ({ messageId: "test-message" }))
}));

const prisma = new PrismaClient();
const runId = `auth-security-${Date.now()}-${randomUUID().slice(0, 8)}`;
const originalRequireEmailVerification = process.env.AUTH_REQUIRE_EMAIL_VERIFICATION;

function email(label: string) {
  return `${runId}-${label}@example.test`;
}

function strongPassword(label: string) {
  return `Strong@${label}123456`;
}

function studentNumber(label: string) {
  return `${runId.slice(0, 24)}-${label}`.slice(0, 40);
}

async function expectTokenInvalid(action: Promise<unknown>) {
  await expect(action).rejects.toMatchObject({ code: "TOKEN_INVALID" });
}

beforeAll(() => {
  process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = "true";
});

afterAll(async () => {
  process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = originalRequireEmailVerification;
  const users = await prisma.user.findMany({ where: { email: { contains: runId } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await prisma.verificationToken.deleteMany({ where: { identifier: { contains: runId } } });
  await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { contains: runId } } });
  await prisma.$disconnect();
});

describe("email verification", () => {
  it("creates hashed, expiring, single-use verification tokens before activating the account", async () => {
    const userEmail = email("verify");
    const result = await registerUser({
      name: "Verification Student",
      email: userEmail,
      password: strongPassword("Verify"),
      studentNumber: studentNumber("verify")
    });

    expect(result.verificationToken).toBeTruthy();
    expect(result.user.status).toBe(UserStatus.PENDING_EMAIL);

    const stored = await prisma.verificationToken.findFirstOrThrow({ where: { identifier: `email:${userEmail}` } });
    expect(stored.token).toBe(sha256(result.verificationToken!));
    expect(stored.token).not.toBe(result.verificationToken);
    expect(stored.expires.getTime()).toBeGreaterThan(Date.now());

    await expectTokenInvalid(markEmailVerified(userEmail, "not-a-real-token"));
    await markEmailVerified(userEmail, result.verificationToken!);

    const verified = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    expect(verified.status).toBe(UserStatus.ACTIVE);
    expect(verified.emailVerified).toBeInstanceOf(Date);
    await expect(prisma.verificationToken.findFirst({ where: { identifier: `email:${userEmail}` } })).resolves.toBeNull();
    await expectTokenInvalid(markEmailVerified(userEmail, result.verificationToken!));
  }, 30_000);

  it("rejects expired email verification tokens", async () => {
    const userEmail = email("expired-verify");
    const result = await registerUser({
      name: "Expired Verification Student",
      email: userEmail,
      password: strongPassword("ExpiredVerify"),
      studentNumber: studentNumber("expired-verify")
    });

    await prisma.verificationToken.update({
      where: { identifier_token: { identifier: `email:${userEmail}`, token: sha256(result.verificationToken!) } },
      data: { expires: new Date(Date.now() - 1000) }
    });

    await expectTokenInvalid(markEmailVerified(userEmail, result.verificationToken!));
    const pending = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    expect(pending.status).toBe(UserStatus.PENDING_EMAIL);
    expect(pending.emailVerified).toBeNull();
  }, 30_000);

  it("resends verification without leaking account existence and replaces the old token", async () => {
    const userEmail = email("resend");
    const first = await registerUser({
      name: "Resend Student",
      email: userEmail,
      password: strongPassword("Resend"),
      studentNumber: studentNumber("resend")
    });

    const second = await resendVerificationEmail({ email: userEmail });
    expect(second.ok).toBe(true);
    expect(second.verificationToken).toBeTruthy();
    expect(second.verificationToken).not.toBe(first.verificationToken);

    await expectTokenInvalid(markEmailVerified(userEmail, first.verificationToken!));
    await markEmailVerified(userEmail, second.verificationToken!);
    await expect(resendVerificationEmail({ email: email("missing") })).resolves.toMatchObject({ ok: true });
  }, 30_000);

  it("rate limits repeated resend requests per email", async () => {
    const userEmail = email("resend-limit");
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await expect(resendVerificationEmail({ email: userEmail })).resolves.toMatchObject({ ok: true });
    }
    await expect(resendVerificationEmail({ email: userEmail })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("password reset", () => {
  it("uses hashed, expiring, single-use reset tokens and invalidates stored sessions", async () => {
    const userEmail = email("reset");
    const oldPassword = strongPassword("OldReset");
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        name: "Reset Student",
        passwordHash: await hashPassword(oldPassword),
        passwordChangedAt: new Date(Date.now() - 60_000),
        globalRole: GlobalRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date(),
        failedLoginCount: 7,
        lockedUntil: new Date(Date.now() + 60_000)
      }
    });
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: `${runId}-session-token`,
        expires: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    const missing = await requestPasswordReset({ email: email("unknown-reset") });
    expect(missing).toEqual({ ok: true });

    const request = await requestPasswordReset({ email: userEmail });
    expect(request.resetToken).toBeTruthy();
    const stored = await prisma.verificationToken.findFirstOrThrow({ where: { identifier: `password-reset:${userEmail}` } });
    expect(stored.token).toBe(sha256(request.resetToken!));
    expect(stored.token).not.toBe(request.resetToken);

    await expectTokenInvalid(resetPassword({ token: "not-a-real-reset-token", password: strongPassword("BadReset") }));

    const newPassword = strongPassword("NewReset");
    await resetPassword({ token: request.resetToken!, password: newPassword });

    const updated = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    expect(await verifyPassword(updated.passwordHash!, oldPassword)).toBe(false);
    expect(await verifyPassword(updated.passwordHash!, newPassword)).toBe(true);
    expect(updated.failedLoginCount).toBe(0);
    expect(updated.lockedUntil).toBeNull();
    expect(updated.mustChangePassword).toBe(false);
    expect(updated.passwordChangedAt!.getTime()).toBeGreaterThan(user.passwordChangedAt!.getTime());
    await expect(prisma.session.count({ where: { userId: user.id } })).resolves.toBe(0);
    await expectTokenInvalid(resetPassword({ token: request.resetToken!, password: strongPassword("ReuseReset") }));
  }, 30_000);

  it("rejects expired reset tokens without changing the password", async () => {
    const userEmail = email("expired-reset");
    const oldPassword = strongPassword("ExpiredOld");
    await prisma.user.create({
      data: {
        email: userEmail,
        name: "Expired Reset Student",
        passwordHash: await hashPassword(oldPassword),
        globalRole: GlobalRole.STUDENT,
        status: UserStatus.ACTIVE,
        emailVerified: new Date()
      }
    });

    const request = await requestPasswordReset({ email: userEmail });
    await prisma.verificationToken.update({
      where: { identifier_token: { identifier: `password-reset:${userEmail}`, token: sha256(request.resetToken!) } },
      data: { expires: new Date(Date.now() - 1000) }
    });

    await expectTokenInvalid(resetPassword({ token: request.resetToken!, password: strongPassword("ExpiredNew") }));
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { email: userEmail } });
    expect(await verifyPassword(unchanged.passwordHash!, oldPassword)).toBe(true);
  }, 30_000);
});
