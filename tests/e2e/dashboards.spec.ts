import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

for (const role of ["student", "professor", "headta", "admin"] as const) {
  test.describe(role, () => {
    test.use({ storageState: authFile(role) });
    test("dashboard shows the general overview and course entry points", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "خلاصه‌ی روز شما در یک نگاه" })).toBeVisible();
      await expect(page.getByRole("main").getByRole("link", { name: "درس‌ها" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "ورودی مستقیم به هر درس" })).toBeVisible();
    });
  });
}
