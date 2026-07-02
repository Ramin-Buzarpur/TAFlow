import "server-only";
import type { TAApplicationStatus } from "@prisma/client";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { notifyUser } from "@/server/services/notifications";
import { jsonSafe } from "@/server/utils/json";
import { computeApplicationScore } from "@/server/services/scoring";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";

const APPLICATION_INCLUDE = {
  opportunity: { include: { courseOffering: { include: { course: true, semester: true } } } },
  applicant: { select: { id: true, name: true, email: true, studentProfile: true } },
  interviews: { orderBy: { startsAt: "asc" as const } }
};

const OPPORTUNITY_INCLUDE = {
  courseOffering: { include: { course: true, semester: true } }
};

const STATUS_TRANSITIONS: Record<TAApplicationStatus, TAApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["INTERVIEW_INVITED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_INVITED: ["ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: []
};

export async function createTAOpportunity(actorId: string, input: {
  courseOfferingId: string;
  title: string;
  description: string;
  requiredTAs?: number;
  needsHeadTA?: boolean;
  requirements: string;
  deadline: Date;
  selectionRubric?: Record<string, unknown>;
}) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.CREATE_TA_OPPORTUNITY);
  const opportunity = await db.tAOpportunity.create({
    data: {
      courseOfferingId: input.courseOfferingId,
      createdById: actorId,
      title: input.title,
      description: input.description,
      requiredTAs: input.requiredTAs ?? 1,
      needsHeadTA: input.needsHeadTA ?? false,
      requirements: input.requirements,
      deadline: input.deadline,
      selectionRubric: input.selectionRubric ? jsonSafe(input.selectionRubric) : undefined,
      status: "PUBLISHED",
      publishedAt: new Date()
    },
    include: OPPORTUNITY_INCLUDE
  });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "TAOpportunity", entityId: opportunity.id, courseOfferingId: input.courseOfferingId, afterJson: opportunity });
  return opportunity;
}

export async function listTAOpportunities(userId: string, opts: { courseOfferingId?: string; openOnly?: boolean; q?: string; skip?: number; take?: number }) {
  return db.tAOpportunity.findMany({
    where: {
      ...(opts.courseOfferingId ? { courseOfferingId: opts.courseOfferingId } : {}),
      ...(opts.openOnly ? { status: "PUBLISHED", deadline: { gte: new Date() } } : {}),
      ...(opts.q ? { OR: [{ title: { contains: opts.q, mode: "insensitive" } }, { description: { contains: opts.q, mode: "insensitive" } }] } : {})
    },
    include: OPPORTUNITY_INCLUDE,
    orderBy: { createdAt: "desc" },
    skip: opts.skip,
    take: opts.take ?? 30
  });
}

export async function getTAOpportunity(userId: string, id: string) {
  const opportunity = await db.tAOpportunity.findUnique({ where: { id }, include: OPPORTUNITY_INCLUDE });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  return opportunity;
}

export async function closeTAOpportunity(actorId: string, id: string) {
  const opportunity = await db.tAOpportunity.findUnique({ where: { id } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  await requireCoursePermission(actorId, opportunity.courseOfferingId, coursePermissions.CREATE_TA_OPPORTUNITY);
  const updated = await db.tAOpportunity.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() }, include: OPPORTUNITY_INCLUDE });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "TAOpportunity", entityId: id, courseOfferingId: opportunity.courseOfferingId, beforeJson: { status: opportunity.status }, afterJson: { status: "CLOSED" } });
  return updated;
}

