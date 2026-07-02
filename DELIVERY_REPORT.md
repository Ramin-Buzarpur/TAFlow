# گزارش تحویل — اجرای چک‌لیست ۷۵ موردی (`taflow_claude_prompt_full`)

این گزارش خروجی اجرای پلن `swift-knitting-bentley` است: تثبیت زیرساخت، اصلاح دیتابیس، Auth/امنیت،
تکمیل workflowهای محصولی منتخب، بازطراحی UI/UX، و تست/مستندسازی نهایی.

## ۱. خلاصه‌ی تغییرات به تفکیک فاز

**فاز ۱ — زیرساخت:** سوییچ کامل از npm به pnpm (`packageManager: "pnpm@11.9.0"`, `pnpm-lock.yaml`، حذف `package-lock.json`)، pin دقیق نسخه‌های حیاتی (`next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `next-auth`, `typescript`, `zod` بدون `^`)، افزودن بخش «رفع اشکال نصب و اجرا» به README.

**فاز ۲ — دیتابیس:** partial unique index برای نقش فعال (`course_role_active_unique`)، یکتاسازی پاسخ نظرسنجی/ارزشیابی بر پایه‌ی `respondentHash`، CHECK constraint روی بازه‌های تاریخ و نمره، تغییر timezone پیش‌فرض به `Asia/Tehran`، seed کاملاً idempotent (قابل اجرای مکرر بدون خطا).

**فاز ۳ — Auth/RBAC/امنیت:** rate limiting مبتنی بر Redis (با fallback به in-memory)، security headers کامل (CSP/HSTS/X-Frame-Options/...)، اعتبارسنجی env با Zod (`src/env.ts`)، یکسان‌سازی پاسخ خطا/موفقیت در تمام روت‌های auth، تست‌های واحد escalation/permission.

**فاز ۴ — Workflowهای محصولی منتخب:** QR + revoke + bulk-issue برای گواهی، ثبت‌نام/حضور و غیاب در جلسات رفع اشکال، شمارنده‌ی پیام خوانده‌نشده، تخصیص grade item به TA مشخص با enforcement، درخواست تجدیدنظر نمره (Regrade Request) با گردش‌کار کامل.

**فاز ۵ — UI/UX:** هوم‌پیج بازطراحی‌شده (text-flip hero، شمارنده‌های متحرک، reveal-on-scroll، تایم‌لاین گردش‌کار) با `motion`/`aos`، احترام کامل به `prefers-reduced-motion`، نمایش کمکی تاریخ شمسی کنار date-picker میلادی در فرم‌های جلسه و ترم تحصیلی، اصلاح ریسپانسیو کانبان (اسکرول افقی در موبایل به‌جای فشرده‌شدن ستون‌ها)، audit حالت تاریک، Skeleton loading برای صفحات گزارش‌ها و ادمین، تایید نهایی permission-aware بودن Command Palette.

**فاز ۶ — تست/مستندسازی:** رفع یک race condition در تست e2e پیش‌موجود، تثبیت پیکربندی Playwright (تک‌ورکر، چون Turbopack dev-server تک‌پردازه است و کامپایل هم‌زمان چند مسیر باعث timeout کاذب می‌شد)، اجرای کامل `pnpm build` (تا این لحظه فقط `next dev` تست شده بود)، تکمیل `docs/api.md` و `docs/erd.md`.

## ۲. فایل‌های تغییرکرده / جدید

فهرست کامل از `git status --porcelain` (۷۰ فایل):

**تغییریافته (M):** `.env.example`, `README.md`, `docker-compose.yml`, `docs/api.md`, `next.config.mjs`, `package.json`, `playwright.config.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/app/admin/ui.tsx`, ۷ روت زیر `api/auth/*`، ۲ روت زیر `api/course-offerings/.../roles*`، `src/app/dashboard/page.tsx`, `src/app/globals.css`, `src/app/grades/page.tsx`, `src/app/messages/page.tsx`, `src/app/page.tsx`, `src/app/sessions/{page,ui}.tsx`, `src/components/{kanban,ui}.tsx`, `src/server/auth/{auth,rate-limit}.ts`, `src/server/certificates/pdf.ts`, `src/server/db.ts`, `src/server/services/{certificates,course-roles,dashboard,files,gradebook,messaging,office-hours,password-reset,ta-workflow,users}.ts`, `src/server/validation/auth.ts`, `tests/e2e/calendar-announcements.spec.ts`, `tests/unit/rate-limit.test.ts`.

**حذف‌شده:** `package-lock.json` (جایگزین با `pnpm-lock.yaml`).

**جدید:** `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `docs/erd.md`, ۲ پوشه‌ی migration (`integrity_constraints`, `product_workflows`), `src/env.ts`, `src/components/{jalali-hint,skeleton}.tsx`, `src/components/marketing/*` (text-flip, animated-counter, reveal, aos-provider), `src/app/{admin,reports}/loading.tsx`, `src/app/grades/ui.tsx`, `src/app/certificates/verify/[code]/page.tsx`, روت‌های جدید API (`certificates/[id]/revoke`, `certificates/bulk-issue`, `gradebook/items/[id]/assign`, `registrations/[id]/attendance`, `regrade-requests`, `sessions/[id]/register`, `sessions/[id]/registrations`), `tests/unit/permission-escalation.test.ts`.

## ۳. Migrationهای اضافه‌شده

- `prisma/migrations/20260701231150_integrity_constraints/migration.sql` — partial unique index نقش فعال، حذف unique index قدیمی، تغییر پیش‌فرض timezone، یکتاسازی پاسخ نظرسنجی/ارزشیابی، CHECK constraint نمره/بازه‌ی تاریخ.
- `prisma/migrations/20260701233000_product_workflows/migration.sql` — `GradeItem.assigneeId`، فیلدهای revoke روی `TACertificate`، جداول `OfficeHourRegistration` و `RegradeRequest`.

هر دو با `prisma migrate deploy` روی دیتابیس dev اعمال و تایید شده‌اند (seed دوبار بدون خطا اجرا شد).

## ۴. Dependencyهای اضافه/حذف‌شده

**اضافه:** `aos`, `motion`, `ioredis`, `qrcode`, `@types/aos`, `@types/qrcode`.
**حذف:** هیچ dependency‌ای حذف نشده؛ فقط `package-lock.json` با `pnpm-lock.yaml` جایگزین شد.
**Pin بدون caret:** `next`, `react`, `react-dom`, `prisma`, `@prisma/client`, `next-auth`, `typescript`, `zod`.

## ۵. نتیجه‌ی تست‌ها

| دستور | نتیجه |
|---|---|
| `pnpm run typecheck` | ✅ بدون خطا |
| `pnpm run lint` | ✅ بدون خطا |
| `pnpm test` (Vitest) | ✅ ۳۳/۳۳ تست واحد |
| `pnpm run build` | ✅ build تولید موفق، ۵۷ روت، بدون خطای TypeScript (اولین بار در این پروژه `next build` واقعی اجرا شد، نه فقط `next dev`) |
| `pnpm run test:e2e` (Playwright) | ✅ ۲۳/۲۳ تست e2e، پس از تثبیت پیکربندی تک‌ورکر |

نکته‌ی مهم دیباگ: اجرای اولیه‌ی e2e با چند worker موازی روی `next dev`/Turbopack باعث timeout کاذب در تست‌های نامرتبط می‌شد (کامپایل هم‌زمان چند مسیر تازه در یک پردازه‌ی dev-server). با تنظیم `workers: 1` در `playwright.config.ts` (به‌جای پیش‌فرض CPU-count) کاملاً پایدار شد. یک race condition واقعی و پیش‌موجود هم در `calendar-announcements.spec.ts` پیدا و رفع شد (`waitForURL` بعد از `window.location.reload()` زودتر از پایان reload برمی‌گشت؛ با `Promise.all([waitForNavigation(), click()])` رفع شد).

## ۶. موارد باقی‌مانده (آگاهانه، با دلیل)

جزئیات کامل در بخش «محدودیت‌های فعلی» در [README.md](README.md) آمده؛ خلاصه:

- Rubric grading کامل، Excel import با preview خطا — CSV/`exceljs` آماده است، UI کامل import در scope نبود.
- Recurring sessions، اتصال واقعی Google Calendar API — نیازمند OAuth consent و کلید خارجی.
- Talent Pool پیشرفته و Recommendation Engine هوشمند — نسخه‌ی فعلی امتیازدهی ساده دارد (`scoring.ts`).
- Timesheet + Workload balancing + Conflict detection — خارج از scope این تحویل.
- Virus scanning فایل — نیازمند سرویس خارجی (ClamAV یا مشابه).
- تکمیل SSO/Keycloak — flag و ساختار پایه موجود است؛ اتصال به IdP واقعی نیاز به realm واقعی دارد.
- CI/CD کامل، OpenAPI/Swagger کامل، ERD گرافیکی، Dockerfile production + backup/restore — مستندسازی حداقلی/متنی انجام شد (`docs/erd.md`, `docs/api.md`)؛ نسخه‌ی production-grade در scope نبود.
- بازتولید bidi/reshaping فارسی برای متن ترکیبی فارسی-لاتین در PDF گواهی هنوز کامل نیست (متن خالص فارسی درست است).

## ۷. دستور اجرای کامل از صفر (Windows PowerShell)

```powershell
# ۱. پیش‌نیاز: Docker Desktop روشن باشد، Node.js 22+ نصب باشد.
npm install -g pnpm

# ۲. کلون/ورود به پوشه‌ی پروژه
cd E:\TAFlow

# ۳. متغیرهای محیطی (اگر .env ندارید)
Copy-Item .env.example .env

# ۴. بالا آوردن سرویس‌های زیرساختی (Postgres, MinIO, Mailpit, Redis)
docker compose up -d

# ۵. نصب dependencyها (بار اول کند است چون argon2/sharp/Prisma engine کامپایل می‌شوند)
pnpm install
pnpm approve-builds --all   # اگر پیام "Ignored build scripts" دیدید

# ۶. تولید Prisma client و اجرای migrationها
pnpm exec prisma generate
pnpm exec prisma migrate deploy

# ۷. seed داده‌های اولیه (ایمن برای اجرای مکرر)
pnpm db:seed

# ۸. اجرای سرور توسعه
pnpm dev
# سپس http://localhost:3000 را باز کنید.

# --- تست‌ها (اختیاری) ---
pnpm test           # تست‌های واحد
pnpm run build       # build تولید
pnpm run test:e2e    # تست‌های e2e (نیاز به سرور dev seed‌شده؛ خودش سرور را بالا می‌آورد اگر روشن نباشد)
```

حساب‌های seed برای ورود: `admin@example.edu`, `rezai@example.edu`, `headta@example.edu`, `student@example.edu` — رمز عبور همه: `Admin@12345678`.

## ۸. نکات استقرار (Production)

- **متغیرهای محیطی حیاتی:** `DATABASE_URL`, `AUTH_SECRET`, `AUTH_ENCRYPTION_KEY`, `AUTH_URL` با Zod در startup اعتبارسنجی می‌شوند (`src/env.ts`) — بدون این مقادیر برنامه بالا نمی‌آید.
- **Redis:** `REDIS_URL` باید در production ست شود (Redis واقعی یا Upstash)؛ در نبود آن rate limiting به حافظه‌ی in-memory هر instance برمی‌گردد که پشت چند instance/load balancer قابل اعتماد نیست.
- **`AUTH_ENFORCE_2FA_FOR_STAFF`** باید در production روی `"true"` باشد (پیش‌فرض توصیه‌شده در `.env.example`)؛ در dev به‌خاطر نبود TOTP روی حساب‌های seed، `"false"` نگه داشته شده.
- **Security headers:** `next.config.mjs` به‌صورت شرطی `'unsafe-eval'`/`ws:` را فقط در dev اضافه می‌کند؛ در production CSP سخت‌گیرانه‌تر است — قبل از deploy با `NODE_ENV=production pnpm build && pnpm start` تست کنید که چیزی توسط CSP بلاک نشود.
- **دیتابیس:** migrationها را با `prisma migrate deploy` (نه `migrate dev`) در production اجرا کنید.
- **فایل و ایمیل:** در dev از MinIO/Mailpit استفاده می‌شود؛ در production باید `S3_*`/`SMTP_*` را به سرویس واقعی (AWS S3، SES/SendGrid و...) اشاره دهید.
- **Backup:** فعلاً مستند/اسکریپت backup خودکار در scope این تحویل نبود؛ حداقل توصیه: `pg_dump` دوره‌ای از دیتابیس Postgres و snapshot از bucket فایل.
