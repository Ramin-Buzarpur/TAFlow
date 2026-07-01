import "server-only";
import crypto from "crypto";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { requireCoursePermission } from "@/server/services/rbac";

const MIN_RESPONSES_TO_SHOW = 3;

function respondentHash(userId: string, courseOfferingId: string, scope: string) {
  return crypto.createHash("sha256").update(`${userId}:${courseOfferingId}:${scope}:${process.env.AUTH_SECRET || "dev"}`).digest("hex");
}

export async function listEvaluableCourseOfferings(studentId: string) {
  const enrollments = await db.courseEnrollment.findMany({
    where: { studentId, droppedAt: null },
    include: { courseOffering: { include: { course: true, semester: true } } }
  });
  return enrollments.map((e) => e.courseOffering);
}

export async function submitProfessorEvaluation(studentId: string, input: {
  courseOfferingId: string;
  ratingTeaching: number;
  ratingFairness: number;
  ratingResources: number;
  comment?: string;
}) {
  const enrollment = await db.courseEnrollment.findUnique({
    where: { courseOfferingId_studentId: { courseOfferingId: input.courseOfferingId, studentId } }
  });
  if (!enrollment || enrollment.droppedAt) throw new PermissionError("Only enrolled students can evaluate the professor of this course");

  const hash = respondentHash(studentId, input.courseOfferingId, "professor-eval");
  const existing = await db.professorEvaluation.findFirst({ where: { courseOfferingId: input.courseOfferingId, respondentHash: hash } });
  if (existing) throw new AppError("DUPLICATE_EVALUATION", "You already evaluated the professor for this course", 409);

  return db.professorEvaluation.create({
    data: {
      courseOfferingId: input.courseOfferingId,
      respondentHash: hash,
      ratingTeaching: input.ratingTeaching,
      ratingFairness: input.ratingFairness,
      ratingResources: input.ratingResources,
      comment: input.comment
    }
  });
}

export async function getProfessorEvaluationSummary(actorId: string, courseOfferingId: string) {
  await requireCoursePermission(actorId, courseOfferingId, coursePermissions.VIEW_SURVEY_RESULTS);
  const evaluations = await db.professorEvaluation.findMany({ where: { courseOfferingId } });
  const responseCount = evaluations.length;
  if (responseCount < MIN_RESPONSES_TO_SHOW) {
    return { responseCount, hidden: true, minResponses: MIN_RESPONSES_TO_SHOW };
  }
  const avg = (key: "ratingTeaching" | "ratingFairness" | "ratingResources") =>
    evaluations.reduce((sum, e) => sum + e[key], 0) / evaluations.length;
  return {
    responseCount,
    hidden: false,
    averages: { teaching: avg("ratingTeaching"), fairness: avg("ratingFairness"), resources: avg("ratingResources") },
    comments: evaluations.map((e) => e.comment).filter(Boolean)
  };
}