export async function submitTAApplication(userId: string, input: {
  opportunityId: string;
  requestedRole: "TA" | "HEAD_TA" | "EITHER";
  motivationText: string;
  resumeFileId?: string;
}) {
  const limiter = await checkRateLimit(makeRateLimitKey("submit-application", userId), 20, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many application submissions", 429);

  const opportunity = await db.tAOpportunity.findUnique({ where: { id: input.opportunityId } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  if (opportunity.status !== "PUBLISHED" || opportunity.deadline < new Date()) {
    throw new AppError("OPPORTUNITY_CLOSED", "This opportunity is not accepting applications", 409);
  }
  const existing = await db.tAApplication.findUnique({ where: { opportunityId_applicantId: { opportunityId: input.opportunityId, applicantId: userId } } });
  if (existing) throw new AppError("ALREADY_APPLIED", "You have already applied to this opportunity", 409);

  const application = await db.tAApplication.create({
    data: {
      opportunityId: input.opportunityId,
      applicantId: userId,
      requestedRole: input.requestedRole,
      motivationText: input.motivationText,
      resumeFileId: input.resumeFileId
    },
    include: APPLICATION_INCLUDE
  });
  await notifyUser({ userId: opportunity.createdById, type: "APPLICATION_STATUS", title: "درخواست جدید TA", body: opportunity.title, href: `/applications/${application.id}` });
  await writeAuditLog({ actorId: userId, action: "CREATE", entityType: "TAApplication", entityId: application.id, courseOfferingId: opportunity.courseOfferingId, afterJson: application });
  return application;
}

export async function listApplications(userId: string, opts: { mine?: boolean; opportunityId?: string; status?: TAApplicationStatus; skip?: number; take?: number }) {
  if (opts.opportunityId) {
    const opportunity = await db.tAOpportunity.findUnique({ where: { id: opts.opportunityId } });
    if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
    await requireCoursePermission(userId, opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);
  }
  return db.tAApplication.findMany({
    where: {
      ...(opts.mine ? { applicantId: userId } : {}),
      ...(opts.opportunityId ? { opportunityId: opts.opportunityId } : {}),
      ...(opts.status ? { status: opts.status } : {})
    },
    include: APPLICATION_INCLUDE,
    orderBy: { submittedAt: "desc" },
    skip: opts.skip,
    take: opts.take ?? 30
  });
}

export async function getApplication(userId: string, id: string) {
  const application = await db.tAApplication.findUnique({ where: { id }, include: APPLICATION_INCLUDE });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);
  if (application.applicantId !== userId) {
    await requireCoursePermission(userId, application.opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);
  }
  return application;
}

export async function updateApplicationStatus(actorId: string, id: string, status: TAApplicationStatus, note?: string, score?: number) {
  const application = await db.tAApplication.findUnique({ where: { id }, include: { opportunity: true } });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);

  const requiredPermission = status === "ACCEPTED" ? coursePermissions.APPROVE_TA_APPLICATION : coursePermissions.REVIEW_TA_APPLICATION;
  await requireCoursePermission(actorId, application.opportunity.courseOfferingId, requiredPermission);

  const allowed = STATUS_TRANSITIONS[application.status] ?? [];
  if (!allowed.includes(status)) {
    throw new AppError("INVALID_STATUS_TRANSITION", `Cannot move application from ${application.status} to ${status}`, 409);
  }

  const updated = await db.$transaction(async (tx) => {
    const record = await tx.tAApplication.update({
      where: { id },
      data: { status, rejectionReason: status === "REJECTED" ? note : undefined, score: typeof score === "number" ? score : undefined },
      include: APPLICATION_INCLUDE
    });
    if (status === "ACCEPTED") {
      const role = application.requestedRole === "HEAD_TA" ? "HEAD_TA" : "TA";
      const activeExisting = await tx.courseRoleAssignment.findFirst({
        where: { courseOfferingId: application.opportunity.courseOfferingId, userId: application.applicantId, role, revokedAt: null }
      });
      if (!activeExisting) {
        await tx.courseRoleAssignment.create({
          data: { courseOfferingId: application.opportunity.courseOfferingId, userId: application.applicantId, role, assignedById: actorId, assignmentSource: "ta_application" }
        });
      }
    }
    return record;
  });

  await notifyUser({ userId: application.applicantId, type: "APPLICATION_STATUS", title: "وضعیت درخواست تغییر کرد", body: status, href: `/applications/${id}` });
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "TAApplication", entityId: id, courseOfferingId: application.opportunity.courseOfferingId, beforeJson: { status: application.status }, afterJson: { status, note, score } });
  return updated;
}

