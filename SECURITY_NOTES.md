# SECURITY_NOTES.md — خلاصه‌ی وضعیت امنیتی

جزئیات کامل مورد به مورد در [docs/security-checklist.md](docs/security-checklist.md) نگهداری می‌شود و با هر تغییر به‌روز می‌شود. این فایل خلاصه‌ی اجرایی است.

## آنچه پیاده شده

- **احراز هویت**: Argon2id برای هش رمز، قفل حساب بعد از ۱۰ تلاش ناموفق، TOTP دومرحله‌ای با secret رمزشده (AES)، توکن reset تک‌مصرف و hash شده، و **باطل شدن خودکار sessionهای قبلی بعد از تغییر رمز یا تعلیق حساب** (حداکثر با ۶۰ ثانیه تاخیر — چون session از نوع JWT است و به‌جای چک هر request، هر دقیقه یک‌بار با DB همگام می‌شود).
- **مجوزها (RBAC)**: هر مجوز از `CourseRoleAssignment` فعالِ سمت سرور خوانده می‌شود، هرگز از client state. نقش revoke شده بلافاصله بی‌اثر است (partial unique index + چک سمت سرویس). مجوزهای فراتر از نقش با مکانیزم `permissionsJson` اعطا می‌شوند و audit دارند.
- **CSRF/Origin**: همه‌ی متدهای mutation روی `/api/*` از طریق `src/proxy.ts` چک Origin می‌شوند، علاوه بر `SameSite` کوکی session.
- **Rate limiting**: مبتنی بر Redis (با fallback درون-حافظه‌ای فقط برای dev) روی login، register، فراموشی/تغییر رمز، 2FA، ارسال پیام، آپلود فایل، ثبت درخواست TA، رأی poll، پاسخ survey و درخواست گواهی.
- **ناشناس بودن واقعی**: رأی ناشناس poll و پاسخ‌های survey/evaluation با hash نمک‌دار ذخیره می‌شوند؛ `voterId` برای رأی ناشناس واقعاً NULL است (در سطح دیتابیس بررسی و تست شده).
- **فایل‌ها**: whitelist نوع فایل (فایل اجرایی رد می‌شود)، سقف ۱۰ مگابایت، آدرس دانلود امضاشده‌ی کوتاه‌عمر، کنترل دسترسی دانلود بر اساس عضویت در درس (نه صرفاً visibility)، checksum SHA-256، soft-delete، و audit روی آپلود/دانلود/حذف.
- **یکپارچگی دیتابیس**: partial unique indexها برای هر invariant «فقط یک X فعال»، و CHECKهای دیتابیس برای بازه‌ی نمره/وزن و بازه‌های تاریخ (جلسه، مصاحبه، رویداد تقویم، ترم).
- **Headers**: CSP واقعی + HSTS-candidates + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy در `next.config.mjs`.
- **Audit**: همه‌ی عملیات حساس (نقش‌ها، وضعیت درخواست‌ها، نمره، انتشار/قفل نمره، فایل، export، گواهی) `AuditLog` دارند و رویدادهای امنیتی (login موفق/ناموفق، rate limit، 2FA fail) در `SecurityEvent` ثبت می‌شوند.
- **نظارت**: `/api/health` وضعیت DB/Redis/Storage را جدا گزارش می‌دهد و در پنل ادمین به‌صورت بصری (کارت «سلامت سیستم») دیده می‌شود.

## آنچه آگاهانه پوشش داده نشده (و چرا)

- **DDoS لایه ۳/۴ (شبکه)**: rate limiting اپلیکیشن در برابر سیل ترافیک شبکه‌ای بی‌اثر است؛ این کار WAF/CDN (مثل Cloudflare) در لایه‌ی زیرساخت است، نه کد Next.js. ادعای خلاف این، گمراه‌کننده بود.
- **اسکن ویروس فایل‌های آپلودی**: نیازمند سرویس خارجی (ClamAV و مشابه). سطح فعلی: whitelist سخت‌گیرانه‌ی MIME + سقف حجم + عدم اجرای مستقیم فایل‌ها (فقط دانلود امضاشده).
- **SSO/Keycloak**: provider آماده است ولی بدون IdP واقعی و realm دانشگاهی قابل فعال‌سازی و تست نیست.
- **مدیریت secrets در production**: این ریپو فرض می‌کند `.env` توسط deployer به‌شکل امن پر می‌شود؛ چرخش خودکار secrets خارج از scope است.

## پاسخ کوتاه به «آیا هک می‌شود؟»

هیچ سیستمی «غیرقابل نفوذ» نیست؛ ادعای آن نشانه‌ی ناآگاهی است. سطح حمله‌ی استاندارد وب پوشش داده شده: SQL injection از طریق Prisma parameterized ناممکن است، XSS با escape پیش‌فرض React + sanitize بدنه‌ی پیام‌ها مهار می‌شود، CSRF با Origin check + SameSite، brute-force با Argon2id + قفل حساب + rate limit، و session hijacking با عمر کوتاه JWT + باطل‌سازی بعد از تغییر رمز محدود می‌شود. آنچه می‌ماند، ریسک‌های لایه‌ی زیرساخت و عامل انسانی است که خارج از کد این ریپو است.
## Phase 2 cross-course isolation

- Course-scoped API access is enforced server-side against the requested `courseOfferingId`; a role in Course A does not grant access to protected Course B resources.
- Unfiltered course-scoped lists for office hours, announcements, and academic calendar events now restrict course rows to active assignments for the caller, while preserving global/admin behavior for non-course rows.
- The behavior is covered by `tests/e2e/cross-course-authorization.spec.ts` for professor, Head TA, student, and global admin paths, including course material file download and upload/attach authorization.
