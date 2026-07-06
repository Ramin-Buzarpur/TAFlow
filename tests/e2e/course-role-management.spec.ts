import { test, expect, type APIRequestContext } from "@playwright/test";
import { authFile } from "./global-setup";

async function firstCourseOfferingId(request: APIRequestContext) {
  const res = await request.get("/api/course-offerings/mine");
  expect(res.status()).toBe(200);
  const offerings = (await res.json()) as Array<{ id: string }>;
  expect(offerings.length).toBeGreaterThan(0);
  return offerings[0].id;
}

test.use({ storageState: authFile("professor") });

test("professor can manage course roles from the course panel", async ({ browser, page }) => {
  const courseOfferingId = await firstCourseOfferingId(page.request);
  const marker = `run-${Date.now()}`;

  const adminContext = await browser.newContext({ storageState: authFile("admin") });
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/");
  const student = await adminPage.evaluate(async () => {
    const res = await fetch("/api/admin/users?q=student@example.edu");
    if (!res.ok) throw new Error("Could not load users");
    const users = (await res.json()) as Array<{ id: string; name: string | null; email: string }>;
    const match = users.find((user) => user.email === "student@example.edu");
    if (!match) throw new Error("Student seed account not found");
    return match;
  });
  await adminContext.close();

  await page.goto(`/courses/${courseOfferingId}/roles`);
  await expect(page.getByRole("heading", { name: "مدیریت نقش‌های درس" })).toBeVisible();

  const assignForm = page.locator("form").filter({ has: page.getByRole("button", { name: "ثبت نقش" }) }).first();
  await assignForm.getByPlaceholder("شناسه کاربر").fill(student.id);
  await assignForm.getByRole("combobox").selectOption("TA");
  await assignForm.getByPlaceholder("یادداشت اختیاری").fill(`Temporary TA support ${marker}`);
  await assignForm.getByRole("button", { name: "ثبت نقش" }).click();

  const activeSection = page.getByTestId("active-role-assignments");
  const revokedSection = page.getByTestId("revoked-role-assignments");
  const activeRow = activeSection.locator("[data-assignment-id]").filter({ hasText: student.email }).filter({ hasText: marker }).first();
  await expect(activeRow).toContainText("TA");
  await expect(activeRow).toContainText(marker);

  await activeRow.getByPlaceholder("یادداشت نقش").fill(`Updated TA note ${marker}`);
  await activeRow.getByRole("button", { name: "ذخیره" }).click();
  await expect(activeRow).toContainText(`Updated TA note ${marker}`);

  await activeRow.getByPlaceholder("دلیل لغو اختیاری").fill(`Role no longer needed ${marker}`);
  await activeRow.getByRole("button", { name: "لغو نقش" }).click();

  await expect(activeSection.locator("[data-assignment-id]").filter({ hasText: student.email }).filter({ hasText: marker })).toHaveCount(0);
  await expect(revokedSection.locator("[data-assignment-id]").filter({ hasText: student.email }).filter({ hasText: marker })).toHaveCount(1);
});
