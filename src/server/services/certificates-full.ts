import "server-only";
import crypto from "crypto";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";

function code() { return crypto.randomBytes(8).toString("hex").toUpperCase(); }
function hash(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }

export async function getCertificateEligibility(userId: string, courseOfferingId: string, role: "TA" | "HEAD_TA") {
  const courseRole = role === "HEAD_TA" ? "HEAD_TA" : "TA";
  const assignment = await db.courseRoleAssignment.findFirst({ where: { userId, courseOfferingId, role: courseRole, revokedAt: null } });
  const reports = await db.activityReport.count({ where: { userId, courseOfferingId } });
  const sessions = await db.officeHourSession.count({ where: { hostId: userId, courseOfferingId, status: { in: ["COMPLETED", "SCHEDULED", "LIVE"] } } });
  return { eligible: Boolean(assignment), checks: [{ key: "role", label: "نقش فعال در درس", passed: Boolean(assignment) }, { key: "activityReports", label: "گزارش فعالیت", passed: reports > 0, value: reports }, { key: "sessions", label: "جلسات ثبت‌شده", passed: sessions > 0, value: sessions }] };
}

export async function requestCertificateFull(actorId: string, input: { courseOfferingId: string; role: "TA" | "HEAD_TA" }) {
  const eligibility = await getCertificateEligibility(actorId, input.courseOfferingId, input.role);
  if (!eligibility.eligible) throw new AppError("CERTIFICATE_INELIGIBLE", "User is not eligible for this certificate", 409, eligibility);
  const request = await db.certificateRequest.upsert({ where: { userId_courseOfferingId_role: { userId: actorId, courseOfferingId: input.courseOfferingId, role: input.role } }, create: { userId: actorId, courseOfferingId: input.courseOfferingId, role: input.role, status: "SUBMITTED" }, update: { status: "SUBMITTED", rejectionReason: null } });
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
  const request = await db.certificateRequest.findUnique({ where: { id: requestId } });
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
  await notifyUser({ userId: request.userId, type: "CERTIFICATE", title: "گواهی شما صادر شد", body: trackingCode, href: `/certificates/${cert.id}` });
  await writeAuditLog({ actorId, action: "ISSUE", entityType: "TACertificate", entityId: cert.id, courseOfferingId: request.courseOfferingId, afterJson: { trackingCode } });
  return { ...cert, verificationToken };
}

export async function listMyCertificates(userId: string) {
  return db.certificateRequest.findMany({ where: { userId }, include: { courseOffering: { include: { course: true, semester: true } }, certificate: true }, orderBy: { requestedAt: "desc" } });
}

export async function verifyCertificatePublic(trackingCode: string) {
  const cert = await db.tACertificate.findUnique({ where: { trackingCode }, include: { request: { include: { requester: { select: { name: true } }, courseOffering: { include: { course: true, semester: true } } } } } });
  if (!cert || cert.revokedAt) throw new AppError("NOT_FOUND", "Certificate not found", 404);
  return { valid: true, trackingCode: cert.trackingCode, issuedAt: cert.issuedAt, role: cert.request.role, name: cert.request.requester.name, course: cert.request.courseOffering.course.title, semester: cert.request.courseOffering.semester.title };
}
