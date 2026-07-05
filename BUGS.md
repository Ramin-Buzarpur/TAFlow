# BUGS.md — باگ‌های پیداشده، رفع‌شده و محدودیت‌های شناخته‌شده

این فایل گزارش صادقانه‌ی باگ‌هایی است که در طول توسعه و ممیزی‌های زنده (تست واقعی در مرورگر با هر چهار نقش، نه فقط typecheck) پیدا و رفع شدند، به‌علاوه‌ی محدودیت‌هایی که آگاهانه باز مانده‌اند.

## باگ‌های رفع‌شده

| # | شرح باگ | ریشه | رفع |
|---|---------|------|-----|
| 1 | صفحه اصلی فقط دکمه «ورود» داشت و مسیر ثبت‌نام از UI قابل دسترسی نبود | در بازطراحی Topbar لینک `/register` حذف شده بود؛ دکمه «خروج» هم اصلاً وجود نداشت | Topbar نسبت به session آگاه شد؛ دکمه‌های ثبت‌نام/ورود/خروج اضافه شدند |
| 2 | ورود admin و استاد همیشه شکست می‌خورد | `.env.example` مقدار `AUTH_ENFORCE_2FA_FOR_STAFF="true"` داشت در حالی که حساب‌های seed هیچ TOTP فعالی ندارند | مقدار پیش‌فرض به `false` برگشت و در README مستند شد |
| 3 | کل build خراب می‌شد و «هیچ صفحه‌ای بالا نمی‌آمد» | `error.tsx` (که طبق قانون Next.js باید Client Component باشد) از `ui.tsx` import می‌کرد که خودش `auth()` را import می‌کرد → کل زنجیره Prisma/Redis/argon2 وارد باندل کلاینت می‌شد | کامپوننت‌های نمایشی به فایل‌های مستقل بدون وابستگی سرور جدا شدند (`primitives.tsx`, `empty-state.tsx`) |
| 4 | رأی «ناشناس» poll واقعاً ناشناس نبود | `votePoll` حتی برای `isAnonymous` مقدار `voterId` واقعی را ذخیره می‌کرد | برای رای ناشناس `voterId = null` ذخیره می‌شود و یکتایی با partial unique index روی `respondentHash` تضمین می‌شود |
| 5 | دانشجویی که درسی را drop می‌کرد دیگر هرگز نمی‌توانست دوباره ثبت‌نام کند | `@@unique([courseOfferingId, studentId])` ساده با `droppedAt` ناسازگار بود | partial unique index فقط روی ردیف‌های فعال (`WHERE "droppedAt" IS NULL`) |
| 6 | بعد از رد شدن درخواست گواهی، درخواست جدید برای همان درس ممکن نبود | unique constraint ساده روی (user, offering, role) | partial unique index فقط روی وضعیت‌های غیر-نهایی |
| 7 | دو ارائه‌ی درس با `section = NULL` می‌توانستند تکراری ساخته شوند | Postgres مقادیر NULL را در unique متمایز می‌داند | ایندکس تابعی روی `COALESCE("section",'')` |
| 8 | لینک «بانک استعدادها» برای دانشجو نمایش داده می‌شد ولی به صفحه‌ی «دسترسی ندارید» می‌خورد | فیلتر نقش در ناوبری نبود | لینک فقط برای PROFESSOR/EDUCATION_ADMIN/SYSTEM_ADMIN نمایش داده می‌شود |
| 9 | Command Palette فقط در ۳ صفحه کار می‌کرد | به‌جای layout ریشه، per-page اضافه شده بود | به `layout.tsx` منتقل شد |
| 10 | دکمه «ایجاد فرصت جدید» به صفحه‌ای اشاره می‌کرد که وجود نداشت (404) | مسیر `/opportunities/new` ساخته نشده بود | صفحه و فرم آن ساخته شد |
| 11 | دکمه‌های ساخت گروه ارتباطی برای Head TA نمایش داده نمی‌شدند | gating روی `MANAGE_COURSE_ROLES` بود که فقط استاد دارد، در حالی که Head TA هم باید بتواند | به `MODERATE_MESSAGES` تغییر کرد (استاد + Head TA) |
| 12 | فرم درخواست TA بعد از خطای اعتبارسنجی، متن انگیزه‌نامه‌ی تایپ‌شده را پاک می‌کرد | رفتار فرم-ریست React 19 روی `<form action>`: حتی خروج زودهنگام از action هم فیلدهای uncontrolled را ریست می‌کند | فیلد به controlled input تبدیل شد |
| 13 | session قدیمی بعد از تغییر رمز عبور همچنان معتبر می‌ماند | استراتژی JWT است؛ پاک‌کردن جدول `Session` روی JWTهای صادرشده اثری ندارد و callback `jwt` مقدار `passwordChangedAt` را چک نمی‌کرد | زمان login در token ثبت می‌شود و حداکثر هر ۶۰ ثانیه با DB مقایسه می‌شود؛ تغییر رمز یا تعلیق حساب، session را حداکثر ظرف یک دقیقه باطل می‌کند |
| 14 | `GradeItem.lockedAt` در schema بود ولی هیچ‌جا enforce نمی‌شد | فیلد بدون منطق | ویرایش نمره، import اکسل و اصلاح نمره از مسیر تجدیدنظر روی آیتم قفل‌شده با `GRADE_ITEM_LOCKED` (409) رد می‌شوند؛ endpoint و دکمه‌ی قفل/باز اضافه شد |
| 15 | می‌شد فرصت TA ساخت که `opensAt` آن بعد از `deadline` بود (هیچ‌وقت باز نمی‌شد) | نبود اعتبارسنجی ترتیب | `superRefine` در schema: `opensAt < deadline` و `deadline` در آینده |
| 16 | جدول `Semester` تنها مدل بازه‌دار بدون CHECK دیتابیس بود | جا افتاده بود | `CHECK ("endsAt" > "startsAt")` |

