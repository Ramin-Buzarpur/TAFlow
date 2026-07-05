import { test, expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { authFile } from "./global-setup";

async function firstCourseOfferingId(request: APIRequestContext) {
  const res = await request.get("/api/course-offerings/mine");
  expect(res.status()).toBe(200);
  const offerings = (await res.json()) as Array<{ id: string }>;
  expect(offerings.length).toBeGreaterThan(0);
  return offerings[0].id;
}

async function currentUserId(request: APIRequestContext) {
  const res = await request.get("/api/account/profile");
  expect(res.status()).toBe(200);
  const profile = (await res.json()) as { id: string };
  expect(profile.id).toBeTruthy();
  return profile.id;
}

async function expectPermissionDenied(response: APIResponse) {
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error).toBe("PERMISSION_DENIED");
}

test.describe("student restrictions", () => {
  test.use({ storageState: authFile("student") });

  test("student cannot access the admin panel API", async ({ page }) => {
    const res = await page.request.get("/api/admin/users");
    await expectPermissionDenied(res);
  });

  test("student cannot self-assign course roles", async ({ page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const userId = await currentUserId(page.request);

    const res = await page.request.post(`/api/course-offerings/${courseOfferingId}/roles`, {
      data: {
        userId,
        role: "TA",
        assignmentSource: "e2e-permission-test"
      }
    });

    await expectPermissionDenied(res);
  });

  test("student cannot manage gradebook categories", async ({ page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const res = await page.request.post("/api/gradebook/categories", {
      data: {
        courseOfferingId,
        name: `Blocked category ${Date.now()}`,
        weight: 5,
        maxScore: 10
      }
    });

    await expectPermissionDenied(res);
  });

  test("student cannot create TA opportunities", async ({ page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const res = await page.request.post("/api/ta-opportunities", {
      data: {
        courseOfferingId,
        title: `Blocked opportunity ${Date.now()}`,
        description: "Students must not be able to create hiring opportunities.",
        requiredTAs: 1,
        needsHeadTA: false,
        requirements: "Permission denied regression test.",
        deadline: "2099-01-01T00:00:00.000Z"
      }
    });

    await expectPermissionDenied(res);
  });

  test("student cannot export the course roster", async ({ page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const res = await page.request.get(`/api/exports/roster/${courseOfferingId}`);
    await expectPermissionDenied(res);
  });
});

test.describe("head TA restrictions", () => {
  test.use({ storageState: authFile("headta") });

  test("head TA cannot assign course roles", async ({ page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const userId = await currentUserId(page.request);

    const res = await page.request.post(`/api/course-offerings/${courseOfferingId}/roles`, {
      data: {
        userId,
        role: "TA",
        assignmentSource: "e2e-permission-test"
      }
    });

    await expectPermissionDenied(res);
  });
});

test("unauthenticated requests to protected APIs are rejected", async ({ request }) => {
  const res = await request.get("/api/dashboard");
  await expectPermissionDenied(res);
});

test("visiting the admin panel while unauthenticated shows an access-denied state, not a crash", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByText(/دسترسی غیرمجاز/)).toBeVisible();
});
