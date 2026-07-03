import "server-only";
import { db } from "@/server/db";
import { getCourseRoleNames } from "@/server/services/rbac";
import { getUnreadMessageCount } from "@/server/services/messaging";
import { notifyUser } from "@/server/services/notifications";

// No cron/job runner exists in this project, so this runs opportunistically
// whenever the dashboard loads. It's idempotent (checks for an existing
// DEADLINE notification for the same entity in the last 24h) instead of
// needing real scheduling infrastructure.
async function notifyUpcomingDeadlines(userId: string) {
  const now = new Date();
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const recentCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [tasks, gradeItems] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: userId, dueAt: { gte: now, lte: soon }, status: { notIn: ["DONE", "CANCELLED"] }, submissions: { none: { userId } } },
      select: { id: true, title: true, dueAt: true }
    }),
    db.gradeItem.findMany({
      where: { dueAt: { gte: now, lte: soon }, courseOffering: { enrollments: { some: { studentId: userId, droppedAt: null } } }, submissions: { none: { studentId: userId } } },
      select: { id: true, title: true, dueAt: true }
    })
  ]);

  const candidates = [
    ...tasks.map((t) => ({ entityType: "Task", entityId: t.id, title: t.title, dueAt: t.dueAt })),
    ...gradeItems.map((g) => ({ entityType: "GradeItem", entityId: g.id, title: g.title, dueAt: g.dueAt }))
  ];

  for (const item of candidates) {
    const alreadyNotified = await db.notification.findFirst({
      where: {
        userId,
        type: "DEADLINE",
        createdAt: { gte: recentCutoff },
        AND: [
          { metadata: { path: ["entityType"], equals: item.entityType } },
          { metadata: { path: ["entityId"], equals: item.entityId } }
        ]
      }
    });
    if (alreadyNotified) continue;
    await notifyUser({
      userId,
      type: "DEADLINE",
      title: "مهلت نزدیک است",
      body: `${item.title} — کمتر از ۲۴ ساعت مانده`,
      href: item.entityType === "Task" ? "/dashboard" : "/grades",
      metadata: { entityType: item.entityType, entityId: item.entityId }
    });
  }
}

export async function dashboardSummary(userId: string) {
  await notifyUpcomingDeadlines(userId);
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, globalRole: true } });
  const [myRoles, myApplications, sessions, notifications, announcements, unreadMessages] = await Promise.all([
    db.courseRoleAssignment.findMany({ where: { userId, revokedAt: null }, include: { courseOffering: { include: { course: true, semester: true } } }, take: 10 }),
    db.tAApplication.findMany({ where: { applicantId: userId }, include: { opportunity: { include: { courseOffering: { include: { course: true } } } } }, orderBy: { submittedAt: "desc" }, take: 5 }),
    db.officeHourSession.findMany({ where: { startsAt: { gte: new Date() }, courseOffering: { OR: [{ enrollments: { some: { studentId: userId } } }, { roles: { some: { userId, revokedAt: null } } }] } }, include: { courseOffering: { include: { course: true } }, host: { select: { name: true } } }, orderBy: { startsAt: "asc" }, take: 5 }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    db.announcement.findMany({ where: { publishedAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { publishedAt: "desc" }, take: 5 }),
    getUnreadMessageCount(userId)
  ]);

  const counters = {
    activeCourses: myRoles.length,
    applications: myApplications.length,
    unreadNotifications: notifications.filter((n) => !n.readAt).length,
    upcomingSessions: sessions.length,
    unreadMessages
  };

  return { user, counters, myRoles, myApplications, sessions, notifications, announcements };
}

// TA-specific view: a TA who is also a plain student elsewhere already sees
// the base dashboardSummary section above; this adds "my tasks as a TA"
// specifically, which previously had no dedicated view at all (only Head TA
// saw the whole team's open tasks).
export async function taSummary(userId: string) {
  const tasks = await db.task.findMany({
    where: { assigneeId: userId },
    include: {
      courseOffering: { include: { course: true } },
      submissions: { where: { userId }, include: { file: { select: { id: true, originalName: true } } } }
    },
    orderBy: { dueAt: "asc" },
    take: 20
  });
  return {
    tasks: tasks.map((t) => ({ ...t, submission: t.submissions[0] ?? null })),
    counters: { myOpenTasks: tasks.filter((t) => t.status !== "DONE" && t.status !== "CANCELLED").length }
  };
}

export async function professorSummary(professorId: string) {
  const offerings = await db.courseOffering.findMany({ where: { professorId }, include: { course: true, semester: true } });
  const offeringIds = offerings.map((o) => o.id);
  const [opportunities, pendingApplications, unansweredThreads, activeSurveys, headTaAssignments] = await Promise.all([
    db.tAOpportunity.findMany({ where: { courseOfferingId: { in: offeringIds } }, include: { courseOffering: { include: { course: true } }, _count: { select: { applications: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.tAApplication.count({ where: { opportunity: { courseOfferingId: { in: offeringIds } }, status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    db.messageThread.count({ where: { courseOfferingId: { in: offeringIds }, isClosed: false } }),
    db.survey.count({ where: { courseOfferingId: { in: offeringIds }, opensAt: { lte: new Date() }, closesAt: { gte: new Date() } } }),
    db.courseRoleAssignment.findMany({ where: { courseOfferingId: { in: offeringIds }, role: "HEAD_TA", revokedAt: null }, select: { courseOfferingId: true } })
  ]);
  const offeringsWithoutHeadTa = offerings.filter((o) => !headTaAssignments.some((h) => h.courseOfferingId === o.id));
  return {
    offerings,
    opportunities,
    counters: { activeCourses: offerings.length, pendingApplications, unansweredThreads, activeSurveys },
    alerts: offeringsWithoutHeadTa.map((o) => `برای درس ${o.course.title} هنوز Head TA انتخاب نشده است.`)
  };
}

export async function headTaSummary(userId: string) {
  const roles = await db.courseRoleAssignment.findMany({ where: { userId, role: "HEAD_TA", revokedAt: null }, include: { courseOffering: { include: { course: true, semester: true } } } });
  const offeringIds = roles.map((r) => r.courseOfferingId);
  const [teamMembers, tasks, sessions, threads] = await Promise.all([
    db.courseRoleAssignment.findMany({ where: { courseOfferingId: { in: offeringIds }, role: "TA", revokedAt: null }, include: { user: { select: { id: true, name: true, email: true } }, courseOffering: { include: { course: true } } } }),
    db.task.findMany({ where: { courseOfferingId: { in: offeringIds }, status: { not: "DONE" } }, include: { assignee: { select: { name: true } } }, orderBy: { dueAt: "asc" }, take: 10 }),
    db.officeHourSession.findMany({ where: { courseOfferingId: { in: offeringIds }, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 5 }),
    db.messageThread.count({ where: { courseOfferingId: { in: offeringIds }, isClosed: false } })
  ]);
  return {
    offerings: roles.map((r) => r.courseOffering),
    counters: { managedCourses: offeringIds.length, teamSize: teamMembers.length, openTasks: tasks.length, unansweredThreads: threads },
    team: teamMembers,
    tasks,
    sessions
  };
}

export async function adminSummary() {
  const [users, offerings, opportunities, certificates, securityEvents] = await Promise.all([
    db.user.count(), db.courseOffering.count(), db.tAOpportunity.count({ where: { status: "PUBLISHED" } }), db.certificateRequest.count({ where: { status: { in: ["SUBMITTED", "PROFESSOR_APPROVED"] } } }), db.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 6 })
  ]);
  return { users, offerings, opportunities, certificates, securityEvents };
}
