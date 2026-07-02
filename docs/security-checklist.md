# Security Checklist

What's actually implemented in this codebase today, organized by the classic CIA triad (confidentiality, integrity, availability) since that's how security got framed for this delivery. This file is meant to stay accurate — update it when something here changes, don't just leave checkmarks stale.

## Confidentiality (don't leak data)

- [x] Argon2id password hashing (`src/server/auth/password.ts`)
- [x] TOTP 2FA, secrets encrypted at rest with AES (`src/server/auth/crypto.ts`, `AUTH_ENCRYPTION_KEY`)
- [x] Recovery codes stored hashed, not raw
- [x] Course-scoped RBAC — every permission check reads the active `CourseRoleAssignment`, never a client-supplied role (`src/server/auth/permissions.ts`, `src/server/services/rbac.ts`)
- [x] Anonymous surveys/evaluations/polls use a salted hash (`AUTH_SECRET`-derived) instead of storing the real user ID — `PollVote.voterId` is genuinely `null` for anonymous votes (fixed in this round; previously the real user ID was stored alongside the hash, defeating the point)
- [x] Survey results hidden below `minResponses` so individual answers can't be inferred in small classes
- [x] Professor's private application notes never sent to student-facing routes
- [x] File downloads use short-lived signed URLs, not public bucket paths (`src/server/storage/s3.ts`)
- [x] Security headers include a real CSP (`next.config.mjs`) — `'unsafe-eval'`/`ws:` only added in dev, stripped in production builds
- [ ] Malware/virus scanning on uploaded files (needs an external scanner like ClamAV; not wired up in this dev environment)
- [ ] Full production SSO/Keycloak (env-driven provider exists in `auth.ts`, but needs a real IdP + realm to actually enable)

## Integrity (don't corrupt or misattribute data)

- [x] All mutation routes validate their body with Zod (`src/server/validation/*`)
- [x] Business logic lives in the service layer, not route handlers — routes call services, services own permission checks + transactions + audit writes
- [x] Partial unique indexes back every "only one active X" invariant instead of a plain unique constraint that would collapse history: active course role, active enrollment, in-flight certificate request, deduped survey/evaluation answers, deduped anonymous poll votes, at most one open regrade request
- [x] CHECK constraints on scores/weights (`grade_record_score_non_negative`, `grade_category_weight_range`, `grade_item_max_score_positive`) and on date ranges (`endsAt > startsAt` for office hours, interviews, calendar events)
- [x] `AuditLog` on every sensitive write: role assign/revoke, application status changes, grade entry/publish/import, certificate approve/issue/revoke, file upload/download/delete
- [x] `SecurityEvent` on login success/failure, lockouts, rate-limit hits, 2FA failures
- [x] Multi-step operations (accept application → assign role → notify, issue certificate → generate PDF → upload → audit) run inside a single Prisma transaction, not as separate unguarded writes
- [x] Origin check on all `/api/*` mutation methods (`src/middleware.ts`) — rejects a `POST/PUT/PATCH/DELETE` whose `Origin` header doesn't match `AUTH_URL`, a lightweight CSRF backstop on top of the session cookie's own `SameSite` protection

## Availability (stay up, degrade gracefully, resist abuse)

- [x] Rate limiting on every auth-adjacent and write-heavy route: login, register, forgot/reset password, 2FA verify, message send, file upload, TA application submit, poll vote, survey answer, certificate request (`src/server/auth/rate-limit.ts`)
- [x] Rate limiting is Redis-backed when `REDIS_URL` is set (shared, survives restarts, correct across multiple app instances) and falls back to an in-process in-memory limiter otherwise — the fallback is explicitly a single-instance/dev-only behavior, not something to rely on in a real multi-instance deployment
- [x] `/api/health` reports database, Redis, and object storage reachability independently, so one dependency being down doesn't hide the others
- [x] Account lockout after repeated failed logins
- [x] Singleton Prisma Client (`globalForPrisma` pattern in `src/server/db.ts`) so concurrent requests share one bounded connection pool instead of each request opening its own connection
- [ ] Network-layer DDoS protection (SYN floods, volumetric attacks, etc.) — this is explicitly **out of scope for application code**. Rate limiting here protects specific *endpoints* from abuse by an authenticated-or-not client making many requests; it does nothing against a distributed flood at the network layer. That needs a CDN/WAF in front of the app (Cloudflare, AWS Shield, etc.) as an infrastructure decision, not something `next.config.mjs` can solve.
- [ ] Load-tested capacity numbers for concurrent users — see the performance section of the delivery report for what was actually measured on this dev box versus what a real capacity claim would require (a real deployment + a proper load-testing tool like k6, not a browser-based smoke test)

## What this means in practice

If someone asks "can this get hacked": the realistic answer is the same as for any web app — there's no such thing as unhackable, but the standard attack surface is covered (password cracking is slowed by Argon2id + lockout, session hijacking is limited by short JWT lifetimes + `SameSite` cookies, CSRF is covered by origin checking, SQL injection isn't possible because every query goes through Prisma's parameterized queries, XSS is mitigated by React's default escaping plus explicit sanitization on message bodies). What's **not** covered by this repo, because it's an infrastructure concern rather than an application one: DDoS mitigation, WAF rules, TLS termination/certificate management, and secrets management in production (this repo assumes `.env` is populated safely by whoever deploys it — it does not manage secrets rotation itself).
