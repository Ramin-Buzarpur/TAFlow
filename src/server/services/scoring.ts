import "server-only";
import { db } from "@/server/db";
import { AppError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export async function computeApplicationScore(applicationId: string) {
  const application = await db.tAApplication.findUnique({
    where: { id: applicationId },
    include: { reviews: true, interviews: true, applicant: { include: { studentProfile: true } } }
  });
  if (!application) throw new AppError("NOT_FOUND", "Application not found", 404);

  const reviewAvg = average(application.reviews.map((r) => r.score).filter((v): v is NonNullable<typeof v> => v !== null).map(Number));
  const interviewAvg = average(application.interviews.map((i) => i.score).filter((v): v is NonNullable<typeof v> => v !== null).map(Number));
  const gpa = application.applicant.studentProfile?.gpa ? Number(application.applicant.studentProfile.gpa) : null;
  const gpaComponent = gpa !== null ? Math.min(100, (gpa / 20) * 100) : null;

  const components: { value: number; weight: number }[] = [];
  if (reviewAvg !== null) components.push({ value: reviewAvg, weight: 0.6 });
  if (interviewAvg !== null) components.push({ value: interviewAvg, weight: 0.3 });
  if (gpaComponent !== null) components.push({ value: gpaComponent, weight: 0.1 });

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score = totalWeight > 0 ? components.reduce((sum, c) => sum + c.value * c.weight, 0) / totalWeight : null;

  return db.tAApplication.update({ where: { id: applicationId }, data: { score: score ?? undefined } });
}

export async function rankApplications(actorId: string, opportunityId: string) {
  const opportunity = await db.tAOpportunity.findUnique({ where: { id: opportunityId } });
  if (!opportunity) throw new AppError("NOT_FOUND", "TA opportunity not found", 404);
  await requireCoursePermission(actorId, opportunity.courseOfferingId, coursePermissions.REVIEW_TA_APPLICATION);

  return db.tAApplication.findMany({
    where: { opportunityId },
    include: {
      applicant: { select: { id: true, name: true, email: true, studentProfile: true } },
      reviews: true,
      interviews: true
    },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }]
  });
}
