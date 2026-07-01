import "server-only";
import { db } from "@/server/db";
import { PermissionError } from "@/server/errors";
import { isGlobalAdmin } from "@/server/auth/permissions";

async function requireAdmin(actorId: string) {
  const user = await db.user.findUnique({ where: { id: actorId }, select: { globalRole: true } });
  if (!user || !isGlobalAdmin(user.globalRole)) throw new PermissionError();
}

export async function getManagementReport(actorId: string) {
  await requireAdmin(actorId);

  const [totalApplications, statusCounts, topCourses, professorEvals, taEvals, threadStats] = await Promise.all([
    db.tAApplication.count(),
    db.tAApplication.groupBy({ by: ["status"], _count: { _all: true } }),
    db.tAOpportunity.findMany({
      select: { title: true, courseOffering: { select: { course: { select: { title: true } } } }, _count: { select: { applications: true } } },
      orderBy: { applications: { _count: "desc" } },
      take: 5
    }),
    db.professorEvaluation.aggregate({ _avg: { ratingTeaching: true, ratingFairness: true, ratingResources: true }, _count: { _all: true } }),
    db.tAEvaluation.aggregate({ _avg: { ratingKnowledge: true, ratingExplanation: true, ratingAvailability: true, ratingFairness: true }, _count: { _all: true } }),
    db.messageThread.aggregate({ _count: { _all: true } })
  ]);

  const accepted = statusCounts.find((s) => s.status === "ACCEPTED")?._count._all ?? 0;
  const rejected = statusCounts.find((s) => s.status === "REJECTED")?._count._all ?? 0;
  const decided = accepted + rejected;

  return {
    totalApplications,
    statusCounts: statusCounts.map((s) => ({ status: s.status, count: s._count._all })),
    acceptanceRate: decided > 0 ? Math.round((accepted / decided) * 100) : null,
    topCourses: topCourses.map((o) => ({ opportunity: o.title, course: o.courseOffering.course.title, applications: o._count.applications })),
    professorSatisfaction: { count: professorEvals._count._all, averages: professorEvals._avg },
    taSatisfaction: { count: taEvals._count._all, averages: taEvals._avg },
    totalThreads: threadStats._count._all
  };
}
