# TAFlow implementation status

This file tracks implementation state against `10.tex` and the real repository.

## Baseline

- Repository: `D:\TAFlow\TAFlow`
- Branch verified: `development`
- Upstream verified: `origin/development`
- Package manager: `pnpm@11.9.0`
- Primary specification: `10.tex`
- Secondary reference: `10.pdf`

## Phase 0 - Baseline and stabilization

| Area | Status | Evidence |
|---|---|---|
| Dependency installation | COMPLETE | `pnpm install` completed successfully with lockfile already up to date. |
| Prisma client generation | COMPLETE | `pnpm db:generate` completed successfully after Prisma engine download was allowed. |
| S3/MinIO storage adapter | COMPLETE | `src/server/storage/s3.ts` now provides the storage functions already referenced by file services and health checks. |
| TypeScript validation | COMPLETE | `pnpm typecheck` passed after restoring the storage adapter. |
| Lint validation | COMPLETE | `pnpm lint` passed. |
| Unit tests | COMPLETE | `pnpm test` passed: 10 files, 33 tests. |
| Production build | COMPLETE | `pnpm build` passed with local non-secret environment values. |
| Docker services | COMPLETE | `docker compose ps` shows PostgreSQL, Redis, MinIO, and Mailpit healthy. |
| Database migrate/seed | COMPLETE | `pnpm db:migrate` and `pnpm db:seed` passed against local Postgres. |
| End-to-end tests | COMPLETE | `pnpm test:e2e` passed through the normal project command: 23 passed. |
| E2E heap stability | COMPLETE | `pnpm test:e2e` now starts the Next dev server with a repository-managed heap limit instead of requiring shell-specific environment setup. |

## Current priority matrix

| Requirement group | Status | Notes |
|---|---|---|
| Authentication core | COMPLETE_BUT_UNVERIFIED | Unit/build validation passes; e2e requires DB. |
| Email verification UX | PARTIAL | API exists; dedicated UI flow still needs completion. |
| Password reset UX | PARTIAL | API exists; dedicated UI flow still needs completion. |
| TOTP 2FA UX | PARTIAL | Backend/API exist; setup/verification UI still needs completion. |
| Course-scoped RBAC | COMPLETE_BUT_UNVERIFIED | Service-layer permission model exists; DB-backed e2e requires local database. |
| TA hiring workflow | COMPLETE_BUT_UNVERIFIED | Core workflow exists; file upload dependency is now restored. |
| Storage and uploads | COMPLETE_BUT_UNVERIFIED | Adapter and MinIO health path are validated; upload/download permission flows still need deeper feature coverage. |
| Certificates and PDF persistence | COMPLETE_BUT_UNVERIFIED | Storage dependency restored; certificate issue/verify still needs deeper functional coverage beyond the current E2E suite. |
| Docker-backed local QA | COMPLETE | Docker-backed baseline validation now passes locally. |
