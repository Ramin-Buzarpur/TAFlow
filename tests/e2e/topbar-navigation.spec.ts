import { expect, test } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("topbar navigation", () => {
  test.use({ storageState: authFile("student") });

  test("shows opportunity shortcuts on hover and opens my applications", async ({ page }) => {
    await page.goto("/dashboard");

    const topbar = page.locator(".topbar__nav");
    await topbar.getByRole("link", { name: "فرصت‌ها" }).hover();

    await expect(topbar.getByRole("link", { name: "همه فرصت‌ها" })).toBeVisible();
    await expect(topbar.getByRole("link", { name: "درخواست‌های من" })).toBeVisible();
    await expect(topbar.getByRole("link", { name: "ایجاد فرصت" })).toHaveCount(0);

    await topbar.getByRole("link", { name: "درخواست‌های من" }).click();
    await expect(page).toHaveURL(/\/opportunities\/applications/);
    await expect(page.getByRole("heading", { name: "درخواست‌های من" })).toBeVisible();
  });
});
