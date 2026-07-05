# TAFlow implementation status

This file tracks implementation state against `10.tex` and the real repository.

## Baseline

- Repository: `D:\TAFlow\TAFlow`
- Branch verified: `development`
- Upstream verified: `origin/development`
- Package manager: `pnpm@11.9.0`
- Primary specification: `10.tex`
- Secondary reference: `10.pdf`

## Phase 0 - Baseline and stabilization

| Area | Status | Evidence |
|---|---|---|
| Dependency installation | COMPLETE | `pnpm install` completed successfully with lockfile already up to date. |
| Prisma client generation | COMPLETE | `pnpm db:generate` completed successfully after Prisma engine download was allowed. |
| S3/MinIO storage adapter | COMPLETE | `src/server/storage/s3.ts` now provides the storage functions already referenced by file services and health checks. |
| TypeScript validation | COMPLETE | `pnpm typecheck` passed after restoring the storage adapter. |
| Lint validation | COMPLETE | `pnpm lint` passed. |
| Unit tests | COMPLETE | `pnpm test` passed: 10 files, 33 tests. |
| Production build | COMPLETE | `pnpm build` passed with local non-secret environment values. |
| Docker services | COMPLETE | `docker compose ps` shows PostgreSQL, Redis, MinIO, and Mailpit healthy. |
| Database migrate/seed | COMPLETE | `pnpm db:migrate` and `pnpm db:seed` passed against local Postgres. |
| End-to-end tests | COMPLETE | `pnpm test:e2e` passed through the normal project command: 23 passed. |
| E2E heap stability | COMPLETE | `pnpm test:e2e` now starts the Next dev server with a repository-managed heap limit instead of requiring shell-specific environment setup. |

## Current priority matrix

| Requirement group | Status | Notes |
|---|---|---|
| Authentication core | COMPLETE | Auth validation, password hashing, account lockout, password reset token behavior, email verification token behavior, and staff 2FA policy are covered by unit/integration validation. |
| Email verification UX | PARTIAL | Register/verify/resend APIs exist; dedicated UI flow still needs completion. |
| Password reset UX | PARTIAL | API exists; dedicated UI flow still needs completion. |
| TOTP 2FA UX | PARTIAL | Backend/API exist; setup/verification UI still needs completion. |
| Course-scoped RBAC | COMPLETE | Service-layer permission model is covered by API-level E2E tests, including cross-course isolation. |
| TA hiring workflow | COMPLETE_BUT_UNVERIFIED | Core workflow exists; file upload dependency is now restored. |
| Storage and uploads | COMPLETE | Adapter and MinIO health path are validated; file upload, attachment ownership, download authorization, object-key handling, and delete ownership are covered by E2E file-security regression tests. |
| Certificates and PDF persistence | COMPLETE_BUT_UNVERIFIED | Storage dependency restored; certificate issue/verify still needs deeper functional coverage beyond the current E2E suite. |
| Docker-backed local QA | COMPLETE | Docker-backed baseline validation now passes locally. |

## Phase 2 - Database and security hardening

| Area | Status | Evidence |
|---|---|---|
| Raw SQL constraint tests | COMPLETE | `pnpm test:integration` validates DB-level rejection for invalid semester and office-hour ranges, invalid grade bounds, negative grade records, and nullable-section course offering uniqueness. |
| Partial unique index tests | COMPLETE | `pnpm test:integration` validates active enrollment history, active course-role history, anonymous poll vote dedupe, certificate request in-flight uniqueness, and open regrade request uniqueness. |
| Survey respondent dedupe | COMPLETE | `pnpm test:integration` validates one answer per survey/question/respondent hash at the database layer. |
| Grade score upper bound | OPEN | The database enforces `score >= 0`; `score <= GradeItem.maxScore` is still not a database-level invariant because it depends on a related table value. |
| Permission escalation API tests | COMPLETE | `pnpm test:e2e tests/e2e/permissions.spec.ts` validates 403 responses for student admin access, self role assignment, gradebook category management, TA opportunity creation, roster export, Head TA role assignment, and unauthenticated protected API access. |
| Cross-course authorization tests | COMPLETE | `pnpm test:e2e tests/e2e/cross-course-authorization.spec.ts` validates Course A roles do not grant Course B gradebook, roster, role management, sessions, surveys, polls, announcements, calendar, file download, or course material upload access; unfiltered session/announcement/calendar lists are scoped to accessible courses. |
| Broad unfiltered course lists | COMPLETE | `listOfficeHours`, `listAnnouncements`, and `listAcademicEvents` now restrict course-scoped rows to active course assignments or global admin access when no course filter is supplied. |
| Phase 2 authentication deep coverage | COMPLETE | `pnpm test` covers the staff 2FA policy; `pnpm test:integration` covers email verification hashing/expiry/single-use/resend/rate limit and password reset hashing/expiry/single-use/session invalidation. |
| File access cross-course coverage | COMPLETE | The cross-course E2E suite verifies Course B material files are downloadable by global admin and denied to Course A professor, Head TA, and student; it also verifies Course A professor cannot attach a file as Course B material. |
| File access deep coverage | COMPLETE | `tests/e2e/file-security.spec.ts` validates application resume isolation, arbitrary fileId denial, cross-course resume/material denial, authorized reviewer/applicant/admin access, delete ownership, server-generated object keys, and CourseMaterial delete behavior. |

