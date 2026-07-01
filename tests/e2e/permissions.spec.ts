import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe("student restrictions", () => {
  test.use({ storageState: authFile("student") });

  test("student cannot access the admin panel API", async ({ page }) => {
    const res = await page.request.get("/api/admin/users");
    expect(res.status()).toBe(403);
  });

  test("student cannot approve or issue certificates for others", async ({ page }) => {
    const res = await page.request.post("/api/certificates/nonexistent-id/issue");
    expect([403, 404]).toContain(res.status());
  });
});

test("unauthenticated requests to protected APIs are rejected", async ({ request }) => {
  const res = await request.get("/api/dashboard");
  expect(res.status()).toBe(403);
});

test("visiting the admin panel while unauthenticated shows an access-denied state, not a crash", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText(/دسترسی غیرمجاز/)).toBeVisible();
});
