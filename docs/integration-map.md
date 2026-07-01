# Integration Map

## Core entity graph

User -> CourseRoleAssignment -> CourseOffering -> Course -> Department
CourseOffering -> TAOpportunity -> TAApplication -> Interview
CourseOffering -> OfficeHourSession
CourseOffering -> GradeCategory -> GradeItem -> GradeRecord
CourseOffering -> Survey -> SurveyQuestion -> SurveyAnswer
CourseOffering -> AvailabilityPoll -> PollOption -> PollVote
CourseOffering -> MessageThread -> Message
CourseOffering -> CertificateRequest -> TACertificate
CourseOffering -> Announcement / AcademicCalendarEvent

## Permission source of truth

`CourseRoleAssignment` is the only course-level permission source. UI role labels are decorative only. Every sensitive API route calls service-layer permission checks.

## Frontend/API connection pattern

- Server pages load data directly through server services.
- Client forms call `/api/...` route handlers.
- Route handlers validate with Zod and call service functions.
- Services enforce authorization and write AuditLog.

## Export flow

UI button -> API route -> service permission check -> CSV response with UTF-8 BOM -> AuditLog.

## Certificate flow

TA panel -> eligibility check -> request -> professor decision -> education issue -> tracking code -> public verification.
