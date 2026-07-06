import "server-only";
import { db } from "@/server/db";
import { PermissionError } from "@/server/errors";
import { isGlobalAdmin } from "@/server/auth/permissions";

type ManagementCourseSummary = {
  courseOfferingId: string;
  course: string;
  semester: string;
  activeTaAssignments: number;
  activeHeadTaAssignments: number;
  applications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  activeSessions: number;
  registrations: number;
  attendedRegistrations: number;
  attendanceRate: number | null;
};

type ManagementReport = {
  totalApplications: number;
  activeTaAssignments: number;
  activeHeadTaAssignments: number;
  totalSessions: number;
  activeSessions: number;
  totalRegistrations: number;
  attendedRegistrations: number;
  attendanceRate: number | null;
  statusCounts: Array<{ status: string; count: number }>;
  topCourses: Array<{ opportunity: string; course: string; applications: number }>;
  professorSatisfaction: { count: number; averages: Record<string, number | null> };
  taSatisfaction: { count: number; averages: Record<string, number | null> };
  totalThreads: number;
  courseSummaries: ManagementCourseSummary[];
};

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ].join("\n");
}

async function requireAdmin(actorId: string) {
  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  if (!user || !isGlobalAdmin(user.globalRole)) throw new PermissionError();
}

export async function getManagementReport(actorId: string): Promise<ManagementReport> {
  await requireAdmin(actorId);

  const [totalApplications, statusCounts, topCourses, professorEvals, taEvals, threadStats, offerings, roleRows, applicationRows, sessionRows] = await Promise.all([
    db.tAApplication.count(),
    db.tAApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    db.tAOpportunity.findMany({
      select: { title: true, courseOffering: { select: { course: { select: { title: true } } } }, _count: { select: { applications: true } } },
      orderBy: { applications: { _count: "desc" } },
      take: 5
    }),
    db.professorEvaluation.aggregate({ _avg: { ratingTeaching: true, ratingFairness: true, ratingResources: true }, _count: { _all: true } }),
    db.tAEvaluation.aggregate({ _avg: { ratingKnowledge: true, ratingExplanation: true, ratingAvailability: true, ratingFairness: true }, _count: { _all: true } }),
    db.messageThread.aggregate({ _count: { _all: true } }),
    db.courseOffering.findMany({
      select: {
        id: true,
        course: { select: { title: true } },
        semester: { select: { title: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    db.courseRoleAssignment.findMany({
      where: { revokedAt: null, role: { in: ["TA", "HEAD_TA"] } },
      select: { courseOfferingId: true, role: true }
    }),
    db.tAApplication.findMany({
      select: { status: true, opportunity: { select: { courseOfferingId: true } } }
    }),
    db.officeHourSession.findMany({
      select: {
        courseOfferingId: true,
        status: true,
        registrations: { select: { attendedAt: true } }
      }
    })
  ]);

  const roleByCourse = new Map<string, { ta: number; headTa: number }>();
  for (const row of roleRows) {
    const entry = roleByCourse.get(row.courseOfferingId) ?? { ta: 0, headTa: 0 };
    if (row.role === "TA") entry.ta += 1;
    if (row.role === "HEAD_TA") entry.headTa += 1;
    roleByCourse.set(row.courseOfferingId, entry);
  }

  const applicationByCourse = new Map<string, { total: number; accepted: number; rejected: number }>();
  for (const row of applicationRows) {
    const courseOfferingId = row.opportunity.courseOfferingId;
    const entry = applicationByCourse.get(courseOfferingId) ?? { total: 0, accepted: 0, rejected: 0 };
    entry.total += 1;
    if (row.status === "ACCEPTED") entry.accepted += 1;
    if (row.status === "REJECTED") entry.rejected += 1;
    applicationByCourse.set(courseOfferingId, entry);
  }

  const sessionByCourse = new Map<string, { total: number; active: number; registrations: number; attended: number }>();
  for (const row of sessionRows) {
    const entry = sessionByCourse.get(row.courseOfferingId) ?? { total: 0, active: 0, registrations: 0, attended: 0 };
    entry.total += 1;
    if (row.status === "SCHEDULED" || row.status === "LIVE") entry.active += 1;
    entry.registrations += row.registrations.length;
    entry.attended += row.registrations.filter((registration) => registration.attendedAt !== null).length;
    sessionByCourse.set(row.courseOfferingId, entry);
  }

  const courseSummaries: ManagementCourseSummary[] = offerings.map((offering) => {
    const roles = roleByCourse.get(offering.id) ?? { ta: 0, headTa: 0 };
    const applications = applicationByCourse.get(offering.id) ?? { total: 0, accepted: 0, rejected: 0 };
    const sessions = sessionByCourse.get(offering.id) ?? { total: 0, active: 0, registrations: 0, attended: 0 };
    return {
      courseOfferingId: offering.id,
      course: offering.course.title,
      semester: offering.semester.title,
      activeTaAssignments: roles.ta,
      activeHeadTaAssignments: roles.headTa,
      applications: applications.total,
      acceptedApplications: applications.accepted,
      rejectedApplications: applications.rejected,
      activeSessions: sessions.active,
      registrations: sessions.registrations,
      attendedRegistrations: sessions.attended,
      attendanceRate: sessions.registrations ? Number(((sessions.attended / sessions.registrations) * 100).toFixed(1)) : null
    };
  });

  const activeTaAssignments = courseSummaries.reduce((total, course) => total + course.activeTaAssignments, 0);
  const activeHeadTaAssignments = courseSummaries.reduce((total, course) => total + course.activeHeadTaAssignments, 0);
  const totalSessions = sessionRows.length;
  const activeSessions = courseSummaries.reduce((total, course) => total + course.activeSessions, 0);
  const totalRegistrations = courseSummaries.reduce((total, course) => total + course.registrations, 0);
  const attendedRegistrations = courseSummaries.reduce((total, course) => total + course.attendedRegistrations, 0);

  return {
    totalApplications,
    activeTaAssignments,
    activeHeadTaAssignments,
    totalSessions,
    activeSessions,
    totalRegistrations,
    attendedRegistrations,
    attendanceRate: totalRegistrations ? Number(((attendedRegistrations / totalRegistrations) * 100).toFixed(1)) : null,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    topCourses: topCourses.map((o) => ({ opportunity: o.title, course: o.courseOffering.course.title, applications: o._count.applications })),
    professorSatisfaction: { count: professorEvals._count._all, averages: professorEvals._avg },
    taSatisfaction: { count: taEvals._count._all, averages: taEvals._avg },
    totalThreads: threadStats._count._all,
    courseSummaries
  };
}

export async function exportManagementReportCsv(actorId: string) {
  const report = await getManagementReport(actorId);
  return toCsv(report.courseSummaries.map((course) => ({
    course: course.course,
    semester: course.semester,
    activeTaAssignments: course.activeTaAssignments,
    activeHeadTaAssignments: course.activeHeadTaAssignments,
    applications: course.applications,
    acceptedApplications: course.acceptedApplications,
    rejectedApplications: course.rejectedApplications,
    activeSessions: course.activeSessions,
    registrations: course.registrations,
    attendedRegistrations: course.attendedRegistrations,
    attendanceRate: course.attendanceRate ?? ""
  })));
}
