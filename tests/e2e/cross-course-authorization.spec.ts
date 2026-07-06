import { test, expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import { authFile } from "./global-setup";

test.describe.configure({ mode: "serial" });

type ApiContextFactory = {
  request: {
    newContext(options: { baseURL: string; storageState: string }): Promise<APIRequestContext>;
  };
};

let authorizedCourseOfferingId: string;
let isolatedCourseOfferingId: string;
let isolatedCourseMaterialFileId: string;
let professorId: string;
let headTaId: string;

async function expectPermissionDenied(response: APIResponse) {
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error).toBe("PERMISSION_DENIED");
}

async function expectOk(response: APIResponse) {
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
}

async function firstCourseOfferingId(request: APIRequestContext) {
  const response = await request.get("/api/course-offerings/mine");
  await expectOk(response);
  const offerings = (await response.json()) as Array<{ id: string }>;
  expect(offerings.length).toBeGreaterThan(0);
  return offerings[0].id;
}

async function currentUserId(request: APIRequestContext) {
  const response = await request.get("/api/account/profile");
  await expectOk(response);
  const profile = (await response.json()) as { id: string };
  expect(profile.id).toBeTruthy();
  return profile.id;
}

async function createApiContext(playwright: ApiContextFactory, baseURL: string | undefined, state: "admin" | "professor" | "headta" | "student") {
  return playwright.request.newContext({
    baseURL: baseURL ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    storageState: authFile(state)
  });
}

async function createIsolatedCourseOffering(admin: APIRequestContext) {
  const runId = `XC-${Date.now()}`;
  const slotStart = new Date(Date.UTC(2100, 0, 1) + (Date.now() % 100_000) * 60 * 60 * 1000);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

  const professorsResponse = await admin.get("/api/admin/course-offerings?professors=true");
  await expectOk(professorsResponse);
  const professors = (await professorsResponse.json()) as Array<{ id: string; email: string }>;
  const professor = professors.find((item) => item.email === "rezai@example.edu") ?? professors[0];
  expect(professor?.id).toBeTruthy();
  professorId = professor.id;

  const semestersResponse = await admin.get("/api/admin/semesters");
  await expectOk(semestersResponse);
  const semesters = (await semestersResponse.json()) as Array<{ id: string }>;
  expect(semesters.length).toBeGreaterThan(0);

  const courseResponse = await admin.post("/api/admin/courses", {
    data: {
      code: runId,
      title: `Cross-course isolated ${runId}`,
      units: 3
    }
  });
  await expectOk(courseResponse);
  const course = (await courseResponse.json()) as { id: string };

  const offeringResponse = await admin.post("/api/admin/course-offerings", {
    data: {
      courseId: course.id,
      semesterId: semesters[0].id,
      professorId: professor.id,
      section: runId.slice(-8),
      capacity: 30
    }
  });
  await expectOk(offeringResponse);
  const offering = (await offeringResponse.json()) as { id: string };

  const announcementResponse = await admin.post("/api/announcements", {
    data: {
      courseOfferingId: offering.id,
      title: `Isolated announcement ${runId}`,
      body: "This announcement must not leak to users who only have another course role.",
      priority: "important",
      publishedAt: "2026-07-05T00:00:00.000Z"
    }
  });
  await expectOk(announcementResponse);

  const calendarResponse = await admin.post("/api/calendar", {
    data: {
      courseOfferingId: offering.id,
      title: `Isolated calendar ${runId}`,
      description: "This event must stay course-scoped.",
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      eventType: "test"
    }
  });
  await expectOk(calendarResponse);

  const sessionResponse = await admin.post("/api/sessions", {
    data: {
      courseOfferingId: offering.id,
      hostId: professor.id,
      title: `Isolated session ${runId}`,
      startsAt: slotStart.toISOString(),
      endsAt: slotEnd.toISOString(),
      capacity: 10
    }
  });
  await expectOk(sessionResponse);

  const fileResponse = await admin.post("/api/files", {
    multipart: {
      visibility: "COURSE_STAFF",
      file: {
        name: `isolated-${runId}.txt`,
        mimeType: "text/plain",
        buffer: Buffer.from("Course B isolated material")
      }
    }
  });
  await expectOk(fileResponse);
  const file = (await fileResponse.json()) as { id: string };

  const materialResponse = await admin.post(`/api/course-offerings/${offering.id}/materials`, {
    data: {
      fileId: file.id,
      title: `Isolated material ${runId}`
    }
  });
  await expectOk(materialResponse);
  isolatedCourseMaterialFileId = file.id;

  return offering.id;
}

