import { test, expect } from "@playwright/test";
import { authFile } from "./global-setup";

test.use({ storageState: authFile("headta") });

test("head TA has elevated access to gradebook and roster export for their course only", async ({ page }) => {
  const offerings = await page.request.get("/api/course-offerings/mine").then((r) => r.json());
  expect(offerings.length).toBeGreaterThan(0);
  const courseOfferingId = offerings[0].id;

  const gradebook = await page.request.get(`/api/gradebook/${courseOfferingId}`);
  expect(gradebook.ok()).toBeTruthy();

  const roster = await page.request.get(`/api/exports/roster/${courseOfferingId}`);
  expect(roster.ok()).toBeTruthy();
});