export async function withdrawApplication(userId: string, id: string) {
  const application = await db.tAApplication.findUnique({ where: { id }, include: { opportunity: true } });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);
  if (application.applicantId !== userId) throw new PermissionError();
  const allowed = STATUS_TRANSITIONS[application.status] ?? [];
  if (!allowed.includes("WITHDRAWN")) throw new AppError("INVALID_STATUS_TRANSITION", "Application can no longer be withdrawn", 409);

  const updated = await db.tAApplication.update({ where: { id }, data: { status: "WITHDRAWN" }, include: APPLICATION_INCLUDE });
  await writeAuditLog({ actorId: userId, action: "UPDATE", entityType: "TAApplication", entityId: id, courseOfferingId: application.opportunity.courseOfferingId, beforeJson: { status: application.status }, afterJson: { status: "WITHDRAWN" } });
  return updated;
}

export async function scheduleApplicationInterview(actorId: string, input: {
  applicationId: string;
  startsAt: Date;
  endsAt: Date;
  meetingUrl?: string;
  location?: string;
  notes?: string;
}) {
  const application = await db.tAApplication.findUnique({ where: { id: input.applicationId }, include: { opportunity: true } });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);
  await requireCoursePermission(actorId, application.opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);

  const interview = await db.$transaction(async (tx) => {
    const created = await tx.interview.create({
      data: {
        applicationId: input.applicationId,
        applicantId: application.applicantId,
        interviewerId: actorId,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        meetingUrl: input.meetingUrl,
        location: input.location,
        notes: input.notes
      }
    });
    const allowed = STATUS_TRANSITIONS[application.status] ?? [];
    if (allowed.includes("INTERVIEW_INVITED")) {
      await tx.tAApplication.update({ where: { id: input.applicationId }, data: { status: "INTERVIEW_INVITED" } });
    }
    return created;
  });

  await notifyUser({ userId: application.applicantId, type: "APPLICATION_STATUS", title: "دعوت به مصاحبه", body: application.opportunity.title, href: `/applications/${input.applicationId}` });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Interview", entityId: interview.id, courseOfferingId: application.opportunity.courseOfferingId, afterJson: interview });
  return interview;
}

export async function listTalentPool(actorId: string, opts: { skip?: number; take?: number } = {}) {
  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  if (!user || !["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"].includes(user.globalRole)) throw new PermissionError();
  return db.tAApplication.findMany({
    where: { status: { in: ["REJECTED", "WITHDRAWN"] } },
    include: {
      applicant: { select: { id: true, name: true, email: true, studentProfile: true } },
      opportunity: { include: { courseOffering: { include: { course: true, semester: true } } } }
    },
    orderBy: { submittedAt: "desc" },
    skip: opts.skip,
    take: opts.take ?? 50
  });
}

export async function submitApplicationReview(actorId: string, input: {
  applicationId: string;
  decision: "APPROVE" | "REJECT" | "SHORTLIST" | "INTERVIEW";
  score?: number;
  internalNote?: string;
}) {
  const application = await db.tAApplication.findUnique({ where: { id: input.applicationId }, include: { opportunity: true } });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);
  await requireCoursePermission(actorId, application.opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);

  const review = await db.applicationReview.upsert({
    where: { applicationId_reviewerId: { applicationId: input.applicationId, reviewerId: actorId } },
    create: { applicationId: input.applicationId, reviewerId: actorId, decision: input.decision, score: input.score, internalNote: input.internalNote },
    update: { decision: input.decision, score: input.score, internalNote: input.internalNote }
  });

  const updatedApplication = await computeApplicationScore(input.applicationId);
  await writeAuditLog({ actorId, action: "UPDATE", entityType: "ApplicationReview", entityId: review.id, courseOfferingId: application.opportunity.courseOfferingId, afterJson: review });
  return { review, application: updatedApplication };
}
