import { expect, test } from "@playwright/test";
import { PrismaClient, GlobalRole, UserStatus } from "@prisma/client";
import { authenticator } from "otplib";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { hashPassword } from "../../src/server/auth/password";

test.setTimeout(120_000);

const prisma = new PrismaClient();
const runId = `auth-ux-${Date.now()}-${randomUUID().slice(0, 8)}`;

function email(label: string) {
  return `${runId}-${label}@example.test`;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createActiveUser(label: string, options: { role?: GlobalRole; twoFactorRequired?: boolean } = {}) {
  return prisma.user.create({
    data: {
      email: email(label),
      name: `Auth UX ${label}`,
      passwordHash: await hashPassword("Admin@12345678"),
      globalRole: options.role ?? GlobalRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: new Date(),
      twoFactorRequired: options.twoFactorRequired ?? false
    }
  });
}

test.afterAll(async () => {
  const users = await prisma.user.findMany({ where: { email: { contains: runId } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  await prisma.verificationToken.deleteMany({ where: { identifier: { contains: runId } } });
  await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.twoFactorMethod.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { email: { contains: runId } } });
  await prisma.$disconnect();
});

test("forgot password, reset password, and login flow stay usable", async ({ page, request }) => {
  test.setTimeout(120_000);
  const user = await createActiveUser(`reset-${randomUUID().slice(0, 8)}`);
  const newPassword = "NewAdmin@12345678";

  await page.goto("/forgot-password");
  await page.getByLabel("ایمیل").fill(user.email);
  const forgotResponse = page.waitForResponse(
    (resp) => resp.url().includes("/api/auth/forgot-password") && resp.request().method() === "POST"
  );
  await page.getByRole("button", { name: /ارسال لینک بازیابی/ }).click();
  const forgot = await forgotResponse;
  expect(forgot.ok()).toBe(true);
  await expect(page.locator("body")).toContainText("لینک بازیابی ارسال می‌شود", { timeout: 120_000 });

  const resetResponse = await request.post("/api/auth/forgot-password", {
    data: { email: user.email }
  });
  expect(resetResponse.ok()).toBe(true);
  const reset = (await resetResponse.json()) as { resetToken: string };
  expect(reset.resetToken).toBeTruthy();

  await page.goto(`/reset-password?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(reset.resetToken)}&returnTo=%2Fdashboard`);
  await page.getByLabel("رمز عبور جدید").fill(newPassword);
  await page.getByLabel("تکرار رمز عبور").fill(newPassword);
  await page.getByRole("button", { name: "تغییر رمز عبور" }).click();
  await expect(page.getByText("رمز عبور با موفقیت تغییر کرد")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("ایمیل").fill(user.email);
  await page.getByLabel("رمز عبور").fill(newPassword);
  await page.getByRole("button", { name: "ورود" }).click();
  await page.waitForURL("**/dashboard");
});

test("verify email page auto-verifies and keeps redirects internal", async ({ page }) => {
  const user = await prisma.user.create({
    data: {
      email: email("verify"),
      name: "Auth UX verify",
      passwordHash: await hashPassword("Admin@12345678"),
      globalRole: GlobalRole.STUDENT,
      status: UserStatus.PENDING_EMAIL,
      emailVerified: null
    }
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.verificationToken.create({
    data: {
      identifier: `email:${user.email}`,
      token: sha256(token),
      expires: new Date(Date.now() + 60 * 60 * 1000)
    }
  });

  await page.goto(`/verify-email?email=${encodeURIComponent(user.email)}&token=${encodeURIComponent(token)}&returnTo=%2Fdashboard`);
  await expect(page.locator("body")).toContainText("ایمیل شما با موفقیت تایید شد");
  await expect(page.locator('a[href="/login?returnTo=%2Fdashboard"]')).toBeVisible();
});

test("public 2FA enrollment page renders", async ({ page }) => {
  await createActiveUser(`twofactor-${randomUUID().slice(0, 8)}`, { twoFactorRequired: true });
  await page.goto("/auth/2fa");
  await expect(page.getByRole("heading", { name: "فعال‌سازی 2FA کارکنان" })).toBeVisible();
  await expect(page.getByLabel("ایمیل دانشگاهی")).toBeVisible();
  await expect(page.getByLabel("رمز عبور")).toBeVisible();
  await expect(page.getByRole("button", { name: "شروع فعال‌سازی" })).toBeVisible();
});