async function expectNoIsolatedCourseRows(response: APIResponse) {
  await expectOk(response);
  const rows = (await response.json()) as Array<{ courseOfferingId?: string | null; courseOffering?: { id: string } | null }>;
  expect(rows.some((row) => row.courseOfferingId === isolatedCourseOfferingId || row.courseOffering?.id === isolatedCourseOfferingId)).toBe(false);
}

test.beforeAll(async ({ playwright, baseURL }) => {
  const admin = await createApiContext(playwright, baseURL, "admin");
  const professor = await createApiContext(playwright, baseURL, "professor");
  const headTa = await createApiContext(playwright, baseURL, "headta");

  try {
    authorizedCourseOfferingId = await firstCourseOfferingId(professor);
    headTaId = await currentUserId(headTa);
    isolatedCourseOfferingId = await createIsolatedCourseOffering(admin);
    expect(isolatedCourseOfferingId).not.toBe(authorizedCourseOfferingId);
  } finally {
    await admin.dispose();
    await professor.dispose();
    await headTa.dispose();
  }
});

test.describe("global admin access", () => {
  test.use({ storageState: authFile("admin") });

  test("admin can access isolated course resources", async ({ page }) => {
    await expectOk(await page.request.get(`/api/gradebook/${isolatedCourseOfferingId}`));
    await expectOk(await page.request.get(`/api/exports/roster/${isolatedCourseOfferingId}`));
    await expectOk(await page.request.get(`/api/sessions?courseOfferingId=${isolatedCourseOfferingId}&upcoming=false`));
    await expectOk(await page.request.get(`/api/files/${isolatedCourseMaterialFileId}`));
  });
});

test.describe("professor course isolation", () => {
  test.use({ storageState: authFile("professor") });

  test("professor access in Course A does not grant grade or hiring access to Course B", async ({ page }) => {
    await expectOk(await page.request.get(`/api/gradebook/${authorizedCourseOfferingId}`));

    await expectPermissionDenied(await page.request.get(`/api/gradebook/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/exports/roster/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/exports/gradebook/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/files/${isolatedCourseMaterialFileId}`));
    await expectPermissionDenied(await page.request.post("/api/gradebook/categories", {
      data: {
        courseOfferingId: isolatedCourseOfferingId,
        name: `Blocked professor category ${Date.now()}`,
        weight: 10,
        maxScore: 20
      }
    }));
    await expectPermissionDenied(await page.request.post("/api/ta-opportunities", {
      data: {
        courseOfferingId: isolatedCourseOfferingId,
        title: `Blocked professor opportunity ${Date.now()}`,
        description: "Course A professor role must not create Course B opportunities.",
        requiredTAs: 1,
        needsHeadTA: false,
        requirements: "Course B role required.",
        deadline: "2099-03-01T00:00:00.000Z"
      }
    }));

    const uploadedResponse = await page.request.post("/api/files", {
      multipart: {
        visibility: "COURSE_STAFF",
        file: {
          name: `blocked-professor-${Date.now()}.txt`,
          mimeType: "text/plain",
          buffer: Buffer.from("Professor Course A file")
        }
      }
    });
    await expectOk(uploadedResponse);
    const uploaded = (await uploadedResponse.json()) as { id: string };
    await expectPermissionDenied(await page.request.post(`/api/course-offerings/${isolatedCourseOfferingId}/materials`, {
      data: {
        fileId: uploaded.id,
        title: `Blocked Course B material ${Date.now()}`
      }
    }));
  });

  test("professor unfiltered lists do not leak isolated course content", async ({ page }) => {
    await expectNoIsolatedCourseRows(await page.request.get("/api/sessions?upcoming=false"));
    await expectNoIsolatedCourseRows(await page.request.get("/api/announcements"));
    await expectNoIsolatedCourseRows(await page.request.get("/api/calendar"));
  });
});

