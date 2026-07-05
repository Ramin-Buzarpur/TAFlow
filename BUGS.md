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

### Still blocked by local environment

| Severity | Finding | Exact reason |
|---|---|---|
| High | `docker compose up -d` could not start local services. | Docker daemon was not reachable: `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`. |
| High | Database migration and seed could not be validated against a local Postgres instance. | The Docker-provided Postgres service could not be started because Docker Desktop/daemon is unavailable. |
| High | `pnpm test:e2e` could not complete. | Playwright started the app, but login flows failed because Prisma could not reach Postgres at `localhost:5432`; the run was stopped after repeated identical database-connection failures. |
