import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("student", () => {
  test.use({ storageState: authFile("student") });
  test("announcements page shows seeded announcements", async ({ page }) => {
    await page.goto("/announcements");
    await expect(page.getByRole("heading", { name: "اطلاعیه‌ها و تقویم آموزشی" })).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });
  test("admin can create a department and it appears in the list", async ({ page }) => {
    await page.goto("/admin");
    const uniqueName = `دانشکده آزمایشی e2e ${Date.now()}`;
    const uniqueCode = `E2E${Date.now()}`;
    await page.fill('input[name="name"]', uniqueName);
    await page.fill('input[name="code"]', uniqueCode);
    await Promise.all([
      page.waitForNavigation({ timeout: 15_000 }),
      page.getByRole("button", { name: "افزودن" }).first().click()
    ]);
    await expect(page.getByRole("strong").filter({ hasText: uniqueName })).toBeVisible({ timeout: 10_000 });
  });
});
