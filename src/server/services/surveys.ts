import "server-only";
import crypto from "crypto";
import { db } from "@/server/db";
import { AppError, PermissionError } from "@/server/errors";
import { coursePermissions } from "@/server/auth/permissions";
import { canAccessCourseOffering, requireCoursePermission } from "@/server/services/rbac";
import { writeAuditLog } from "@/server/services/audit";
import { checkRateLimit, makeRateLimitKey } from "@/server/auth/rate-limit";

function respondentHash(userId: string, surveyId: string) {
  return crypto.createHash("sha256").update(`${userId}:${surveyId}:${process.env.AUTH_SECRET || "dev"}`).digest("hex");
}

export async function createSurvey(actorId: string, input: { courseOfferingId: string; title: string; description?: string; type: "TA_MIDTERM" | "TA_FINAL" | "PROFESSOR_EVALUATION" | "COURSE_FEEDBACK" | "CUSTOM"; isAnonymous: boolean; minResponses: number; opensAt: Date; closesAt: Date; questions: { text: string; type: "RATING" | "TEXT" | "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "BOOLEAN"; required?: boolean; optionsJson?: unknown }[] }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.CREATE_SURVEY);
  const survey = await db.survey.create({ data: { courseOfferingId: input.courseOfferingId, createdById: actorId, title: input.title, description: input.description, type: input.type, isAnonymous: input.isAnonymous, minResponses: input.minResponses, opensAt: input.opensAt, closesAt: input.closesAt, questions: { create: input.questions.map((q, i) => ({ ...q, orderIndex: i, optionsJson: q.optionsJson as object | undefined })) } }, include: { questions: true } });
  await writeAuditLog({ actorId, action: "CREATE", entityType: "Survey", entityId: survey.id, courseOfferingId: input.courseOfferingId, afterJson: survey });
  return survey;
}

export async function listSurveys(actorId: string, courseOfferingId: string) {
  if (!(await canAccessCourseOffering(actorId, courseOfferingId))) throw new PermissionError();
  return db.survey.findMany({ where: { courseOfferingId }, include: { questions: true, _count: { select: { answers: true } } }, orderBy: { createdAt: "desc" } });
}

export async function submitSurveyAnswer(actorId: string, surveyId: string, answers: { questionId: string; valueJson: unknown }[]) {
  const limiter = await checkRateLimit(makeRateLimitKey("survey-answer", actorId), 30, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many survey submissions", 429);
  const survey = await db.survey.findUnique({ where: { id: surveyId }, include: { questions: true } });
  if (!survey) throw new AppError("NOT_FOUND", "Survey not found", 404);
  if (!(await canAccessCourseOffering(actorId, survey.courseOfferingId))) throw new PermissionError();
  const now = new Date();
  if (survey.opensAt > now || survey.closesAt < now) throw new AppError("SURVEY_CLOSED", "Survey is not open", 409);
  const hash = respondentHash(actorId, surveyId);
  const previous = await db.surveyAnswer.findFirst({ where: { surveyId, respondentHash: hash } });
  if (previous) throw new AppError("DUPLICATE_SURVEY_RESPONSE", "You already submitted this survey", 409);
  const created = await db.surveyAnswer.createMany({ data: answers.map((a) => ({ surveyId, questionId: a.questionId, respondentId: survey.isAnonymous ? null : actorId, respondentHash: hash, valueJson: a.valueJson as object })) });
  return created;
}

export async function getSurveyResults(actorId: string, surveyId: string) {
  const survey = await db.survey.findUnique({ where: { id: surveyId }, include: { questions: true, answers: true } });
  if (!survey) throw new AppError("NOT_FOUND", "Survey not found", 404);
  await requireCoursePermission(actorId, survey.courseOfferingId, coursePermissions.VIEW_SURVEY_RESULTS);
  const responseCount = new Set(survey.answers.map((a) => a.respondentHash || a.respondentId)).size;
  if (responseCount < survey.minResponses) return { survey: { id: survey.id, title: survey.title }, responseCount, hidden: true, minResponses: survey.minResponses };
  return { survey, responseCount, hidden: false };
}

export async function createAvailabilityPoll(actorId: string, input: { courseOfferingId: string; title: string; description?: string; pollType: "CLASS_TIME" | "OFFICE_HOUR_TIME" | "MAKEUP_CLASS" | "PROJECT_SESSION" | "CUSTOM"; deadline: Date; isAnonymous: boolean; options: { label: string; startsAt?: Date; endsAt?: Date }[] }) {
  await requireCoursePermission(actorId, input.courseOfferingId, coursePermissions.CREATE_SURVEY);
  return db.availabilityPoll.create({ data: { courseOfferingId: input.courseOfferingId, createdById: actorId, title: input.title, description: input.description, pollType: input.pollType, deadline: input.deadline, isAnonymous: input.isAnonymous, status: "OPEN", options: { create: input.options.map((o, orderIndex) => ({ ...o, orderIndex })) } }, include: { options: true } });
}

export async function votePoll(actorId: string, pollId: string, optionId: string) {
  const limiter = await checkRateLimit(makeRateLimitKey("poll-vote", actorId), 60, 60 * 60 * 1000);
  if (!limiter.allowed) throw new AppError("RATE_LIMITED", "Too many votes", 429);
  const poll = await db.availabilityPoll.findUnique({ where: { id: pollId } });
  if (!poll) throw new AppError("NOT_FOUND", "Poll not found", 404);
  if (!(await canAccessCourseOffering(actorId, poll.courseOfferingId))) throw new PermissionError();
  if (poll.status !== "OPEN" || poll.deadline < new Date()) throw new AppError("POLL_CLOSED", "Poll is closed", 409);

  if (poll.isAnonymous) {
    // Anonymous votes must not store the real voterId, or the "anonymous"
    // vote is trivially linkable to the user via this same row. Dedupe by
    // respondentHash instead (backed by a partial unique index in the DB).
    const hash = respondentHash(actorId, pollId);
    const existing = await db.pollVote.findFirst({ where: { pollId, respondentHash: hash } });
    return existing
      ? db.pollVote.update({ where: { id: existing.id }, data: { optionId } })
      : db.pollVote.create({ data: { pollId, optionId, voterId: null, respondentHash: hash } });
  }

  return db.pollVote.upsert({ where: { pollId_voterId: { pollId, voterId: actorId } }, create: { pollId, optionId, voterId: actorId, respondentHash: null }, update: { optionId } });
}