## رفتارهایی که باگ نیستند (ولی شبیه باگ به نظر می‌رسند)

- **کندی بار اول هر صفحه در `pnpm dev`**: کامپایل on-demand در Turbopack است (۱۰ تا ۳۰ ثانیه بار اول، بعد زیر ۴۰۰ms). برای سرعت واقعی از `pnpm build && pnpm start` استفاده کنید.
- **خطای گاه‌به‌گاه «module factory not available» در dev**: artifact شناخته‌شده‌ی HMR در Turbopack هنگام ویرایش هم‌زمان فایل‌هاست؛ با یک refresh رفع می‌شود. اگر ماندگار شد، پوشه‌ی `.next` را پاک کنید.
- **404 شدن همه‌ی مسیرها بعد از تغییر schema**: کش کهنه‌ی Turbopack؛ راه‌حل: توقف dev server، حذف `.next` و اجرای مجدد.

## محدودیت‌های شناخته‌شده (آگاهانه انجام نشده، با دلیل)

- **SSO/Keycloak کامل**: زیرساخت env-driven در `auth.ts` هست ولی فعال‌سازی نیازمند IdP واقعی است.
- **اسکن ویروس فایل‌ها**: نیازمند سرویس خارجی (ClamAV و مشابه)؛ whitelist نوع فایل + سقف حجم + storage ایزوله پیاده شده است.
- **تشخیص سرقت ادبی (plagiarism)**: نیازمند سرویس خارجی.
- **جلسات تکرارشونده و waitlist**: خارج از scope فعلی؛ مدل داده اجازه‌ی افزودن بعدی را می‌دهد.
- **پیوست فایل به پیام‌ها**: sanitize و rate-limit پیام هست؛ پیوست به دور بعدی موکول شد.
- **Timesheet و workload analytics و recommendation engine**: حجم مستقل بزرگ.
- **محافظت DDoS لایه شبکه**: مسئله‌ی زیرساخت (CDN/WAF) است نه کد اپلیکیشن؛ در `SECURITY_NOTES.md` توضیح داده شده.

## Phase 0 baseline - 2026-07-05

### Fixed

| Severity | Finding | Resolution |
|---|---|---|
| Critical | `src/server/services/files.ts` and `src/app/api/health/route.ts` imported `@/server/storage/s3`, but the storage adapter did not exist. This broke `pnpm typecheck` and any file/certificate path that needed storage. | Added a real S3-compatible adapter for MinIO/S3 with put, signed download URL, delete, health check, and local-development bucket creation on first upload. |
| Medium | Unit tests imported server code that validates environment variables, but Vitest did not provide safe local test env values. | Added a Vitest setup file with non-secret local test values. Production env validation remains active. |
| Low | `.gitignore` ignored every directory named `storage`, including source code under `src/server/storage`. | Restricted the local artifact ignore rule to `/storage/`. |
| High | The full E2E suite could exhaust the default Node heap in the Next.js dev server, then cascade into auth/API/database-looking failures. | `pnpm test:e2e` now runs through a repository-level Node runner that starts Next with a 6144 MB heap, waits for readiness, runs Playwright, preserves test failures, and tears down the server process tree cross-platform. |
| Medium | A successful E2E run could leave Playwright waiting for web-server shutdown instead of exiting cleanly. | The E2E runner owns the server lifecycle directly and the Playwright config can skip its internal webServer when invoked by the runner. |
| Low | E2E output was flooded by Prisma query logs from the dev server. | Query logging remains available in normal development but is disabled for the E2E runner; Prisma errors still log. |
| Low | `/api/health` could report storage as degraded in local development before the MinIO bucket had been created. | The storage health check now follows the same non-production bucket-creation behavior as uploads. |

### Validated after Docker was restored

