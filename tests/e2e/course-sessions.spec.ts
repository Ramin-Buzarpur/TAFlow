import { expect, test } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("course sessions", () => {
  test.use({ storageState: authFile("student") });

  test("course page links to course-scoped office hours", async ({ page }) => {
    const response = await page.request.get("/api/course-offerings/mine");
    expect(response.ok()).toBeTruthy();
    const offerings = await response.json() as Array<{ id: string; course: { title: string } }>;
    expect(offerings.length).toBeGreaterThan(0);

    const course = offerings[0];
    await page.goto(`/courses/${course.id}`);
    await page.getByRole("link", { name: "جلسات رفع اشکال" }).click();

    await expect(page).toHaveURL(new RegExp(`/courses/${course.id}/sessions$`));
    await expect(page.getByRole("heading", { name: course.course.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "جلسات آینده" })).toBeVisible();
  });
});
