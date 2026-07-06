import { expect, test, type APIRequestContext } from "@playwright/test";
import { authFile } from "./global-setup";

async function firstCourseOfferingId(request: APIRequestContext) {
  const res = await request.get("/api/course-offerings/mine");
  expect(res.status()).toBe(200);
  const offerings = (await res.json()) as Array<{ id: string }>;
  expect(offerings.length).toBeGreaterThan(0);
  return offerings[0].id;
}

test.describe("survey results", () => {
  test.use({ storageState: authFile("professor") });

  test("hide results until threshold and then show summaries and export", async ({ browser, page }) => {
    const courseOfferingId = await firstCourseOfferingId(page.request);
    const marker = `survey-${Date.now()}`;

    const surveyRes = await page.request.post("/api/surveys", {
      data: {
        courseOfferingId,
        title: `TA survey ${marker}`,
        description: "Survey results coverage.",
        type: "TA_FINAL",
        isAnonymous: true,
        minResponses: 3,
        opensAt: new Date(Date.now() - 60_000).toISOString(),
        closesAt: new Date(Date.now() + 86_400_000).toISOString(),
        questions: [
          { text: `Quality ${marker}`, type: "RATING", required: true },
          { text: `Comment ${marker}`, type: "TEXT", required: true }
        ]
      }
    });
    if (!surveyRes.ok()) {
      throw new Error(`Survey creation failed with ${surveyRes.status()}: ${await surveyRes.text()}`);
    }
    const survey = (await surveyRes.json()) as { id: string; questions: Array<{ id: string; text: string }> };
    const ratingQuestion = survey.questions.find((question) => question.text.startsWith("Quality"));
    const textQuestion = survey.questions.find((question) => question.text.startsWith("Comment"));
    expect(ratingQuestion).toBeTruthy();
    expect(textQuestion).toBeTruthy();

    const studentContext = await browser.newContext({ storageState: authFile("student") });
    const studentPage = await studentContext.newPage();
    const firstAnswer = await studentPage.request.post(`/api/surveys/${survey.id}/answer`, {
      data: {
        answers: [
          { questionId: ratingQuestion!.id, valueJson: { rating: 5 } },
          { questionId: textQuestion!.id, valueJson: { text: `First response ${marker}` } }
        ]
      }
    });
    expect(firstAnswer.ok()).toBeTruthy();
    await studentContext.close();

    const hiddenResults = await page.request.get(`/api/surveys/${survey.id}/results`);
    expect(hiddenResults.ok()).toBeTruthy();
    const hiddenJson = (await hiddenResults.json()) as { hidden: boolean; responseCount: number; minResponses: number };
    expect(hiddenJson.hidden).toBe(true);
    expect(hiddenJson.responseCount).toBe(1);
    expect(hiddenJson.minResponses).toBe(3);

    const secondAnswer = await page.request.post(`/api/surveys/${survey.id}/answer`, {
      data: {
        answers: [
          { questionId: ratingQuestion!.id, valueJson: { rating: 4 } },
          { questionId: textQuestion!.id, valueJson: { text: `Second response ${marker}` } }
        ]
      }
    });
    expect(secondAnswer.ok()).toBeTruthy();

    const adminContext = await browser.newContext({ storageState: authFile("admin") });
    const adminPage = await adminContext.newPage();
    const thirdAnswer = await adminPage.request.post(`/api/surveys/${survey.id}/answer`, {
      data: {
        answers: [
          { questionId: ratingQuestion!.id, valueJson: { rating: 3 } },
          { questionId: textQuestion!.id, valueJson: { text: `Third response ${marker}` } }
        ]
      }
    });
    expect(thirdAnswer.ok()).toBeTruthy();
    await adminContext.close();

    const visibleResults = await page.request.get(`/api/surveys/${survey.id}/results`);
    expect(visibleResults.ok()).toBeTruthy();
    const visibleJson = (await visibleResults.json()) as {
      hidden: boolean;
      responseCount: number;
      survey: {
        id: string;
        title: string;
        questions: Array<{ id: string; text: string; type: string; responseCount: number; ratingAverage: number | null; textResponseCount: number }>;
      };
    };
    expect(visibleJson.hidden).toBe(false);
    expect(visibleJson.responseCount).toBe(3);
    expect(visibleJson.survey.questions[0].ratingAverage).toBe(4);
    expect(visibleJson.survey.questions[1].textResponseCount).toBe(3);

    const exportRes = await page.request.get(`/api/surveys/${survey.id}/export`);
    expect(exportRes.ok()).toBeTruthy();
    expect(exportRes.headers()["content-type"]).toContain("text/csv");
    const csv = await exportRes.text();
    expect(csv).toContain(`TA survey ${marker}`);
    expect(csv).toContain(`Quality ${marker}`);
    expect(csv).toContain(`Comment ${marker}`);

    await page.goto("/surveys");
    const resultsForm = page.locator("form").filter({ has: page.locator('input[name="surveyId"]') }).last();
    await resultsForm.locator('input[name="surveyId"]').fill(survey.id);
    await resultsForm.locator('button[type="submit"]').click();

    await expect(page.getByText(`TA survey ${marker}`)).toBeVisible();
    await expect(page.getByText(`Quality ${marker}`)).toBeVisible();
    await expect(page.getByText("میانگین: 4.00")).toBeVisible();
    await expect(page.getByRole("link", { name: "خروجی CSV" })).toBeVisible();
  });
});
