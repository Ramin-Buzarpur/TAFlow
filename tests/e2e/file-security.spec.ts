import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { authFile } from "./global-setup";
import { PASSWORD } from "./helpers";
import { hashPassword } from "../../src/server/auth/password";

test.describe.configure({ mode: "serial" });

const prisma = new PrismaClient();
const runId = `file-sec-${Date.now()}`;

let professorBContext: BrowserContext;
let studentBContext: BrowserContext;
let professorBRequest: APIRequestContext;
let studentBRequest: APIRequestContext;

let courseBOfferingId: string;
let opportunityBId: string;
let resumeBFileId: string;
let unattachedBFileId: string;
let courseBMaterialFileId: string;
let courseBMaterialId: string;
let professorBId: string;
let studentBId: string;

async function expectOk(response: { status(): number; json(): Promise<unknown> }) {
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(300);
}

async function expectPermissionDenied(response: { status(): number; json(): Promise<unknown> }) {
  expect(response.status()).toBe(403);
  const body = (await response.json()) as { error: string };
  expect(body.error).toBe("PERMISSION_DENIED");
}

async function loginContext(context: BrowserContext, email: string) {
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByPlaceholder("ایمیل").fill(email);
  await page.getByPlaceholder("رمز عبور").fill(PASSWORD);
  await page.getByRole("button", { name: "ورود" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
  await page.close();
}

async function uploadTextFile(request: APIRequestContext, name: string, text: string) {
  const response = await request.post("/api/files", {
    multipart: {
      visibility: "PUBLIC",
      file: {
        name,
        mimeType: "text/plain",
        buffer: Buffer.from(text)
      }
    }
  });
  await expectOk(response);
  const file = (await response.json()) as { id: string; storageKey?: string; originalName: string };
  expect(file.id).toBeTruthy();
  expect(file.storageKey).toBeUndefined();
  return file;
}

async function createCourseOfferingForProfessor(professorId: string) {
  const semester = await prisma.semester.findFirstOrThrow({ orderBy: { startsAt: "desc" } });
  const course = await prisma.course.create({
    data: {
      code: `${runId}-course`,
      title: `File security ${runId}`
    }
  });
  const offering = await prisma.courseOffering.create({
    data: {
      courseId: course.id,
      semesterId: semester.id,
      professorId,
      section: runId.slice(-8),
      status: "ACTIVE"
    }
  });
  await prisma.courseRoleAssignment.create({
    data: {
      courseOfferingId: offering.id,
      userId: professorId,
      assignedById: professorId,
      role: "PROFESSOR"
    }
  });
  return offering.id;
}

test.beforeAll(async ({ browser, baseURL }) => {
  const passwordHash = await hashPassword(PASSWORD);
  const professorBEmail = `${runId}-professor@example.test`;
  const studentBEmail = `${runId}-student@example.test`;

  const [professorB, studentB] = await Promise.all([
    prisma.user.create({
      data: {
        email: professorBEmail,
        name: "File Security Professor",
        emailVerified: new Date(),
        passwordHash,
        globalRole: "PROFESSOR",
        status: "ACTIVE"
      }
    }),
    prisma.user.create({
      data: {
        email: studentBEmail,
        name: "File Security Student",
        emailVerified: new Date(),
        passwordHash,
        globalRole: "STUDENT",
        status: "ACTIVE",
        studentProfile: { create: { studentNumber: runId.slice(-16) } }
      }
    })
  ]);

  professorBId = professorB.id;
  studentBId = studentB.id;
  courseBOfferingId = await createCourseOfferingForProfessor(professorB.id);
  await prisma.courseRoleAssignment.findFirstOrThrow({
    where: { user: { email: "rezai@example.edu" }, role: "PROFESSOR", revokedAt: null },
    select: { courseOfferingId: true }
  });

  const opportunity = await prisma.tAOpportunity.create({
    data: {
      courseOfferingId: courseBOfferingId,
      createdById: professorB.id,
      title: `File security opportunity ${runId}`,
      description: "A course B opportunity used for resume isolation checks.",
      requiredTAs: 1,
      needsHeadTA: false,
      requirements: "Submit a resume.",
      deadline: new Date("2099-05-01T00:00:00.000Z"),
      status: "PUBLISHED",
      publishedAt: new Date()
    }
  });
  opportunityBId = opportunity.id;

  professorBContext = await browser.newContext({ baseURL });
  studentBContext = await browser.newContext({ baseURL });
  await loginContext(professorBContext, professorBEmail);
  await loginContext(studentBContext, studentBEmail);
  professorBRequest = professorBContext.request;
  studentBRequest = studentBContext.request;

  const resumeFile = await uploadTextFile(studentBRequest, `resume-${runId}.txt`, "student B resume");
  resumeBFileId = resumeFile.id;
  const applicationResponse = await studentBRequest.post(`/api/ta-opportunities/${opportunityBId}/applications`, {
    data: {
      requestedRole: "TA",
      motivationText: "I am applying with a private resume.",
      resumeFileId: resumeBFileId
    }
  });
  await expectOk(applicationResponse);

  const unattached = await uploadTextFile(studentBRequest, `unattached-${runId}.txt`, "student B unattached file");
  unattachedBFileId = unattached.id;

  const materialFile = await uploadTextFile(professorBRequest, `material-${runId}.txt`, "course B material");
  const materialResponse = await professorBRequest.post(`/api/course-offerings/${courseBOfferingId}/materials`, {
    data: {
      fileId: materialFile.id,
      title: `Course B material ${runId}`
    }
  });
  await expectOk(materialResponse);
  const material = (await materialResponse.json()) as { id: string; file: { id: string } };
  courseBMaterialId = material.id;
  courseBMaterialFileId = material.file.id;
});

test.afterAll(async () => {
  await professorBContext?.close();
  await studentBContext?.close();
  await prisma.securityEvent.deleteMany({ where: { userId: { in: [professorBId, studentBId].filter(Boolean) } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [professorBId, studentBId].filter(Boolean) } }, { entityId: { in: [resumeBFileId, unattachedBFileId, courseBMaterialFileId].filter(Boolean) } }] } });
  await prisma.uploadedFile.deleteMany({ where: { ownerId: { in: [professorBId, studentBId].filter(Boolean) } } });
  await prisma.tAOpportunity.deleteMany({ where: { id: opportunityBId } });
  await prisma.courseOffering.deleteMany({ where: { id: courseBOfferingId } });
  await prisma.course.deleteMany({ where: { code: `${runId}-course` } });
  await prisma.user.deleteMany({ where: { id: { in: [professorBId, studentBId].filter(Boolean) } } });
  await prisma.$disconnect();
});

