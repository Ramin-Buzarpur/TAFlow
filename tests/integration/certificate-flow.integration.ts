import { CertificateRole, GlobalRole, PrismaClient, UserStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { deleteObject } from "@/server/storage/s3";
import {
  issueCertificate,
  professorDecideCertificate,
  requestCertificate,
  revokeCertificate,
  verifyCertificatePublic
} from "@/server/services/certificates";

const prisma = new PrismaClient();
const runId = `certificate-flow-${Date.now()}-${randomUUID().slice(0, 8)}`;

let courseOfferingId: string;
let headTaId: string;
let professorId: string;
let activityReportId: string | null = null;
let certificateRequestId: string | null = null;
let certificateId: string | null = null;
let pdfFileId: string | null = null;

afterAll(async () => {
  if (pdfFileId) {
    const file = await prisma.uploadedFile.findUnique({ where: { id: pdfFileId }, select: { storageKey: true } });
    if (file) {
      await deleteObject(file.storageKey).catch(() => {});
    }
    await prisma.uploadedFile.deleteMany({ where: { id: pdfFileId } }).catch(() => {});
  }
  if (certificateId) {
    await prisma.tACertificate.deleteMany({ where: { id: certificateId } }).catch(() => {});
  }
  if (certificateRequestId) {
    await prisma.certificateRequest.deleteMany({ where: { id: certificateRequestId } }).catch(() => {});
  }
  if (activityReportId) {
    await prisma.activityReport.deleteMany({ where: { id: activityReportId } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("certificate workflow", () => {
  it("issues a signed PDF certificate and invalidates public verification after revocation", async () => {
    const headTa = await prisma.user.findUniqueOrThrow({
      where: { email: "headta@example.edu" },
      select: { id: true }
    });
    const professor = await prisma.user.findUniqueOrThrow({
      where: { email: "rezai@example.edu" },
      select: { id: true }
    });
    headTaId = headTa.id;
    professorId = professor.id;

    const role = await prisma.courseRoleAssignment.findFirstOrThrow({
      where: { userId: headTaId, role: "HEAD_TA", revokedAt: null },
      select: { courseOfferingId: true }
    });
    courseOfferingId = role.courseOfferingId;

    const session = await prisma.officeHourSession.findFirstOrThrow({
      where: { hostId: headTaId, courseOfferingId },
      select: { id: true }
    });
    expect(session.id).toBeTruthy();

    await prisma.certificateRequest.deleteMany({
      where: { userId: headTaId, courseOfferingId, role: CertificateRole.HEAD_TA }
    });
    await prisma.activityReport.deleteMany({
      where: {
        userId: headTaId,
        courseOfferingId,
        weekStartsAt: new Date("2026-10-05T00:00:00.000Z")
      }
    });

    const report = await prisma.activityReport.create({
      data: {
        courseOfferingId,
        userId: headTaId,
        weekStartsAt: new Date("2026-10-05T00:00:00.000Z"),
        summary: `${runId} activity report`,
        hoursSpent: 6
      }
    });
    activityReportId = report.id;

    const request = await requestCertificate(headTaId, { courseOfferingId, role: "HEAD_TA" });
    certificateRequestId = request.id;
    expect(request.status).toBe("SUBMITTED");

    const decided = await professorDecideCertificate(professorId, request.id, "APPROVE");
    expect(decided.status).toBe("PROFESSOR_APPROVED");

    const issued = await issueCertificate(professorId, request.id);
    certificateId = issued.id;
    pdfFileId = issued.pdfFileId;

    expect(issued.trackingCode).toBeTruthy();
    expect(issued.pdfFileId).toBeTruthy();
    expect(issued.verificationToken).toBeTruthy();

    const pdfFile = await prisma.uploadedFile.findUniqueOrThrow({
      where: { id: issued.pdfFileId },
      select: { id: true, storageKey: true, mimeType: true, originalName: true }
    });
    expect(pdfFile.mimeType).toBe("application/pdf");
    expect(pdfFile.originalName).toContain(issued.trackingCode);
    expect(pdfFile.storageKey).toContain(headTaId);

    const storedCertificate = await prisma.tACertificate.findUniqueOrThrow({
      where: { id: issued.id },
      select: { verificationTokenHash: true, pdfFileId: true, revokedAt: true }
    });
    expect(storedCertificate.pdfFileId).toBe(issued.pdfFileId);
    expect(storedCertificate.verificationTokenHash).not.toBe(issued.verificationToken);
    expect(storedCertificate.revokedAt).toBeNull();

    const verified = await verifyCertificatePublic(issued.trackingCode);
    expect(verified).toMatchObject({
      valid: true,
      trackingCode: issued.trackingCode,
      role: "HEAD_TA"
    });

    const revoked = await revokeCertificate(professorId, issued.id, "Regression coverage");
    expect(revoked.revokedAt).toBeInstanceOf(Date);
    expect(revoked.revokeReason).toBe("Regression coverage");

    await expect(verifyCertificatePublic(issued.trackingCode)).rejects.toMatchObject({ code: "NOT_FOUND" });
  }, 30_000);
});
