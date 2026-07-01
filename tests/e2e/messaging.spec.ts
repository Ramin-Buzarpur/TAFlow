import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test("student can create a message thread and professor can reply", async ({ browser }) => {
  const adminContext = await browser.newContext({ storageState: authFile("admin") });
  const adminPage = await adminContext.newPage();
  const users = await adminPage.request.get("/api/admin/users?q=rezai").then((r) => r.json());
  const professor = users.find((u: { email: string }) => u.email === "rezai@example.edu");
  expect(professor).toBeTruthy();
  await adminContext.close();

  const subject = `سوال درباره تمرین سری ۲ - ${Date.now()}`;
  const studentContext = await browser.newContext({ storageState: authFile("student") });
  const studentPage = await studentContext.newPage();
  await studentPage.goto("/messages");
  await studentPage.getByPlaceholder("شناسه کاربران گیرنده، با کاما جدا شود").fill(professor.id);
  await studentPage.getByPlaceholder("موضوع").fill(subject);
  await studentPage.getByPlaceholder("متن پیام").fill("سلام، در مورد سوال سوم تمرین راهنمایی می‌خواستم.");
  await studentPage.getByRole("button", { name: "ارسال" }).click();
  await expect(studentPage.getByText("پیام ساخته شد.")).toBeVisible({ timeout: 10_000 });
  await studentContext.close();

  const professorContext = await browser.newContext({ storageState: authFile("professor") });
  const professorPage = await professorContext.newPage();
  await professorPage.goto("/messages");
  await professorPage.getByText(subject).click();
  await professorPage.waitForURL("**/messages/**");
  await expect(professorPage.getByText("سلام، در مورد سوال سوم تمرین راهنمایی می‌خواستم.")).toBeVisible();
  await professorContext.close();
});
