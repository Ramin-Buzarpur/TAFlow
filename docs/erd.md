# ERD (متنی) — موجودیت‌های اصلی

نمودار کامل و دقیق فیلدها همیشه `prisma/schema.prisma` است؛ این سند فقط نقشه‌ی روابط اصلی برای درک سریع دامنه است.

## هسته‌ی سازمانی

```
Department 1---N Course 1---N CourseOffering N---1 Semester
CourseOffering N---1 User (professorId)
CourseOffering 1---N CourseEnrollment N---1 User (studentId)
CourseOffering 1---N CourseRoleAssignment N---1 User
```

- `CourseRoleAssignment` تنها منبع مجوز درس‌محور است (role: STUDENT/TA/HEAD_TA/PROFESSOR + permissionsJson).
- تاریخچه با `revokedAt`/`revokedById`/`revokeReason` حفظ می‌شود؛ یکتایی نقش فعال با partial unique index `(courseOfferingId, userId, role) WHERE revokedAt IS NULL` تضمین می‌شود (نه `@@unique` معمولی).

## استخدام TA

```
CourseOffering 1---N TAOpportunity 1---N TAApplication N---1 User (applicant)
TAApplication 1---N ApplicationReview
TAApplication 1---1 Interview (اختیاری)
TAApplication N---1 ResumeItem/UploadedFile (resumeFileId)
```

پذیرش (`ACCEPTED`) به‌صورت idempotent یک `CourseRoleAssignment` فعال می‌سازد (findFirst+create/update، نه upsert روی کلید ترکیبی).

## رفع اشکال (Office Hours)

```
CourseOffering 1---N OfficeHourSession 1---N OfficeHourRegistration N---1 User (student)
```

`OfficeHourRegistration` یکتای `(sessionId, studentId)`؛ `attendedAt` توسط host/HEAD_TA/PROFESSOR ثبت می‌شود.

## نمره‌دهی

```
CourseOffering 1---N GradeCategory 1---N GradeItem 1---N GradeRecord N---1 User (student)
GradeItem N---1 User (assigneeId, اختیاری — TA مسئول آن آیتم)
GradeRecord 1---N RegradeRequest N---1 User (studentId, respondedById)
GradeRecord 1---N GradeChangeLog
```

اگر `GradeItem.assigneeId` ست شده باشد، فقط همان TA (یا HEAD_TA/PROFESSOR/ادمین) اجازه‌ی ثبت `GradeRecord` روی آن آیتم را دارد.

## گواهی (Certificate)

```
CourseOffering 1---N CertificateRequest 1---1 TACertificate
TACertificate N---1 User (revokedById, اختیاری)
CertificateTemplate 1---N CertificateRequest
```

هر `CertificateRequest` حداکثر یک `TACertificate` دارد (۱:۱). PDF شامل QR به `/certificates/verify/:code` است؛ revoke شامل `revokedAt/revokedById/revokeReason` است و توسط endpoint عمومی verify رد می‌شود.

## نظرسنجی و ارزشیابی

```
CourseOffering 1---N Survey 1---N SurveyQuestion 1---N SurveyAnswer
CourseOffering 1---N ProfessorEvaluation
CourseOffering 1---N TAEvaluation N---1 User (taUserId)
```

پاسخ‌های ناشناس با `respondentHash` (نه userId مستقیم) ذخیره می‌شوند؛ یکتایی `(surveyId, questionId, respondentHash)` و مشابه برای ارزشیابی‌ها از پاسخ تکراری جلوگیری می‌کند.

## پیام‌رسانی

```
MessageThread 1---N MessageThreadParticipant N---1 User
MessageThread 1---N Message N---1 User (senderId)
```

`MessageThreadParticipant.lastReadAt` مبنای محاسبه‌ی `unreadCount` است.

## سایر

```
Task N---1 CourseOffering, N---1 User (assigneeId)
Notification N---1 User
AuditLog / SecurityEvent — رکورد فقط-افزایشی برای ردیابی و امنیت
```
