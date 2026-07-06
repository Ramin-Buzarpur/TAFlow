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
import { requireAttachableOwnedFile } from "@/server/services/files";

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
  opensAt?: Date;
  deadline: Date;
  selectionRubric?: Record<string, unknown>;
  formConfig?: { builtIn: { studentNumber: boolean; gpa: boolean; priorGrade: boolean; resume: boolean }; customFields: Array<{ key: string; label: string; type: string; required: boolean }> };
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
      opensAt: input.opensAt,
      deadline: input.deadline,
      selectionRubric: input.selectionRubric ? jsonSafe(input.selectionRubric) : undefined,
      formConfigJson: input.formConfig ? jsonSafe(input.formConfig) : undefined,
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

export function readFormConfig(formConfigJson: unknown): { builtIn: { studentNumber: boolean; gpa: boolean; priorGrade: boolean; resume: boolean }; customFields: Array<{ key: string; label: string; type: string; required: boolean }> } | null {
  if (!formConfigJson || typeof formConfigJson !== "object") return null;
  const config = formConfigJson as Record<string, unknown>;
  const builtInRaw = (config.builtIn ?? {}) as Record<string, unknown>;
  return {
    builtIn: {
      studentNumber: Boolean(builtInRaw.studentNumber),
      gpa: Boolean(builtInRaw.gpa),
      priorGrade: Boolean(builtInRaw.priorGrade),
      resume: builtInRaw.resume !== false
    },
    customFields: Array.isArray(config.customFields) ? (config.customFields as Array<{ key: string; label: string; type: string; required: boolean }>) : []
  };
}

