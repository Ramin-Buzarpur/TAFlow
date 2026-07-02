# TAFlow — TA / Head TA Management System

So this is the full-stack version of a TA management system I've been building. It handles the whole flow: courses, roles, TA hiring, gradebook, messaging, certificates, all of it. It's got a real database, real auth, a proper RTL frontend in Persian, and it's actually tested end-to-end, not just "works on my machine."

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma
- Auth.js (NextAuth) with the Prisma adapter
- Zod for validating stuff on the server
- Argon2id for passwords, TOTP for 2FA, Redis-backed rate limiting (falls back to in-memory if Redis isn't around), and an audit log for anything sensitive
- A small custom CSS design system, fully RTL
- Vitest for unit tests, Playwright for e2e
- Docker Compose for Postgres, MinIO (S3-compatible storage), Mailpit (fake SMTP for local dev), and Redis

## Running it locally

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed
pnpm dev
```

Then just open:

```text
http://localhost:3000        the app itself
http://localhost:9001        MinIO console (see uploaded files here)
http://localhost:8025        Mailpit inbox (see "sent" emails here)
```

## When something breaks

- **`datasource property url is no longer supported`** — this means Prisma got upgraded to v7 somehow and it doesn't like the old-style datasource block. The project needs to stay pinned to `6.19.3` (check `package.json`). Just run `pnpm install` again, and if that doesn't fix it, nuke and reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`.
- **`Ignored build scripts` after `pnpm install`** — that's just pnpm being cautious about native build scripts. Run `pnpm approve-builds --all` once and it'll let Prisma/argon2/sharp build properly.
- **TypeScript yells `Module "@prisma/client" has no exported member ...`** — Prisma client is stale or never got generated. Run `pnpm exec prisma generate` and move on.
- **Port conflicts (5432, 9000-9001, 1025, 8025, 6379)** — if you've already got Postgres/MinIO/Mailpit/Redis running from something else, either stop those or remap the ports in `docker-compose.yml`.
- **Want to wipe the DB and start fresh?** `docker compose down -v && docker compose up -d && pnpm db:migrate --name init && pnpm db:seed` — the `-v` flag also nukes the volume, so the data's really gone.
- **Docker Desktop won't start on Windows** — check that the `com.docker.service` service is actually running (needs admin rights). Open the Docker Desktop app and wait for "Engine running" before doing anything else.
- **First `pnpm install` takes forever** — yeah, that's normal, it's compiling native stuff like `argon2` and `sharp` plus downloading Prisma's engines. It's way faster after that since pnpm caches everything locally.

## Test accounts

Every seeded account uses the same password:

```text
Admin@12345678
```

- `admin@example.edu` — system admin
- `rezai@example.edu` — professor
- `headta@example.edu` — Head TA
- `student@example.edu` — student

The seed script also prints out a sample `courseOfferingId` so you can jump straight into pages like:

```text
/courses/<courseOfferingId>
/gradebook/<courseOfferingId>
/api/exports/roster/<courseOfferingId>
/api/exports/gradebook/<courseOfferingId>
```

## What's actually built

### 1. Auth and sessions

- Email + password login
- Signup
- Email verification
- Forgot password / reset password
- Passwords hashed with Argon2id
- Account lockout after too many failed attempts
- Rate limiting
- TOTP-based 2FA
- Groundwork laid for university SSO / Keycloak
- Session carries `user.id`, `globalRole`, `status`, and `timezone`

### 2. Course / CourseOffering / CourseRoleAssignment

This is really the backbone of the whole app:

- `Course` — the course itself, like "Circuits 1"
- `CourseOffering` — that course taught in a specific semester, with a professor, section, capacity, etc.
- `CourseRoleAssignment` — what role a person has in that specific offering (STUDENT, TA, HEAD_TA, PROFESSOR)

Every permission check reads from the active `CourseRoleAssignment`, never from the client. The frontend doesn't get to decide what you can do.

### 3. TA and Head TA hiring flow

- Professors create and publish TA openings
- Students see the open ones and apply
- No double-applying to the same opening
- Application goes through statuses: SUBMITTED, UNDER_REVIEW, SHORTLISTED, INTERVIEW_INVITED, ACCEPTED, REJECTED, WITHDRAWN
- Professors and Head TAs can review applications
- Interviews get logged
- Accept or reject the application
- Accepting one automatically creates the `CourseRoleAssignment`
- Every status change gets logged (audit log + notification)

### 4. Messaging

- Start a thread tied to a course or a general support question
- Students message TAs, Head TAs, or professors
- Threads get categorized
- Authorized roles can close a thread
- People outside the thread can't see it
- Message text gets sanitized so nobody can sneak in XSS

### 5. Office hours / help sessions

- Professors, Head TAs, or approved TAs can create sessions
- Each session has a meeting link or a physical location, capacity, start/end time
- Won't let the same host double-book themselves
- One-click "join session" button
- Exports an `.ics` file so people can drop it into Google Calendar or Outlook

### 6. Gradebook and CSV exports

- Weighted grade categories
- Won't let weights add up to more than 100%
- Create individual grade items
- Enter/edit grades, with a full history of changes
- Publish grades so students can see them
- Students only ever see their own grades
- Class roster export as CSV (with proper BOM so Persian text doesn't break in Excel)
- Gradebook export as CSV too
- Every entry, publish, and export gets logged

### 7. Surveys and time polls

- Course-scoped surveys
- Supports rating, text, and multiple-choice questions
- Answers are anonymous (hashed respondent ID, not tied to the user directly)
- Minimum response count before results are shown
- Polls for picking class times or session slots
- Can't vote twice

### 8. TA / Head TA certificates

- Checks eligibility first
- TA or Head TA requests a certificate from their panel
- Professor approves it
- Admin office actually issues it
- Comes with a tracking code that's basically impossible to guess
- Public verification page that only shows limited info
- Every approve/reject/issue gets logged

### 9. Announcements and academic calendar

- Announcements at the university, department, or course level
- Priority levels: normal, important, urgent
- Only shows announcements that are live and not expired
- Academic calendar events
- Times stored in UTC, shown to users in Persian locale

### 10. Role-based dashboards

- Student dashboard: applications, sessions, grades, notifications
- Professor/Head TA dashboard: applications, courses, sessions, gradebook
- Admin dashboard: users, offerings, certificates, security events

### 11. Global search / command palette

- Open it with `Ctrl+K` (or `Cmd+K` on Mac)
- Searches courses, openings, sessions, messages, announcements
- Results are filtered by what you're actually allowed to see

## Main routes

```text
GET/POST /api/ta-opportunities
GET/PATCH /api/ta-opportunities/:id
GET/POST /api/ta-opportunities/:id/applications
GET /api/ta-applications
GET /api/ta-applications/:id
PATCH /api/ta-applications/:id/status
POST /api/ta-applications/:id/withdraw
POST /api/ta-applications/:id/interview

GET/POST /api/messages
GET/POST/PATCH /api/messages/:id

GET/POST /api/sessions
GET/PATCH /api/sessions/:id
GET /api/sessions/:id/ics
POST /api/sessions/:id/register (also DELETE to cancel)
GET /api/sessions/:id/registrations
PATCH /api/registrations/:id/attendance

GET /api/gradebook/:courseOfferingId
POST /api/gradebook/categories
POST /api/gradebook/items
POST /api/gradebook/records
POST /api/gradebook/items/:id/publish
PATCH /api/gradebook/items/:id/assign
GET /api/exports/roster/:courseOfferingId
GET /api/exports/gradebook/:courseOfferingId
GET/POST /api/regrade-requests
PATCH /api/regrade-requests/:id/respond

GET/POST /api/surveys
POST /api/surveys/:id/answer
GET /api/surveys/:id/results
POST /api/polls
POST /api/polls/:id/vote

GET/POST /api/certificates
POST /api/certificates/:id/professor-decision
POST /api/certificates/:id/issue
POST /api/certificates/:id/revoke
POST /api/certificates/bulk-issue
GET /api/certificates/verify/:code

GET/POST /api/announcements
GET/POST /api/calendar
GET /api/dashboard
GET /api/search?q=...
GET /api/notifications
POST /api/notifications/:id/read
```

## Frontend pages

```text
/
/dashboard
/opportunities
/opportunities/:id
/applications/:id
/messages
/messages/:id
/sessions
/grades
/gradebook/:courseOfferingId
/surveys
/certificates
/certificates/verify/:code
/announcements
/courses/:courseOfferingId
/courses/:courseOfferingId/tasks
/reports
/admin
```

## Design system

Went for something that feels like a modern school/enterprise dashboard, nothing too flashy:

- Fully RTL
- Rounded cards
- Blue/teal colors, gives it that academic-but-modern feel
- Decent contrast everywhere
- Visible focus states for keyboard nav
- Responsive, works on mobile
- Bento/grid layout for dashboards
- Kept animations light on purpose — no heavy motion on pages where you're staring at tables all day
- Clear status colors: blue, green, red, orange, purple, gray

## Security stuff

- Server-side validation with Zod, everywhere
- Course-scoped RBAC
- Access checks live in the service layer, not just hidden in the UI
- Professors' private notes never leak to students
- Security events and an audit log for anything that matters
- Redis-backed rate limiting on the sensitive routes (auth, file uploads, messaging, TA applications), falls back to in-memory if Redis is down
- 2FA secrets are encrypted
- Never trusts a role that comes from the client
- Sensitive actions get written to the audit log
- Security headers on every response (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy` — see `next.config.mjs`)
- Env vars get validated with Zod at startup (`src/env.ts`), so it fails loud instead of breaking weirdly later
- A partial unique index at the DB level stops two active roles from existing at once, but still keeps the assign/revoke history intact
- DB-level unique constraints backstop the app logic that prevents duplicate survey/evaluation answers

## Tests

### Unit tests

```bash
pnpm test
```

Covers things like:

- Auth and role validation
- Survey anonymity threshold
- TA application status transitions
- Persian CSV with proper BOM
- Basic RBAC and course role checks
- Rate limiting
- File upload validation (type/size limits)

### End-to-end tests (Playwright)

```bash
npx playwright install   # only needed the first time, downloads the browser
pnpm test:e2e
```

Needs a seeded, running database (`docker compose up -d` + `pnpm db:seed`), and `pnpm test:e2e` will spin up the dev server for you if it's not already running. Before the actual tests run, it logs in once per seeded account and saves the session (`tests/e2e/global-setup.ts`), so re-running the suite doesn't trip the login rate limiter. Covers: login/logout for all 4 roles, the whole opening → application → acceptance flow, Head TA's extra access, messaging, professor evaluations and TA surveys, announcements and the admin panel, role-based dashboards, blocked/forbidden access, and RTL/responsive/dark mode.

One thing worth knowing: the suite runs on a single Playwright worker on purpose. Turbopack's dev server compiles routes on the fly in one process, so throwing multiple parallel workers at it causes random timeouts that have nothing to do with actual bugs — they're just compile contention. Single worker keeps it reliable.

## File uploads, email, and PDF certificates

- Real file uploads (resumes, etc.) go to S3-compatible storage (`src/server/storage/s3.ts`, `src/server/services/files.ts`); locally that's MinIO, console at `http://localhost:9001`.
- Real emails (password reset, verification) go out over SMTP (`src/server/email/mailer.ts`); locally that's Mailpit at `http://localhost:8025`.
- Certificates are generated as actual Persian/RTL PDFs and saved to storage (`src/server/certificates/pdf.ts`, using the Vazirmatn font).
- There's a basic scoring/ranking engine for applicants based on review score, interview, and GPA (`src/server/services/scoring.ts`).

## What's not done yet (and why)

- **Full rubric grading / Excel import with row-by-row error previews** — CSV export and the `exceljs` dependency are already there, but a proper import UI with inline error feedback needs its own page and a custom parser. Didn't get to it.
- **Recurring sessions and a real Google Calendar sync** — you get an `.ics` file, but two-way sync with the actual Calendar API needs its own OAuth consent screen and API keys, which is a bigger separate setup.
- **A smarter talent pool / recommendation engine** — right now it's a simple filter-and-score system (`scoring.ts`). Anything learning-based would need way more historical data and its own model.
- **Timesheets, workload balancing, conflict detection** — just outside scope for now, would need new data models and UI.
- **Virus scanning on uploaded files** — needs an external service like ClamAV, not set up in this dev environment.
- **Full Keycloak SSO** — the flag and basic plumbing exist in `auth.ts`, but actually connecting to a real identity provider needs a real Keycloak server and realm.
- **Full CI/CD, complete OpenAPI/Swagger docs, a graphical ERD, a production Dockerfile with backup/restore** — there's lightweight text docs instead (`docs/erd.md`, `docs/api.md`). The production-grade versions of these weren't part of this pass.
- Mixed Persian/Latin text inside certificate PDFs (like an English role code inside a Persian sentence) doesn't reshape perfectly yet — pure Persian text renders fine though.

## What's next

1. Hook up real university SSO (a production Keycloak realm)
2. Excel import with error previews, recurring sessions, real Google Calendar sync
3. Recommendation engine, timesheets, workload analytics
4. Virus scanning, full CI/CD, a production Dockerfile, documented backup/restore
5. Actually deploy it somewhere (VPS or cloud)
