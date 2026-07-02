import "server-only";
import crypto from "crypto";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { uploadFile } from "@/server/services/files";
import { renderCertificatePdf } from "@/server/certificates/pdf";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";

function code() { return crypto.randomBytes(8).toString("hex").toUpperCase(); }
function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export async function getCertificateEligibility(userId: string, courseOfferingId: string, role: "TA" | "HEAD_TA") {
  const courseRole = role === "HEAD_TA" ? "HEAD_TA" : "TA";
  const assignment = await db.courseRoleAssignment.findFirst({ where: { userId, courseOfferingId, role: courseRole, revokedAt: null } });
  const reports = await db.activityReport.count({ where: { userId, courseOfferingId } });
  const sessions = await db.officeHourSession.count({ where: { hostId: userId, courseOfferingId, status: { in: ["COMPLETED", "SCHEDULED", "LIVE"] } } });
  return { eligible: Boolean(assignment), checks: [{ key: "role", label: "نقش فعال در درس", passed: Boolean(assignment) }, { key: "activityReports", label: "گزارش فعالیت", passed: reports > 0, value: reports }, { key: "sessions", label: "جلسات ثبت‌شده", passed: sessions > 0, value: sessions }] };
}

const CERTIFICATE_REQUEST_IN_FLIGHT = ["DRAFT", "SUBMITTED", "PROFESSOR_APPROVED", "EDUCATION_APPROVED", "ISSUED"] as const;

