-- DropIndex
DROP INDEX "CourseRoleAssignment_courseOfferingId_userId_role_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "timezone" SET DEFAULT 'Asia/Tehran';

-- CreateIndex
CREATE UNIQUE INDEX "ProfessorEvaluation_courseOfferingId_respondentHash_key" ON "ProfessorEvaluation"("courseOfferingId", "respondentHash");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyAnswer_surveyId_questionId_respondentHash_key" ON "SurveyAnswer"("surveyId", "questionId", "respondentHash");

-- CreateIndex
CREATE UNIQUE INDEX "TAEvaluation_courseOfferingId_taUserId_respondentHash_key" ON "TAEvaluation"("courseOfferingId", "taUserId", "respondentHash");

-- Partial unique index: only one *active* (non-revoked) role per
-- course-offering/user/role triple. Revoked rows are kept as history and are
-- excluded from this constraint, so assign -> revoke -> reassign no longer
-- collides or destroys history the way a plain @@unique did.
CREATE UNIQUE INDEX "course_role_active_unique"
ON "CourseRoleAssignment" ("courseOfferingId", "userId", "role")
WHERE "revokedAt" IS NULL;

-- Data integrity checks that don't need application round-trips.
ALTER TABLE "GradeRecord" ADD CONSTRAINT "grade_record_score_non_negative" CHECK ("score" >= 0);

ALTER TABLE "OfficeHourSession" ADD CONSTRAINT "office_hour_session_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "Interview" ADD CONSTRAINT "interview_valid_range" CHECK ("endsAt" > "startsAt");

ALTER TABLE "AcademicCalendarEvent" ADD CONSTRAINT "academic_calendar_event_valid_range" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");
