import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("student", () => {
  test.use({ storageState: authFile("student") });
  test("dashboard shows role-appropriate sections only", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "داشبورد نقش‌محور" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "داشبورد ادمین" })).not.toBeVisible();
  });
});

test.describe("professor", () => {
  test.use({ storageState: authFile("professor") });
  test("dashboard shows the professor section", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "داشبورد استاد" })).toBeVisible();
  });
});

test.describe("head TA", () => {
  test.use({ storageState: authFile("headta") });
  test("dashboard shows the head TA section", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "داشبورد Head TA" })).toBeVisible();
  });
});

test.describe("admin", () => {
  test.use({ storageState: authFile("admin") });
  test("dashboard shows the admin section and management links", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "داشبورد ادمین" })).toBeVisible();
    await expect(page.getByRole("link", { name: "پنل مدیریت" })).toBeVisible();
    await expect(page.getByRole("link", { name: "گزارش‌ها و نمودارها" })).toBeVisible();
  });
});