| Check | Result | Notes |
|---|---|---|
| `docker compose ps` | PASS | PostgreSQL, Redis, MinIO, and Mailpit are healthy. |
| `pnpm db:migrate` | PASS | Schema already in sync; Prisma Client generated. |
| `pnpm db:seed` | PASS | Seed completed against local Postgres. |
| `pnpm typecheck` | PASS | TypeScript validation completed. |
| `pnpm lint` | PASS | ESLint completed. |
| `pnpm test` | PASS | 10 files, 33 tests. |
| `pnpm build` | PASS | Production build completed. |
| `pnpm test:e2e` | PASS | Normal documented command completed successfully: 23 passed. |

## Phase 2 database constraint validation - 2026-07-05

### Fixed / added coverage

| Severity | Finding | Resolution |
|---|---|---|
| High | Raw SQL database constraints and partial unique indexes existed in migrations, but there was no DB-backed regression suite proving they still reject invalid data after future schema changes. | Added `pnpm test:integration` with isolated temporary data that exercises real PostgreSQL constraints and indexes. |
| High | Active-only history rules for enrollments, course roles, certificate requests, and regrade requests could regress silently if a migration dropped a partial unique index. | The integration suite now verifies both sides of each rule: duplicate active rows are rejected, while terminal/dropped/revoked history permits a fresh row. |
| Medium | Anonymous poll and survey respondent dedupe depended on database uniqueness semantics that were not validated outside service-level logic. | The integration suite now verifies anonymous poll vote dedupe by respondent hash and survey answer dedupe by survey/question/respondent hash. |

### Validated

| Check | Result | Notes |
|---|---|---|
| `pnpm test:integration` | PASS | 1 file, 8 tests. Validates semester and office-hour date ranges, grade bounds, nullable-section course offering uniqueness, active enrollment/course-role history, anonymous poll votes, survey answers, certificate requests, and regrade requests. |

### Remaining known gap

- `GradeRecord.score >= 0` is enforced at the database layer. `GradeRecord.score <= GradeItem.maxScore` still needs a durable policy decision and implementation because the upper bound depends on a related `GradeItem` row.

## Phase 2 authorization validation - 2026-07-05

### Fixed / added coverage

| Severity | Finding | Resolution |
|---|---|---|
| High | E2E permission coverage only checked a small number of protected APIs and allowed one certificate path to pass as either 403 or 404, which did not tightly prove permission denial. | Expanded `tests/e2e/permissions.spec.ts` with exact 403 assertions and `PERMISSION_DENIED` response checks. |
| High | Student escalation attempts against course role assignment, gradebook management, TA opportunity creation, and roster export were not covered by API-level E2E regression tests. | Added student negative tests that use real authenticated sessions and real course offering IDs returned by `/api/course-offerings/mine`. |
| High | Head TA has elevated course permissions, but the no-role-management boundary was only covered by unit-level permission enum tests. | Added an authenticated Head TA E2E test proving `/api/course-offerings/:id/roles` returns 403. |

### Validated

| Check | Result | Notes |
|---|---|---|
| `pnpm test:e2e tests/e2e/permissions.spec.ts` | PASS | 8 tests. Validates server-side 403 behavior for student, Head TA, and unauthenticated access paths. |

### Remaining known gap

- Cross-course authorization still needs deeper regression tests: a user who can act in one course must be denied when attempting the same action in another course where they lack the role.

## Phase 2 cross-course authorization validation - 2026-07-05

### Fixed / added coverage

| Severity | Finding | Resolution |
|---|---|---|
| Critical | Course-scoped list endpoints could expose rows from courses where the caller had no active role when the request omitted `courseOfferingId`. | Unfiltered office-hour sessions, announcements, and academic calendar events are now restricted to the caller's accessible course offerings, while global/admin-visible non-course rows remain visible. |
| High | Course A roles were not covered by an E2E regression suite that proved they cannot be reused against Course B resources. | Added `tests/e2e/cross-course-authorization.spec.ts`, which creates an isolated Course B through admin APIs and verifies professor, Head TA, and student denials against protected Course B resources, including course material files. |
| High | Head TA elevated Course A permissions needed explicit negative coverage for Course B gradebook, roster, role management, sessions, surveys, and polls. | Added API-level E2E assertions that these calls return `PERMISSION_DENIED` for Course B while allowed Course A gradebook/roster access still works. |

### Validated

| Check | Result | Notes |
|---|---|---|
| `pnpm test:e2e tests/e2e/cross-course-authorization.spec.ts` | PASS | 6 tests. Validates global admin success, professor Course A to Course B denial, Head TA Course A to Course B denial, student Course A to Course B private-resource denial, course material file isolation, and no unfiltered session/announcement/calendar leakage. |

### Remaining known gap

- Application resume file isolation and file delete ownership still need dedicated E2E coverage.