test.describe("head TA course isolation", () => {
  test.use({ storageState: authFile("headta") });

  test("Head TA Course A privileges do not apply to Course B", async ({ page }) => {
    await expectOk(await page.request.get(`/api/gradebook/${authorizedCourseOfferingId}`));
    await expectOk(await page.request.get(`/api/exports/roster/${authorizedCourseOfferingId}`));

    await expectPermissionDenied(await page.request.get(`/api/gradebook/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/exports/roster/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/files/${isolatedCourseMaterialFileId}`));
    await expectPermissionDenied(await page.request.post(`/api/course-offerings/${isolatedCourseOfferingId}/roles`, {
      data: {
        userId: headTaId,
        role: "TA",
        assignmentSource: "cross-course-e2e"
      }
    }));
    await expectPermissionDenied(await page.request.post("/api/sessions", {
      data: {
        courseOfferingId: isolatedCourseOfferingId,
        hostId: headTaId,
        title: `Blocked Head TA session ${Date.now()}`,
        startsAt: "2099-03-02T08:00:00.000Z",
        endsAt: "2099-03-02T09:00:00.000Z"
      }
    }));
    await expectPermissionDenied(await page.request.post("/api/surveys", {
      data: {
        courseOfferingId: isolatedCourseOfferingId,
        title: `Blocked Head TA survey ${Date.now()}`,
        type: "CUSTOM",
        isAnonymous: true,
        minResponses: 3,
        opensAt: "2099-03-01T00:00:00.000Z",
        closesAt: "2099-04-01T00:00:00.000Z",
        questions: [{ text: "Blocked?", type: "TEXT" }]
      }
    }));
    await expectPermissionDenied(await page.request.post("/api/polls", {
      data: {
        courseOfferingId: isolatedCourseOfferingId,
        title: `Blocked Head TA poll ${Date.now()}`,
        pollType: "CUSTOM",
        deadline: "2099-03-10T00:00:00.000Z",
        isAnonymous: true,
        options: [{ label: "A" }, { label: "B" }]
      }
    }));
  });
});

test.describe("student course isolation", () => {
  test.use({ storageState: authFile("student") });

  test("student Course A enrollment does not expose Course B private resources", async ({ page }) => {
    await expectOk(await page.request.get(`/api/surveys?courseOfferingId=${authorizedCourseOfferingId}`));
    await expectOk(await page.request.get(`/api/sessions?courseOfferingId=${authorizedCourseOfferingId}&upcoming=false`));

    await expectPermissionDenied(await page.request.get(`/api/surveys?courseOfferingId=${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/sessions?courseOfferingId=${isolatedCourseOfferingId}&upcoming=false`));
    await expectPermissionDenied(await page.request.get(`/api/announcements?courseOfferingId=${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/calendar?courseOfferingId=${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/gradebook/${isolatedCourseOfferingId}`));
    await expectPermissionDenied(await page.request.get(`/api/files/${isolatedCourseMaterialFileId}`));
  });

  test("student unfiltered lists do not leak isolated course content", async ({ page }) => {
    await expectNoIsolatedCourseRows(await page.request.get("/api/sessions?upcoming=false"));
    await expectNoIsolatedCourseRows(await page.request.get("/api/announcements"));
    await expectNoIsolatedCourseRows(await page.request.get("/api/calendar"));
  });
});
