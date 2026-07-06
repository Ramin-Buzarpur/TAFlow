import { expect, test } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("course files", () => {
  test.use({ storageState: authFile("student") });

  test("course page links to course-scoped files", async ({ page }) => {
    const response = await page.request.get("/api/course-offerings/mine");
    expect(response.ok()).toBeTruthy();
    const offerings = await response.json() as Array<{ id: string; course: { title: string } }>;
    expect(offerings.length).toBeGreaterThan(0);

    const course = offerings[0];
    await page.goto(`/courses/${course.id}`);
    await page.getByRole("link", { name: "فایل‌های درس" }).click();

    await expect(page).toHaveURL(new RegExp(`/courses/${course.id}/files$`));
    await expect(page.getByRole("heading", { name: course.course.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "منابع و فایل‌ها" })).toBeVisible();
  });
});
