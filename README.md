# TAFlow — سامانه یکپارچه مدیریت دستیار آموزشی

این پروژه نسخه full-stack و یکپارچه سامانه مدیریت TA / Head TA است. پروژه روی فازهای قبلی ساخته شده و حالا شامل دیتابیس، احراز هویت، نقش‌های درس‌محور، APIها، سرویس‌های بک‌اند، صفحات فرانت‌اند فارسی RTL، طراحی مدرن، گزارش‌گیری، خروجی CSV و مستندات اجرایی است.

## Stack

- Next.js App Router + TypeScript
- PostgreSQL + Prisma ORM
- Auth.js / NextAuth + Prisma Adapter
- Zod برای اعتبارسنجی سمت سرور
- Argon2id، TOTP 2FA، rate limiting و AuditLog
- CSS design system داخلی با RTL کامل
- Vitest برای تست‌های واحد
- Docker Compose برای Postgres، MinIO (S3-compatible storage) و Mailpit (SMTP محلی)

## اجرای محلی

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

سپس:

```text
http://localhost:3000        سامانه
http://localhost:9001        کنسول MinIO (فایل‌های آپلودشده)
http://localhost:8025        صندوق ایمیل Mailpit
```

## حساب‌های seed

رمز همه حساب‌های نمونه:

```text
Admin@12345678
```

- `admin@example.edu` — ادمین سیستم
- `rezai@example.edu` — استاد
- `headta@example.edu` — Head TA
- `student@example.edu` — دانشجو

در خروجی seed، شناسه `courseOfferingId` نمونه هم چاپ می‌شود تا بتوانید صفحات زیر را سریع تست کنید:

```text
/courses/<courseOfferingId>
/gradebook/<courseOfferingId>
/api/exports/roster/<courseOfferingId>
/api/exports/gradebook/<courseOfferingId>
```

## ماژول‌های پیاده‌سازی‌شده

### 1. Auth و نشست

- ورود با ایمیل و رمز عبور
- ثبت‌نام
- تایید ایمیل
- فراموشی رمز و reset password
- Argon2id برای hash رمز
- قفل حساب بعد از تلاش ناموفق
- rate limiting
- TOTP 2FA
- آماده‌سازی SSO دانشگاهی/Keycloak
- تزریق `user.id`, `globalRole`, `status`, `timezone` در session

### 2. Course / CourseOffering / CourseRoleAssignment

تفکیک اصلی سیستم:

- `Course`: ماهیت درس، مثل «مدارهای الکتریکی ۱»
- `CourseOffering`: ارائه همان درس در یک ترم با استاد، سکشن و ظرفیت مشخص
- `CourseRoleAssignment`: نقش کاربر در همان ارائه درس، مثل STUDENT، TA، HEAD_TA، PROFESSOR

تمام مجوزهای حساس از `CourseRoleAssignment` فعال خوانده می‌شوند و کلاینت هیچ‌وقت منبع حقیقت نقش نیست.

### 3. گردش کار انتخاب TA و Head TA

- ساخت و انتشار فرصت TA توسط استاد
- مشاهده فرصت‌های فعال توسط دانشجو
- ارسال درخواست TA / Head TA
- جلوگیری از درخواست تکراری
- وضعیت‌های درخواست: SUBMITTED، UNDER_REVIEW، SHORTLISTED، INTERVIEW_INVITED، ACCEPTED، REJECTED، WITHDRAWN
- بررسی درخواست توسط استاد یا Head TA مجاز
- ثبت مصاحبه
- قبول/رد درخواست
- ساخت خودکار `CourseRoleAssignment` بعد از پذیرش
- AuditLog و Notification برای تغییر وضعیت‌ها

### 4. پیام‌رسانی داخلی

- ساخت گفت‌وگوی درس‌محور یا پشتیبانی آموزشی
- پیام دانشجو به TA / Head TA / استاد
- دسته‌بندی Threadها
- بستن Thread توسط نقش مجاز
- جلوگیری از دسترسی کاربران غیرمرتبط
- پاک‌سازی متن برای کاهش ریسک XSS