export async function requestCertificate(actorId: string, input: { courseOfferingId: string; role: "TA" | "HEAD_TA" }) {
  const limiter = await checkRateLimit(makeRateLimitKey("certificate-request", actorId), 10, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many certificate requests", 429);
  const eligibility = await getCertificateEligibility(actorId, input.courseOfferingId, input.role);
  if (!eligibility.eligible) throw new AppError("CERTIFICATE_INELIGIBLE", "User is not eligible for this certificate", 409, eligibility);
  // No single-key upsert: a REJECTED/REVOKED request must stay as history,
  // not get silently reset back to SUBMITTED (same reasoning as
  // course-roles.ts's active-role lookup). Only an in-flight request blocks
  // a new one.
  const inFlight = await db.certificateRequest.findFirst({
    where: { userId: actorId, courseOfferingId: input.courseOfferingId, role: input.role, status: { in: [...CERTIFICATE_REQUEST_IN_FLIGHT] } }
  });
  if (inFlight) throw new AppError("CERTIFICATE_REQUEST_IN_FLIGHT", "You already have a request in progress for this course/role", 409);
  const request = await db.certificateRequest.create({ data: { userId: actorId, courseOfferingId: input.courseOfferingId, role: input.role, status: "SUBMITTED" } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "CertificateRequest", entityId: request.id, courseOfferingId: input.courseOfferingId, afterJson: request });
  return request;
}

export async function professorDecideCertificate(actorId: string, requestId: string, decision: "APPROVE" | "REJECT", rejectionReason?: string) {
  const request = await db.certificateRequest.findUnique({ where: { id: requestId }, include: { courseOffering: true } });
  if (!request) throw new AppError("NOT_FOUND", "Certificate request not found", 404);
  await requireCoursePermission(actorId, request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);
  const status = decision === "APPROVE" ? "PROFESSOR_APPROVED" : "REJECTED";
  const updated = await db.certificateRequest.update({ where: { id: requestId }, data: { status, professorApproverId: actorId, professorApprovedAt: decision === "APPROVE" ? new Date() : undefined, rejectionReason } });
  await notifyUser({ userId: request.userId, type: "CERTIFICATE", title: "وضعیت گواهی تغییر کرد", body: status, href: `/certificates` });
  await writeAuditLog({ actorId, action: decision === "APPROVE" ? "APPROVE" : "REJECT", entityType: "CertificateRequest", entityId: requestId, courseOfferingId: request.courseOfferingId, afterJson: { status } });
  return updated;
}

export async function issueCertificate(actorId: string, requestId: string) {
  const request = await db.certificateRequest.findUnique({
    where: { id: requestId },
    include: { requester: { select: { name: true, email: true } }, courseOffering: { include: { course: true, semester: true } } }
  });
  if (!request) throw new AppError("NOT_FOUND", "Certificate request not found", 404);
  await requireCoursePermission(actorId, request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);
  if (request.status !== "PROFESSOR_APPROVED" && request.status !== "EDUCATION_APPROVED") throw new AppError("CERTIFICATE_NOT_READY", "Certificate must be approved first", 409);
  const trackingCode = code();
  const verificationToken = crypto.randomBytes(20).toString("hex");
  const cert = await db.$transaction(async (tx) => {
    const c = await tx.tACertificate.create({ data: { certificateRequestId: requestId, trackingCode, verificationTokenHash: hash(verificationToken) } });
    await tx.certificateRequest.update({ where: { id: requestId }, data: { status: "ISSUED", educationApproverId: actorId, educationApprovedAt: new Date() } });
    return c;
  });

  const verificationUrl = `${process.env.AUTH_URL || "http://localhost:3000"}/certificates/verify/${trackingCode}`;
  const pdfBuffer = await renderCertificatePdf({
    name: request.requester.name || request.requester.email,
    role: request.role,
    course: request.courseOffering.course.title,
    semester: request.courseOffering.semester.title,
    trackingCode,
    issuedAt: cert.issuedAt,
    verificationUrl
  });
  const pdfFile = await uploadFile(request.userId, {
    buffer: pdfBuffer,
    originalName: `certificate-${trackingCode}.pdf`,
    mimeType: "application/pdf",
    visibility: "PRIVATE"
  });
  await db.tACertificate.update({ where: { id: cert.id }, data: { pdfFileId: pdfFile.id } });

  await notifyUser({ userId: request.userId, type: "CERTIFICATE", title: "گواهی شما صادر شد", body: trackingCode, href: `/certificates/${cert.id}` });
  await writeAuditLog({ actorId, action: "ISSUE", entityType: "TACertificate", entityId: cert.id, courseOfferingId: request.courseOfferingId, afterJson: { trackingCode } });
  return { ...cert, pdfFileId: pdfFile.id, verificationToken };
}

export async function revokeCertificate(actorId: string, certificateId: string, reason: string) {
  const cert = await db.tACertificate.findUnique({ where: { id: certificateId }, include: { request: true } });
  if (!cert) throw new AppError("NOT_FOUND", "Certificate not found", 404);
  if (cert.revokedAt) throw new AppError("ALREADY_REVOKED", "Certificate is already revoked", 409);
  await requireCoursePermission(actorId, cert.request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);
  const revoked = await db.tACertificate.update({ where: { id: certificateId }, data: { revokedAt: new Date(), revokedById: actorId, revokeReason: reason } });
  await notifyUser({ userId: cert.request.userId, type: "CERTIFICATE", title: "گواهی شما ابطال شد", body: reason, href: `/certificates` });
  await writeAuditLog({ actorId, action: "REVOKE", entityType: "TACertificate", entityId: certificateId, courseOfferingId: cert.request.courseOfferingId, metadata: { reason } });
  return revoked;
}

export async function issueCertificatesBulk(actorId: string, requestIds: string[]) {
  const results: { requestId: string; ok: boolean; error?: string }[] = [];
  for (const requestId of requestIds) {
    try {
      await issueCertificate(actorId, requestId);
      results.push({ requestId, ok: true });
    } catch (error) {
      results.push({ requestId, ok: false, error: error instanceof AppError ? error.message : "Unknown error" });
    }
  }
  return results;
}

export async function listMyCertificates(userId: string) {
  return db.certificateRequest.findMany({ where: { userId }, include: { courseOffering: { include: { course: true, semester: true } }, certificate: true }, orderBy: { requestedAt: "desc" } });
}

export async function verifyCertificatePublic(trackingCode: string) {
  const cert = await db.tACertificate.findUnique({ where: { trackingCode }, include: { request: { include: { requester: { select: { name: true } }, courseOffering: { include: { course: true, semester: true } } } } } });
  if (!cert || cert.revokedAt) throw new AppError("NOT_FOUND", "Certificate not found", 404);
  return { valid: true, trackingCode: cert.trackingCode, issuedAt: cert.issuedAt, role: cert.request.role, name: cert.request.requester.name, course: cert.request.courseOffering.course.title, semester: cert.request.courseOffering.semester.title };
}