## Phase 2 authentication/account-security validation - 2026-07-05

### Fixed / added coverage

| Severity | Finding | Resolution |
|---|---|---|
| High | Pending email verification accounts had one-shot verification tokens, but there was no resend API and no regression test proving token hashing, expiry, single-use behavior, or safe handling of unknown accounts. | Added `/api/auth/resend-verification`, backed by `resendVerificationEmail`, with per-email rate limiting, generic responses for non-actionable accounts, old-token replacement, and integration coverage. |
| High | Password reset tokens were implemented, but expiry, single-use behavior, stored-session invalidation, and safe unknown-email handling were not covered by integration tests. | Added DB-backed integration coverage for hashed reset tokens, invalid/expired token rejection, password hash replacement, lockout reset, stored session deletion, and token reuse rejection. |
| Medium | Mandatory staff 2FA policy was embedded inside the NextAuth credentials provider and not directly testable. | Extracted `staffRoleRequiresTwoFactor` and added unit coverage proving seeded staff accounts are not locked out unless `AUTH_ENFORCE_2FA_FOR_STAFF` is explicitly enabled. |
| Medium | Security documentation claimed TOTP recovery codes were stored hashed, but the service does not generate or consume recovery codes. | Corrected the security checklist: recovery codes are not implemented yet; production must add a hashed recovery-code/admin-reset path before broad mandatory 2FA rollout. |

### Validated

| Check | Result | Notes |
|---|---|---|
| `pnpm test` | PASS | 10 files, 35 tests. Includes staff 2FA policy coverage. |
| `pnpm test:integration` | PASS | 2 files, 14 tests. Includes DB-backed auth token and session invalidation coverage. |

### Remaining known gap

- Dedicated UI pages for resend verification, forgot password, reset password, and 2FA enrollment are still incomplete.
- TOTP recovery codes are not implemented; the schema has a placeholder field, but there is no production-ready recovery-code workflow yet.

## Phase 2 file access security and ownership - 2026-07-05

### Fixed / added coverage

| Severity | Finding | Resolution |
|---|---|---|
| Critical | File download authorization used visibility before fully evaluating the owning business entity, so an attached sensitive file could become too broadly accessible if its visibility was set incorrectly. | Download authorization is now attachment-first for application resumes, course materials, task submissions, assignment submissions, certificate PDFs, and certificate templates before any signed URL is generated. |
| Critical | TA application resumes were not covered by E2E isolation tests, and resume attachment accepted arbitrary file IDs owned by any user. | Application submission now requires the resume file to be owned by the applicant, not deleted, and not already attached elsewhere; E2E tests prove Student A, Course A professor, and Course A Head TA cannot access Course B/student B resumes. |
| High | Course material attachment trusted a submitted `fileId` after course permission, allowing a course manager to attach a file they did not upload. | Course material attachment now requires an owned, unattached file and promotes visibility server-side after attachment. |
| High | Generic file deletion only checked owner/admin and did not understand protected parent entities. | File deletion is now attachment-aware: CourseMaterial deletion requires `MANAGE_COURSE_MATERIALS`; other protected attachments must be deleted through their parent workflow. Unattached files remain owner/admin deletable. |
| High | Upload API responses exposed internal `storageKey`, and client-submitted visibility was accepted by the generic upload endpoint. | Generic upload always stores files as private unless server-side workflows promote them; upload/list responses no longer expose `storageKey` or checksum metadata. |
| Medium | Task and assignment submissions accepted arbitrary file IDs from the submitter request. | Submission workflows now require the submitted file to be owned by the actor and unattached, then promote visibility server-side after successful attachment. |

### Validated

| Check | Result | Notes |
|---|---|---|
| `pnpm test:e2e tests/e2e/file-security.spec.ts` | PASS | 9 tests. Covers resume isolation, arbitrary fileId denial, cross-course reviewer denial, authorized reviewer/applicant/admin access, delete ownership, object-key non-disclosure/sanitization, and authorized CourseMaterial deletion. |

### Remaining known limitations

- Uploaded-but-unattached files remain in storage until the owner deletes them; there is no scheduled orphan cleanup job yet.
- Parent-entity deletion relies on current Prisma cascade/set-null behavior and does not automatically remove every backing object from S3/MinIO.
- If object deletion succeeds but the following metadata update fails, a DB row may point at a missing object; if object deletion fails first, metadata remains active. A full outbox/cleanup worker is not implemented.
- Antivirus/malware scanning is still not implemented; current validation is MIME allow-list, file-size limit, non-empty file rejection, server-generated object keys, and signed-download authorization.