export async function submitTAApplication(userId: string, input: {
  opportunityId: string;
  requestedRole: "TA" | "HEAD_TA" | "EITHER";
  motivationText: string;
  resumeFileId?: string;
  customFields?: Record<string, string | number>;
}) {
  const limiter = await checkRateLimit(makeRateLimitKey("submit-application", userId), 20, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many application submissions", 429);

  const opportunity = await db.tAOpportunity.findUnique({ where: { id: input.opportunityId } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  if (opportunity.status !== "PUBLISHED" || opportunity.deadline < new Date()) {
    throw new AppError("OPPORTUNITY_CLOSED", "This opportunity is not accepting applications", 409);
  }
  if (opportunity.opensAt && opportunity.opensAt > new Date()) {
    throw new AppError("OPPORTUNITY_NOT_OPEN_YET", "This opportunity is not accepting applications yet", 409);
  }
  const existing = await db.tAApplication.findUnique({ where: { opportunityId_applicantId: { opportunityId: input.opportunityId, applicantId: userId } } });
  if (existing) throw new AppError("ALREADY_APPLIED", "You have already applied to this opportunity", 409);

  const formConfig = readFormConfig(opportunity.formConfigJson);
  const resumeFileId = formConfig && !formConfig.builtIn.resume ? undefined : input.resumeFileId;
  if (resumeFileId) await requireAttachableOwnedFile(userId, resumeFileId);
  if (formConfig) {
    for (const field of formConfig.customFields) {
      if (field.required && (input.customFields?.[field.key] === undefined || input.customFields?.[field.key] === "")) {
        throw new AppError("MISSING_REQUIRED_FIELD", `فیلد «${field.label}» الزامی است`, 422);
      }
    }
  }
  const allowedKeys = new Set((formConfig?.customFields ?? []).map((f) => f.key));
  const customFieldsToStore = input.customFields
    ? Object.fromEntries(Object.entries(input.customFields).filter(([key]) => allowedKeys.has(key)))
    : undefined;

  const application = await db.$transaction(async (tx) => {
    const created = await tx.tAApplication.create({
      data: {
        opportunityId: input.opportunityId,
        applicantId: userId,
        requestedRole: input.requestedRole,
        motivationText: input.motivationText,
        resumeFileId,
        customFieldsJson: customFieldsToStore && Object.keys(customFieldsToStore).length ? jsonSafe(customFieldsToStore) : undefined
      },
      include: APPLICATION_INCLUDE
    });
    if (resumeFileId) await tx.uploadedFile.update({ where: { id: resumeFileId }, data: { visibility: "COURSE_STAFF" } });
    return created;
  });
  await notifyUser({ userId: opportunity.createdById, type: "APPLICATION_STATUS", title: "درخواست جدید TA", body: opportunity.title, href: `/applications/${application.id}` });
  await writeAuditLog({ actorId: userId, action: "CREATE", entityType: "TAApplication", entityId: application.id, courseOfferingId: opportunity.courseOfferingId, afterJson: application });
  return application;
}

// Built-in reviewer fields (student number, GPA, prior grade in this course)
// are always read from real StudentProfile/GradeRecord data rather than
// applicant free text, so a candidate cannot misrepresent them; the
// opportunity's formConfig only controls which of these the reviewer sees.
export async function getApplicantContext(actorId: string, opportunityId: string) {
  const opportunity = await db.tAOpportunity.findUnique({ where: { id: opportunityId }, include: { courseOffering: true } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  await requireCoursePermission(actorId, opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);

  const applications = await db.tAApplication.findMany({ where: { opportunityId }, select: { applicantId: true } });
  const applicantIds = applications.map((a) => a.applicantId);
  if (applicantIds.length === 0) return {};

  const [profiles, priorOfferings] = await Promise.all([
    db.studentProfile.findMany({ where: { userId: { in: applicantIds } }, select: { userId: true, studentNumber: true, gpa: true } }),
    db.courseOffering.findMany({ where: { courseId: opportunity.courseOffering.courseId, id: { not: opportunity.courseOfferingId } }, select: { id: true } })
  ]);
  const offeringIds = priorOfferings.map((o) => o.id);
  const priorGrades = offeringIds.length
    ? await db.gradeRecord.findMany({
        where: { studentId: { in: applicantIds }, status: "PUBLISHED", gradeItem: { courseOfferingId: { in: offeringIds } } },
        select: { studentId: true, score: true, gradeItem: { select: { title: true, maxScore: true, courseOffering: { select: { semester: { select: { title: true } } } } } } },
        orderBy: { createdAt: "desc" }
      })
    : [];

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const gradesByStudent = new Map<string, typeof priorGrades>();
  for (const g of priorGrades) {
    const list = gradesByStudent.get(g.studentId) ?? [];
    list.push(g);
    gradesByStudent.set(g.studentId, list);
  }

  const result: Record<string, { studentNumber: string | null; gpa: number | null; priorGrades: { title: string; score: number; maxScore: number; semester: string }[] }> = {};
  for (const id of applicantIds) {
    const profile = profileMap.get(id);
    const grades = gradesByStudent.get(id) ?? [];
    result[id] = {
      studentNumber: profile?.studentNumber ?? null,
      gpa: profile?.gpa != null ? Number(profile.gpa) : null,
      priorGrades: grades.map((g) => ({ title: g.gradeItem.title, score: Number(g.score), maxScore: Number(g.gradeItem.maxScore), semester: g.gradeItem.courseOffering.semester.title }))
    };
  }
  return result;
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
  if (status === "ACCEPTED") {
    // Nudge, not a gate: group creation itself stays a manual, always-available
    // action in the course panel, so saying no here doesn't lose the option.
    await notifyUser({ userId: actorId, type: "MESSAGE", title: "می‌خواهید گروه ارتباطی تیم را بسازید یا به‌روزرسانی کنید؟", body: "یک عضو جدید به تیم اضافه شد.", href: `/courses/${application.opportunity.courseOfferingId}` });
  }
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

export async function listTalentPool(
  actorId: string,
  opts: { q?: string; status?: "REJECTED" | "WITHDRAWN"; sort?: "recent" | "score" | "course"; take?: number } = {}
) {
  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  if (!user || !["PROFESSOR", "EDUCATION_ADMIN", "SYSTEM_ADMIN"].includes(user.globalRole)) throw new PermissionError();

  const rows = await db.tAApplication.findMany({
    where: {
      status: opts.status ?? { in: ["REJECTED", "WITHDRAWN"] }
    },
    include: {
      applicant: { select: { id: true, name: true, email: true, studentProfile: true } },
      opportunity: { include: { courseOffering: { include: { course: true, semester: true } } } }
    },
    orderBy: [{ submittedAt: "desc" }],
    take: Math.max(opts.take ?? 50, 50)
  });

  const q = opts.q?.trim().toLowerCase();
  const filtered = q
    ? rows.filter((row) => {
        const haystack = [
          row.applicant.name,
          row.applicant.email,
          row.applicant.studentProfile?.studentNumber,
          row.motivationText,
          row.opportunity.title,
          row.opportunity.description,
          row.opportunity.courseOffering.course.title,
          row.opportunity.courseOffering.course.code
        ]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .some((value) => value.toLowerCase().includes(q));
        return haystack;
      })
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    if (opts.sort === "score") {
      const scoreA = a.score === null ? -1 : Number(a.score);
      const scoreB = b.score === null ? -1 : Number(b.score);
      return scoreB - scoreA || b.submittedAt.getTime() - a.submittedAt.getTime();
    }
    if (opts.sort === "course") {
      const courseA = a.opportunity.courseOffering.course.title.localeCompare(b.opportunity.courseOffering.course.title, "fa");
      if (courseA !== 0) return courseA;
      return b.submittedAt.getTime() - a.submittedAt.getTime();
    }
    return b.submittedAt.getTime() - a.submittedAt.getTime();
  });

  return sorted.slice(0, opts.take ?? 50);
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
