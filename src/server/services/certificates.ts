import crypto from "node:crypto";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { parseInput } from "@/server/utils/result";
import { decideCertificateRequestSchema, requestCertificateSchema } from "@/server/validation/certificates";

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function trackingCode(): string {
  return `TA-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function requestCertificate(actorId: string, input: unknown) {
  const data = parseInput(requestCertificateSchema, input);
  await requireCoursePermission(actorId, data.courseOfferingId, coursePermissions.REQUEST_CERTIFICATE);

  const matchingRole = await db.courseRoleAssignment.findFirst({
    where: {
      userId: actorId,
      courseOfferingId: data.courseOfferingId,
      role: data.role === "HEAD_TA" ? "HEAD_TA" : "TA",
      revokedAt: null,
      activeFrom: { lte: new Date() },
      OR: [{ activeUntil: null }, { activeUntil: { gt: new Date() } }]
    }
  });
  if (!matchingRole) throw new AppError("CERTIFICATE_ROLE_NOT_FOUND", "User does not have this course role", 403);

  return db.certificateRequest.upsert({
    where: { userId_courseOfferingId_role: { userId: actorId, courseOfferingId: data.courseOfferingId, role: data.role } },
    create: {
      userId: actorId,
      courseOfferingId: data.courseOfferingId,
      role: data.role,
      status: "SUBMITTED"
    },
    update: { status: "SUBMITTED", rejectionReason: null }
  });
}

export async function professorDecideCertificate(actorId: string, input: unknown) {
  const data = parseInput(decideCertificateRequestSchema, input);
  const request = await db.certificateRequest.findUnique({ where: { id: data.requestId } });
  if (!request) throw new AppError("CERTIFICATE_REQUEST_NOT_FOUND", "Certificate request not found", 404);

  await requireCoursePermission(actorId, request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);

  return db.certificateRequest.update({
    where: { id: request.id },
    data:
      data.decision === "APPROVE"
        ? { status: "PROFESSOR_APPROVED", professorApproverId: actorId, professorApprovedAt: new Date(), rejectionReason: null }
        : { status: "REJECTED", professorApproverId: actorId, professorApprovedAt: new Date(), rejectionReason: data.rejectionReason ?? "Rejected by professor" }
  });
}

export async function issueCertificateByEducationAdmin(actorId: string, requestId: string) {
  const request = await db.certificateRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError("CERTIFICATE_REQUEST_NOT_FOUND", "Certificate request not found", 404);
  await requireCoursePermission(actorId, request.courseOfferingId, coursePermissions.APPROVE_CERTIFICATE);
  if (request.status !== "PROFESSOR_APPROVED") throw new AppError("CERTIFICATE_NOT_READY", "Professor approval is required before issuing", 409);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const issued = await db.$transaction(async (tx) => {
    const updatedRequest = await tx.certificateRequest.update({
      where: { id: requestId },
      data: { status: "ISSUED", educationApproverId: actorId, educationApprovedAt: new Date() }
    });

    const certificate = await tx.tACertificate.create({
      data: {
        certificateRequestId: requestId,
        trackingCode: trackingCode(),
        verificationTokenHash: tokenHash(rawToken)
      }
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: "ISSUE",
        entityType: "TACertificate",
        entityId: certificate.id,
        courseOfferingId: request.courseOfferingId,
        afterJson: { request: updatedRequest, certificateId: certificate.id }
      }
    });

    return certificate;
  });

  return { certificate: issued, verificationToken: rawToken };
}
