import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });

  test("reports page shows summary metrics and export works", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('a[href="/api/reports/export"]')).toBeVisible();
    await expect(page.locator("h2").first()).toBeVisible();

    const exportRes = await page.request.get("/api/reports/export");
    expect(exportRes.ok()).toBeTruthy();
    expect(exportRes.headers()["content-type"]).toContain("text/csv");
    const csv = await exportRes.text();
    expect(csv).toContain('"course","semester","activeTaAssignments"');
  });
});

test.describe("student", () => {
  test.use({ storageState: authFile("student") });

  test("cannot access reports", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/reports/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator('a[href="/api/reports/export"]')).toHaveCount(0);
  });
});
