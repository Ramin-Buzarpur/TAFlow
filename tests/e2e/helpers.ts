import type { Page } from "@playwright/test";

export const PASSWORD = "Admin@12345678";

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("ایمیل").fill(email);
  await page.getByPlaceholder("رمز عبور").fill(PASSWORD);
  await page.getByRole("button", { name: "ورود" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}
