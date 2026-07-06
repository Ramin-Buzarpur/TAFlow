import { expect, test } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("course grading", () => {
  test.use({ storageState: authFile("headta") });

  test("course page links to the course-scoped gradebook route", async ({ page }) => {
    const response = await page.request.get("/api/course-offerings/mine");
    expect(response.ok()).toBeTruthy();
    const offerings = await response.json() as Array<{ id: string }>;
    expect(offerings.length).toBeGreaterThan(0);

    const courseOfferingId = offerings[0].id;
    await page.goto(`/courses/${courseOfferingId}`);
    await page.getByRole("link", { name: "دفتر نمرات" }).click();

    await expect(page).toHaveURL(new RegExp(`/courses/${courseOfferingId}/grading$`));
    await expect(page.getByRole("heading", { name: "دفتر نمرات" })).toBeVisible();
  });
});
