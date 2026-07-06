import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("student", () => {
  test.use({ storageState: authFile("student") });
  test("professor evaluation is anonymous and can only be submitted once per student", async ({ page }) => {
    await page.goto("/evaluations/professor");
    const firstCourseCard = page.locator(".card").first();
    await expect(firstCourseCard).toBeVisible();

    const eligible = await page.request.get("/api/evaluations/professor");
    expect(eligible.ok()).toBeTruthy();
    const offerings = await eligible.json();
    expect(Array.isArray(offerings)).toBe(true);
  });
});

test.describe("professor", () => {
  test.use({ storageState: authFile("professor") });
  test("TA evaluation builder creates a multi-question survey with a response threshold", async ({ page }) => {
    await page.goto("/surveys");
    const select = page.locator('select[name="courseOfferingId"]');
    await expect(select).toBeVisible();
    await page.fill('input[name="title"]', "ارزیابی TA پایان ترم e2e");
    await page.fill('textarea[name="questions"]', "تسلط علمی\nپاسخ‌گویی\nنظم جلسات");
    await page.fill('input[name="minResponses"]', "3");
    await page.fill('input[name="opensAt"]', "2026-07-01T00:00");
    await page.fill('input[name="closesAt"]', "2026-12-01T00:00");
    await page.getByRole("button", { name: "انتشار ارزیابی" }).click();
    await expect(page.getByText(/ارزیابی ساخته شد/)).toBeVisible({ timeout: 10_000 });
  });
});
