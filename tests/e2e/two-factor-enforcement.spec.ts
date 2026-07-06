import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "otplib";
import { hashPassword } from "../../src/server/auth/password";

test.skip(process.env.AUTH_ENFORCE_2FA_FOR_STAFF !== "true", "staff 2FA enforcement is disabled");

const prisma = new PrismaClient();
const runId = `2fa-e2e-${Date.now()}`;
const password = "Admin@12345678";
const email = `${runId}@example.test`;

let professorId: string;
let secret: string;
let recoveryCode: string;

async function login(page: import("@playwright/test").Page, options: { totpCode?: string; recoveryCode?: string } = {}) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  if (options.totpCode) await page.locator('input[name="totpCode"]').fill(options.totpCode);
  if (options.recoveryCode) await page.locator('input[name="recoveryCode"]').fill(options.recoveryCode);
  await page.locator('form button[type="submit"], form button').first().click();
}

async function currentSession(page: import("@playwright/test").Page) {
  return (await page.request.get("/api/auth/session")).json();
}

async function expectNoSession(page: import("@playwright/test").Page) {
  await expect.poll(async () => currentSession(page), { timeout: 10_000 }).toBeFalsy();
}

async function expectSession(page: import("@playwright/test").Page) {
  await expect.poll(async () => Boolean(await currentSession(page)), { timeout: 10_000 }).toBe(true);
}

test.beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email,
      name: "2FA Enforcement Professor",
      passwordHash: await hashPassword(password),
      globalRole: "PROFESSOR",
      status: "ACTIVE",
      emailVerified: new Date()
    }
  });
  professorId = user.id;
});

test.afterAll(async () => {
  await prisma.securityEvent.deleteMany({ where: { userId: professorId } });
  await prisma.session.deleteMany({ where: { userId: professorId } });
  await prisma.twoFactorRecoveryCode.deleteMany({ where: { userId: professorId } });
  await prisma.twoFactorMethod.deleteMany({ where: { userId: professorId } });
  await prisma.user.deleteMany({ where: { id: professorId } });
  await prisma.$disconnect();
});

test("mandatory staff 2FA blocks unrestricted login until enrollment is completed", async ({ page, request, browser }) => {
  await login(page);
  await expectNoSession(page);

  const setupResponse = await request.post("/api/auth/2fa/required-setup", {
    data: { email, password, label: "E2E authenticator" }
  });
  expect(setupResponse.ok()).toBe(true);
  const setup = (await setupResponse.json()) as { methodId: string; setupToken: string; secret: string };
  secret = setup.secret;
  await expect(prisma.user.findUniqueOrThrow({ where: { id: professorId } })).resolves.toMatchObject({ twoFactorEnabled: false });

  const invalidConfirm = await request.post("/api/auth/2fa/required-setup", {
    data: { methodId: setup.methodId, setupToken: setup.setupToken, code: "000000" }
  });
  expect(invalidConfirm.status()).toBe(400);
  await expect(prisma.user.findUniqueOrThrow({ where: { id: professorId } })).resolves.toMatchObject({ twoFactorEnabled: false });

  const confirmResponse = await request.post("/api/auth/2fa/required-setup", {
    data: { methodId: setup.methodId, setupToken: setup.setupToken, code: authenticator.generate(secret) }
  });
  expect(confirmResponse.ok()).toBe(true);
  const confirm = (await confirmResponse.json()) as { recoveryCodes: string[] };
  expect(confirm.recoveryCodes).toHaveLength(10);
  recoveryCode = confirm.recoveryCodes[0];
  await expect(prisma.user.findUniqueOrThrow({ where: { id: professorId } })).resolves.toMatchObject({ twoFactorEnabled: true });

  const invalidTotpContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const invalidTotpPage = await invalidTotpContext.newPage();
  await login(invalidTotpPage, { totpCode: "000000" });
  await expectNoSession(invalidTotpPage);
  await invalidTotpContext.close();

  const validTotpContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const validTotpPage = await validTotpContext.newPage();
  await login(validTotpPage, { totpCode: authenticator.generate(secret) });
  await expectSession(validTotpPage);
  await validTotpContext.close();

  const recoveryContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const recoveryPage = await recoveryContext.newPage();
  await login(recoveryPage, { recoveryCode });
  await expectSession(recoveryPage);
  await recoveryContext.close();

  const reusedRecoveryContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const reusedRecoveryPage = await reusedRecoveryContext.newPage();
  await login(reusedRecoveryPage, { recoveryCode });
  await expectNoSession(reusedRecoveryPage);
  await reusedRecoveryContext.close();

  await prisma.user.update({ where: { id: professorId }, data: { status: "SUSPENDED" } });
  const suspendedContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const suspendedPage = await suspendedContext.newPage();
  await login(suspendedPage, { totpCode: authenticator.generate(secret) });
  await expectNoSession(suspendedPage);
  await suspendedContext.close();
});