test.describe("application resume isolation", () => {
  test.use({ storageState: authFile("student") });

  test("student A cannot download student B resume or unattached file by guessing file IDs", async ({ page }) => {
    await expectPermissionDenied(await page.request.get(`/api/files/${resumeBFileId}`));
    await expectPermissionDenied(await page.request.get(`/api/files/${unattachedBFileId}`));
  });
});

test.describe("cross-course reviewer isolation", () => {
  test.use({ storageState: authFile("professor") });

  test("Course A professor cannot download Course B resume or attach Course A file to Course B", async ({ page }) => {
    await expectPermissionDenied(await page.request.get(`/api/files/${resumeBFileId}`));

    const uploaded = await uploadTextFile(page.request, `course-a-${runId}.txt`, "course A professor file");
    await expectPermissionDenied(await page.request.post(`/api/course-offerings/${courseBOfferingId}/materials`, {
      data: {
        fileId: uploaded.id,
        title: "blocked cross-course material"
      }
    }));
    await expectOk(await page.request.delete(`/api/files/${uploaded.id}`));
  });
});

test.describe("head TA course isolation", () => {
  test.use({ storageState: authFile("headta") });

  test("Course A Head TA cannot download Course B applicant resume or Course B material", async ({ page }) => {
    await expectPermissionDenied(await page.request.get(`/api/files/${resumeBFileId}`));
    await expectPermissionDenied(await page.request.get(`/api/files/${courseBMaterialFileId}`));
  });
});

test("authorized Course B reviewer and applicant can access intended resume", async () => {
  await expectOk(await professorBRequest.get(`/api/files/${resumeBFileId}`));
  await expectOk(await studentBRequest.get(`/api/files/${resumeBFileId}`));
});

test.describe("admin file access", () => {
  test.use({ storageState: authFile("admin") });

  test("global admin can access Course B resume and material through policy", async ({ page }) => {
    await expectOk(await page.request.get(`/api/files/${resumeBFileId}`));
    await expectOk(await page.request.get(`/api/files/${courseBMaterialFileId}`));
  });
});

test.describe("file delete ownership", () => {
  test.use({ storageState: authFile("student") });

  test("student A cannot delete student B file and cannot delete by object key", async ({ page }) => {
    await expectPermissionDenied(await page.request.delete(`/api/files/${unattachedBFileId}`));
    const objectKeyResponse = await page.request.delete("/api/files/not-a-cuid-storage-key");
    expect(objectKeyResponse.status()).toBe(404);
  });
});

test("object keys are server-generated, sanitized, and not exposed", async () => {
  const uploaded = await uploadTextFile(studentBRequest, "../..\\evil<script>.txt", "malicious filename probe");
  const stored = await prisma.uploadedFile.findUniqueOrThrow({ where: { id: uploaded.id } });

  expect(stored.ownerId).toBe(studentBId);
  expect(stored.storageKey.startsWith(`${studentBId}/`)).toBe(true);
  expect(stored.storageKey).not.toContain("\\");
  expect(stored.storageKey).not.toContain("<");
  expect(stored.storageKey).not.toContain(">");
  expect(stored.storageKey).not.toContain("/../");

  await expectOk(await studentBRequest.delete(`/api/files/${uploaded.id}`));
});

test.describe("course material delete ownership", () => {
  test.use({ storageState: authFile("professor") });

  test("Course A role cannot delete Course B material file", async ({ page }) => {
    await expectPermissionDenied(await page.request.delete(`/api/files/${courseBMaterialFileId}`));
  });
});

test("authorized Course B material manager can delete Course B material with trusted stored metadata", async () => {
  await expectOk(await professorBRequest.delete(`/api/course-materials/${courseBMaterialId}`));
  const deleted = await prisma.uploadedFile.findUniqueOrThrow({ where: { id: courseBMaterialFileId } });
  expect(deleted.deletedAt).toBeInstanceOf(Date);
});