### 5. جلسات رفع اشکال و Meet

- ساخت جلسه توسط استاد/Head TA/TA مجاز
- لینک جلسه آنلاین، محل حضوری، ظرفیت، زمان شروع/پایان
- جلوگیری از تداخل زمانی برای host
- دکمه ورود به جلسه
- خروجی iCal برای اضافه‌کردن به Google Calendar / Outlook

### 6. دفتر نمرات و خروجی CSV

- دسته‌بندی نمرات با وزن
- جلوگیری از عبور مجموع وزن‌ها از ۱۰۰٪
- ساخت آیتم نمره
- ورود/ویرایش نمره با تاریخچه تغییرات
- انتشار نمره برای دانشجو
- مشاهده فقط نمرات خود دانشجو
- خروجی CSV اعضای کلاس با BOM مناسب فارسی
- خروجی CSV دفتر نمرات
- AuditLog برای ورود، انتشار و خروجی‌ها

### 7. نظرسنجی و رأی‌گیری زمان کلاس

- ساخت نظرسنجی درس‌محور
- سوال rating / text / choice
- پاسخ ناشناس با respondent hash
- آستانه حداقل پاسخ برای نمایش نتایج
- رأی‌گیری زمان کلاس یا جلسه رفع اشکال
- جلوگیری از چندبار رأی دادن

### 8. گواهی TA و Head TA

- بررسی eligibility
- درخواست گواهی از پنل TA / Head TA
- تایید استاد
- صدور توسط آموزش
- کد رهگیری non-guessable
- endpoint راستی‌آزمایی عمومی با اطلاعات محدود
- AuditLog برای تایید، رد و صدور

### 9. اطلاعیه‌ها و تقویم آموزشی

- اطلاعیه دانشگاهی / دانشکده / درس
- اولویت عادی، مهم، فوری
- نمایش اطلاعیه‌های منتشرشده و منقضی‌نشده
- ثبت رویدادهای آموزشی
- ذخیره زمان‌ها با UTC و نمایش سمت UI با locale فارسی

### 10. داشبوردهای نقش‌محور

- داشبورد دانشجو: درخواست‌ها، جلسات، نمرات، اعلان‌ها
- داشبورد استاد/Head TA: درخواست‌ها، درس‌ها، جلسات، دفتر نمرات
- داشبورد ادمین: کاربران، ارائه‌ها، گواهی‌ها، رخدادهای امنیتی

### 11. جستجوی سراسری / Command Palette

- باز شدن با `Ctrl+K` یا `Cmd+K`
- جستجوی درس، فرصت، جلسه، پیام، اطلاعیه
- نتایج permission-aware

## Routeهای مهم

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

GET /api/gradebook/:courseOfferingId
POST /api/gradebook/categories
POST /api/gradebook/items
POST /api/gradebook/records
POST /api/gradebook/items/:id/publish
GET /api/exports/roster/:courseOfferingId
GET /api/exports/gradebook/:courseOfferingId

GET/POST /api/surveys
POST /api/surveys/:id/answer
GET /api/surveys/:id/results
POST /api/polls
POST /api/polls/:id/vote

GET/POST /api/certificates
POST /api/certificates/:id/professor-decision
POST /api/certificates/:id/issue
GET /api/certificates/verify/:code

GET/POST /api/announcements
GET/POST /api/calendar
GET /api/dashboard
GET /api/search?q=...
GET /api/notifications
POST /api/notifications/:id/read
```

## صفحات فرانت‌اند

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
/announcements
/courses/:courseOfferingId
```

## Design System

طراحی براساس سبک‌های مناسب داشبوردهای آموزشی/Enterprise انجام شده است:

- RTL کامل
- کارت‌های rounded
- رنگ‌های آبی/Teal برای حس دانشگاهی و تکنولوژیک
- کنتراست مناسب
- focus state برای کیبورد
- حالت responsive
- الگوی Bento/Grid برای داشبوردها
- پرهیز از انیمیشن سنگین و المان‌های کندکننده
- استفاده از رنگ‌های status واضح: آبی، سبز، قرمز، نارنجی، بنفش، خاکستری

