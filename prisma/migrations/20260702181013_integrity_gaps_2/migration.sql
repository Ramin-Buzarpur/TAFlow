-- Enum for RegradeRequest.status (was a plain String)
CREATE TYPE "RegradeRequestStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED');

-- Convert the column in place with a cast, preserving existing data
-- (values already match the enum labels exactly).
ALTER TABLE "RegradeRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "RegradeRequest" ALTER COLUMN "status" TYPE "RegradeRequestStatus" USING ("status"::"RegradeRequestStatus");
ALTER TABLE "RegradeRequest" ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- Drop plain unique constraints that incorrectly assumed NULL columns are
-- comparable, or that blocked legitimate re-attempts after a terminal state.
-- Each is replaced by either a plain index (for query performance) or a
-- partial unique index (for the real invariant) below.
DROP INDEX "CertificateRequest_userId_courseOfferingId_role_key";
DROP INDEX "CourseEnrollment_courseOfferingId_studentId_key";
DROP INDEX "CourseOffering_courseId_semesterId_professorId_section_key";

CREATE INDEX "CertificateRequest_userId_courseOfferingId_role_idx" ON "CertificateRequest"("userId", "courseOfferingId", "role");
CREATE INDEX "CourseEnrollment_courseOfferingId_studentId_idx" ON "CourseEnrollment"("courseOfferingId", "studentId");
CREATE INDEX "CourseOffering_courseId_semesterId_professorId_idx" ON "CourseOffering"("courseId", "semesterId", "professorId");
-- RegradeRequest_studentId_status_idx already exists (created by the initial
-- migration's @@index([studentId, status])) and still works fine after the
-- column's type change to an enum, so it's left untouched.

-- PollVote: anonymous votes (voterId IS NULL) are deduped by respondentHash
-- instead, since Postgres treats every NULL as distinct in a plain unique
-- constraint.
CREATE UNIQUE INDEX "poll_vote_anon_unique" ON "PollVote" ("pollId", "respondentHash") WHERE "respondentHash" IS NOT NULL;

-- CourseOffering: section is nullable; COALESCE it so two offerings with
-- section = NULL for the same course/semester/professor still collide.
CREATE UNIQUE INDEX "course_offering_unique" ON "CourseOffering" ("courseId", "semesterId", "professorId", COALESCE("section", ''));

-- CourseEnrollment: only one *active* enrollment at a time, but dropped
-- enrollments stay as history instead of blocking re-enrollment.
CREATE UNIQUE INDEX "course_enrollment_active_unique" ON "CourseEnrollment" ("courseOfferingId", "studentId") WHERE "droppedAt" IS NULL;

-- CertificateRequest: only one *in-flight* request at a time per
-- user/course/role. REJECTED and REVOKED requests stay as history and don't
-- block a fresh attempt.
CREATE UNIQUE INDEX "certificate_request_active_unique" ON "CertificateRequest" ("userId", "courseOfferingId", "role") WHERE "status" IN ('DRAFT', 'SUBMITTED', 'PROFESSOR_APPROVED', 'EDUCATION_APPROVED', 'ISSUED');

-- RegradeRequest: DB-level backstop for the app-level "one OPEN request per
-- grade/student" check in createRegradeRequest (guards the check-then-insert race).
CREATE UNIQUE INDEX "regrade_request_open_unique" ON "RegradeRequest" ("gradeRecordId", "studentId") WHERE "status" = 'OPEN';

-- Grade weight/max-score sanity bounds.
ALTER TABLE "GradeCategory" ADD CONSTRAINT "grade_category_weight_range" CHECK ("weight" >= 0 AND "weight" <= 100);
ALTER TABLE "GradeCategory" ADD CONSTRAINT "grade_category_max_score_positive" CHECK ("maxScore" > 0);
ALTER TABLE "GradeItem" ADD CONSTRAINT "grade_item_max_score_positive" CHECK ("maxScore" > 0);
