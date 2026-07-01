import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test("professor creates an opportunity, student applies, professor accepts", async ({ browser }) => {
  const professorContext = await browser.newContext({ storageState: authFile("professor") });
  const professorPage = await professorContext.newPage();

  const offerings = await professorPage.request.get("/api/course-offerings/mine").then((r) => r.json());
  expect(offerings.length).toBeGreaterThan(0);
  const courseOfferingId = offerings[0].id;

  const created = await professorPage.request.post("/api/ta-opportunities", {
    data: {
      courseOfferingId,
      title: "فرصت آزمایشی e2e",
      description: "توضیح فرصت آزمایشی برای تست e2e",
      requirements: "بدون شرط خاص",
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  });
  expect(created.ok()).toBeTruthy();
  const opportunity = await created.json();

  const studentContext = await browser.newContext({ storageState: authFile("student") });
  const studentPage = await studentContext.newPage();
  await studentPage.goto(`/opportunities/${opportunity.id}`);
  await studentPage.getByPlaceholder("انگیزه و سابقه مرتبط خود را بنویسید...").fill("علاقه‌مند به همکاری هستم و سابقه تدریس دارم.");
  await studentPage.getByRole("button", { name: "ثبت درخواست" }).click();
  await expect(studentPage.getByText("درخواست با موفقیت ثبت شد.")).toBeVisible({ timeout: 10_000 });
  await studentContext.close();

  await professorPage.goto(`/opportunities/${opportunity.id}/applicants`);
  await expect(professorPage.getByText("سارا احمدی")).toBeVisible({ timeout: 15_000 });
  await professorPage.getByRole("button", { name: "قبول", exact: true }).first().click();
  await professorPage.waitForURL(`**/opportunities/${opportunity.id}/applicants`, { timeout: 10_000 });
  await expect(professorPage.getByText("ACCEPTED")).toBeVisible({ timeout: 10_000 });

  await professorContext.close();
});
