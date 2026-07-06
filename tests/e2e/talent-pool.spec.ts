import { test, expect, type APIRequestContext } from "@playwright/test";
import { authFile } from "./global-setup";

async function firstCourseOfferingId(request: APIRequestContext) {
  const res = await request.get("/api/course-offerings/mine");
  expect(res.status()).toBe(200);
  const offerings = (await res.json()) as Array<{ id: string }>;
  expect(offerings.length).toBeGreaterThan(0);
  return offerings[0].id;
}

test.describe("professor", () => {
  test.use({ storageState: authFile("professor") });

  test("can search and filter the talent pool", async ({ browser, page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const marker = `talent-${Date.now()}`;

    const opportunityRes = await page.request.post("/api/ta-opportunities", {
      data: {
        courseOfferingId,
        title: `Talent pool opportunity ${marker}`,
        description: "Opportunity created for talent pool coverage.",
        requiredTAs: 1,
        needsHeadTA: false,
        requirements: "Testing talent pool filtering.",
        deadline: new Date(Date.now() + 86_400_000).toISOString()
      }
    });
    expect(opportunityRes.ok()).toBeTruthy();
    const opportunity = (await opportunityRes.json()) as { id: string };

    const studentContext = await browser.newContext({ storageState: authFile("student") });
    const studentPage = await studentContext.newPage();
    const applicationRes = await studentPage.request.post(`/api/ta-opportunities/${opportunity.id}/applications`, {
      data: {
        requestedRole: "TA",
        motivationText: `Strong TA candidate ${marker}`
      }
    });
    expect(applicationRes.ok()).toBeTruthy();
    const application = (await applicationRes.json()) as { id: string };
    await studentContext.close();

    const rejectRes = await page.request.patch(`/api/ta-applications/${application.id}/status`, {
      data: { status: "REJECTED", note: `Not selected ${marker}` }
    });
    if (!rejectRes.ok()) {
      throw new Error(`Rejecting application failed with ${rejectRes.status()}: ${await rejectRes.text()}`);
    }

    await page.goto("/talent-pool");
    await expect(page.getByRole("heading", { name: "بانک استعدادها" })).toBeVisible();
    await page.locator('input[name="q"]').fill(marker);
    await page.locator('select[name="status"]').selectOption("REJECTED");
    await page.locator('select[name="sort"]').selectOption("score");
    await page.getByRole("button", { name: "اعمال" }).click();

    const result = page.getByTestId(`talent-pool-item-${application.id}`);
    await expect(result).toBeVisible();
    await expect(result).toContainText(marker);
    await expect(result).toContainText("REJECTED");
    await expect(result.getByRole("link", { name: "جزئیات درخواست" })).toBeVisible();
  });
});

test.describe("student", () => {
  test.use({ storageState: authFile("student") });

  test("cannot access the talent pool", async ({ page }) => {
    await page.goto("/talent-pool");
    await expect(page.getByRole("heading", { name: "دسترسی محدود" })).toBeVisible();
  });
});