## امنیت

- اعتبارسنجی سمت سرور با Zod
- RBAC درس‌محور
- کنترل دسترسی در service layer، نه فقط UI
- عدم افشای notes داخلی استاد به دانشجو
- لاگ امنیتی و AuditLog
- rate limiting برای مسیرهای حساس Auth
- رمزنگاری secret دو مرحله‌ای
- عدم اعتماد به نقش‌های کلاینت
- خروجی‌های حساس در AuditLog ثبت می‌شوند

## تست

### تست‌های واحد

```bash
npm test
```

تست‌ها شامل موارد زیر هستند:

- اعتبارسنجی Auth و نقش‌ها
- privacy threshold نظرسنجی
- status transition درخواست TA
- CSV فارسی با BOM
- RBAC پایه و CourseRoleAssignment
- محدودیت نرخ درخواست (rate limiting)
- اعتبارسنجی آپلود فایل (نوع و حجم مجاز)

### تست‌های end-to-end (Playwright)

```bash
npx playwright install   # فقط بار اول، دانلود مرورگر
npm run test:e2e
```

نیازمند دیتابیس seed‌شده و در حال اجرا (`docker compose up -d` و `npm run db:seed`) است؛ خود دستور `npm run test:e2e` سرور dev را در صورت نیاز بالا می‌آورد. یک‌بار پیش از تست‌ها با هر ۴ حساب seed لاگین شده و session ذخیره می‌شود (`tests/e2e/global-setup.ts`) تا rate limit ورود به دلیل اجرای مکرر تست‌ها فعال نشود. مسیرهای پوشش داده‌شده: ورود/خروج هر ۴ نقش، گردش‌کار کامل ایجاد فرصت → درخواست → پذیرش، دسترسی ویژه Head TA، پیام‌رسانی، ارزشیابی استاد و نظرسنجی TA، اطلاعیه‌ها و پنل ادمین، داشبوردهای نقش‌محور، دسترسی‌های ممنوع، RTL/ریسپانسیو و دارک‌مود.

## آپلود فایل، ایمیل و گواهی PDF

- آپلود رزومه/فایل واقعی روی S3-compatible storage (`src/server/storage/s3.ts`, `src/server/services/files.ts`)، در dev از طریق MinIO (`docker-compose.yml`، کنسول در `http://localhost:9001`).
- ارسال ایمیل واقعی (بازیابی رمز، تایید ایمیل) از طریق SMTP (`src/server/email/mailer.ts`)، در dev از طریق Mailpit (`http://localhost:8025`).
- گواهی فعالیت به‌صورت PDF واقعی فارسی/RTL تولید و در storage ذخیره می‌شود (`src/server/certificates/pdf.ts`، فونت Vazirmatn).
- موتور امتیازدهی و رتبه‌بندی متقاضیان بر اساس نمره بررسی، مصاحبه و معدل (`src/server/services/scoring.ts`).

## محدودیت‌های فعلی

- برخی فرم‌های UI برای سرعت توسعه ساده نگه داشته شده‌اند و در فاز بعدی frontend کامل می‌شوند.
- import XLSX واقعی در سرویس gradebook قابل توسعه است؛ خروجی CSV آماده است و `exceljs` در dependencyها وجود دارد.
- بازتولید bidi/reshaping فارسی برای متن ترکیبی فارسی-لاتین در PDF گواهی (مثل کد نقش انگلیسی داخل جمله فارسی) هنوز کامل نیست؛ متن خالص فارسی درست رندر می‌شود.

## مسیر توسعه بعدی

1. تکمیل صفحات فرانت‌اند باقی‌مانده (پنل بررسی متقاضیان، مقایسه، داشبورد استاد/Head TA/ادمین، بانک استعدادها، مدیریت وظایف، تنظیمات، صفحات خطا)
2. اتصال SSO دانشگاهی
3. نوشتن تست‌های e2e با Playwright
4. deploy روی VPS یا سرویس‌های ابری
