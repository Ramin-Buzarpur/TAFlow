# API Contract - Phase 2

این نسخه قرارداد API مرحله دوم است و روی Auth و نقش‌های درس‌محور تمرکز دارد.

## Auth.js

```http
GET  /api/auth/[...nextauth]
POST /api/auth/[...nextauth]
```

Auth.js handlers برای ورود، خروج و session.

## Register

```http
POST /api/auth/register
```

Body:

```json
{
  "name": "سارا احمدی",
  "email": "student@example.edu",
  "password": "Strong@123456",
  "studentNumber": "405123456",
  "timezone": "Asia/Baku"
}
```

## Verify email

```http
POST /api/auth/verify-email
```

Body:

```json
{
  "email": "student@example.edu",
  "token": "raw-token"
}
```

## 2FA setup

```http
POST /api/auth/2fa/setup
POST /api/auth/2fa/verify
POST /api/auth/2fa/disable
```

Setup returns `secret` و `otpauthUrl`. در production باید secret فقط یک‌بار به کاربر نشان داده شود.

## Course offering context

```http
GET /api/course-offerings/:courseOfferingId/context
```

Response:

```json
{
  "data": {
    "offering": {
      "id": "...",
      "section": "01",
      "course": { "code": "EE-201", "title": "مدارهای الکتریکی ۱" },
      "semester": { "code": "1405-01", "title": "نیمسال اول ۱۴۰۵" },
      "professor": { "id": "...", "name": "دکتر علی رضایی" }
    },
    "permissions": ["course:view", "message:send_course"]
  }
}
```

## Course role assignments

```http
GET /api/course-offerings/:courseOfferingId/roles
GET /api/course-offerings/:courseOfferingId/roles?role=HEAD_TA&includeRevoked=false
```

```http
POST /api/course-offerings/:courseOfferingId/roles
```

Body:

```json
{
  "userId": "clw0000000000000000000000",
  "role": "HEAD_TA",
  "permissions": ["roster:export"],
  "note": "منتخب نهایی استاد برای مدیریت تیم حل تمرین"
}
```

```http
PATCH /api/course-offerings/:courseOfferingId/roles/:assignmentId
```

Body:

```json
{
  "permissions": ["roster:export", "gradebook:manage"],
  "activeUntil": "2027-01-20T00:00:00.000Z"
}
```

```http
DELETE /api/course-offerings/:courseOfferingId/roles/:assignmentId
```

Body:

```json
{
  "reason": "پایان همکاری در این ارائه درس"
}
```

## Security rules

- همه routeهای نقش‌محور باید session معتبر بخواهند.
- همه ورودی‌ها باید با Zod parse شوند.
- Role و permission فقط از سرور و دیتابیس خوانده شود.
- برای لیست‌های بزرگ pagination باید اضافه شود.
- همه عملیات assign/update/revoke باید AuditLog داشته باشد.
- خطاهای ورود باید generic باشند.
- روی login/register rate limiting فعال است.

## Password reset

```http
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

`forgot-password` همیشه response عمومی برمی‌گرداند تا enumeration ایمیل رخ ندهد. در development، token برای تست برگردانده می‌شود؛ در production باید از طریق ایمیل ارسال شود.

## Certificates

```http
POST /api/certificates/:id/revoke
```

Body: `{ "reason": "..." }` — فقط PROFESSOR/HEAD_TA/ادمین سراسری. `revokedAt`/`revokedById`/`revokeReason` را ست می‌کند؛ گواهی revoke‌شده در `/certificates/verify/:code` به‌عنوان نامعتبر گزارش می‌شود.

```http
POST /api/certificates/bulk-issue
```

Body: `{ "requestIds": ["..."] }` — روی هر id، `issueCertificate` موجود را صدا می‌زند و PDF حاوی QR verification تولید می‌کند.

## Office hour registration

```http
POST   /api/sessions/:id/register
DELETE /api/sessions/:id/register
GET    /api/sessions/:id/registrations
PATCH  /api/registrations/:id/attendance
```

ثبت‌نام idempotent است (یک دانشجو در هر جلسه یک بار). `attendance` فقط توسط host/HEAD_TA/PROFESSOR قابل ثبت است.

## Messaging unread count

`GET /api/messages` اکنون فیلد `unreadCount` را به‌ازای هر thread برمی‌گرداند. باز کردن یک thread (`GET /api/messages/:id`) به‌صورت خودکار `lastReadAt` را به‌روزرسانی می‌کند.

## Grade item assignment و Regrade requests

```http
PATCH /api/gradebook/items/:id/assign
```

Body: `{ "assigneeId": "..." }` — فقط HEAD_TA/PROFESSOR/ادمین. پس از تخصیص، TA دیگر فقط می‌تواند grade itemهای تخصیص‌یافته به خودش را ویرایش کند.

```http
GET  /api/regrade-requests
POST /api/regrade-requests
PATCH /api/regrade-requests/:id/respond
```

دانشجو با `POST` درخواست تجدیدنظر ثبت می‌کند؛ TA/HEAD_TA/PROFESSOR با `PATCH .../respond` (Body: `{ "status": "APPROVED" | "REJECTED", "response": "...", "newScore": 18.5 }`) پاسخ می‌دهند.

## Response shape

همه روت‌های بالا و روت‌های قدیمی auth از الگوی یکسان `ok()`/`created()`/`fail()` (`src/server/utils/api.ts`) استفاده می‌کنند: پاسخ موفق body مسطح (بدون wrapper اضافه به‌جز `/api/course-offerings/...` که تاریخی `{data}` دارد)، پاسخ خطا `{ "error": "CODE", "message": "...", "details"?: ... }` با کد HTTP مناسب (400/401/403/404/409/429/500).
