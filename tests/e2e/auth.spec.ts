import { test, expect } from "@playwright/test";

const PASSWORD = "Admin@12345678";
const ACCOUNTS = [
  { email: "admin@example.edu", label: "مدیر" },
  { email: "rezai@example.edu", label: "استاد" },
  { email: "headta@example.edu", label: "Head TA" },
  { email: "student@example.edu", label: "دانشجو" }
];

for (const account of ACCOUNTS) {
  test(`login works for ${account.label} (${account.email})`, async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("ایمیل").fill(account.email);
    await page.getByPlaceholder("رمز عبور").fill(PASSWORD);
    await page.getByRole("button", { name: "ورود" }).click();
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "خلاصه‌ی روز شما در یک نگاه" })).toBeVisible();
  });
}

test("logout returns to an unauthenticated state", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByPlaceholder("ایمیل").fill("student@example.edu");
  await page.getByPlaceholder("رمز عبور").fill(PASSWORD);
  await page.getByRole("button", { name: "ورود" }).click();
  await page.waitForURL("**/dashboard");

  const csrf = await (await request.get("/api/auth/csrf")).json();
  await request.post("/api/auth/signout", { form: { csrfToken: csrf.csrfToken } });

  const session = await (await request.get("/api/auth/session")).json();
  expect(session).toBeFalsy();
});
