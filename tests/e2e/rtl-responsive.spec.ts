import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test("homepage is RTL and in Persian", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
});

test.describe("student", () => {
  test.use({ storageState: authFile("student"), viewport: { width: 390, height: 844 } });
  test("dashboard renders on mobile viewport without horizontal overflow", async ({ page }) => {
    await page.goto("/dashboard");
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(400);
  });
});

test.describe("student", () => {
  test.use({ storageState: authFile("student") });

  test("dark mode toggle switches the theme attribute and persists across reload", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
