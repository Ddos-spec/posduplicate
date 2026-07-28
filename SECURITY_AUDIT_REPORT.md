# Backend and Frontend Audit Report

Audit date: 2026-07-29
Scope: `backend/`, `frontend/`, API contracts, authentication, authorization, tenant isolation, uploads, webhooks, SQL access, dependency posture, build, lint, and automated tests.

## Executive summary

P0, P1, and the practical P2 remediation set have been implemented locally. The highest-risk issues found during the audit—client-controlled registration scope, inconsistent tenant enforcement, unsafe raw SQL, plaintext API keys, non-durable webhook idempotency, weak upload handling, production mock data, and frontend authentication/cache weaknesses—are remediated.

No environment or credential file was changed. No commit, push, deployment, or production migration was performed.

## Remediated findings

### P0 — Critical

- **Registration privilege and tenant injection:** registration now creates the tenant and Owner role server-side in a transaction; password hashes are omitted from responses (`backend/src/modules/shared/controllers/auth.controller.ts:121`, `backend/src/modules/shared/controllers/auth.controller.ts:154`).
- **JWT secret fallback:** token operations now fail closed when `JWT_SECRET` is absent (`backend/src/modules/shared/controllers/auth.controller.ts:9`).
- **Tenant/outlet isolation:** protected accounting and F&B flows require tenant context, with outlet scope derived server-side (`backend/src/middlewares/tenant.middleware.ts:190`, `backend/src/middlewares/tenant.middleware.ts:210`).
- **Frontend token persistence:** authentication state now uses `sessionStorage`, not long-lived raw `localStorage` (`frontend/src/store/authStore.ts:79`).
- **API/PWA cache leakage:** service-worker runtime API caching is disabled (`frontend/vite.config.ts:20`).

### P1 — High

- **SQL injection surface:** all `$queryRawUnsafe` and `$executeRawUnsafe` usage under `backend/src` was replaced by parameterized Prisma SQL. Dynamic identifiers and filters are validated before query construction.
- **API key storage:** newly created keys are hashed; legacy plaintext keys migrate on successful use (`backend/src/modules/shared/controllers/apiKey.controller.ts:142`, `backend/src/middlewares/apiKey.middleware.ts:33`).
- **Webhook replay/idempotency:** durable database-backed webhook events replace process-memory idempotency (`backend/src/middlewares/webhook.middleware.ts:151`, `backend/prisma/schema.prisma:788`).
- **Upload hardening:** randomized names, tenant directories, size/type restrictions, image signature validation, attachment path containment, and explicit blocking of accounting attachments from the public static route were added (`backend/src/middleware/upload.ts:18`, `backend/src/middleware/upload.ts:24`, `backend/src/modules/shared/controllers/upload.controller.ts:16`, `backend/src/server.ts:114`).
- **HTTP hardening:** Helmet, strict CORS, request-size limits, rate limiting, sanitized production errors, and database-aware readiness checks were added (`backend/src/server.ts:62`, `backend/src/server.ts:95`, `backend/src/server.ts:104`, `backend/src/server.ts:165`).

### P2 — Quality and production truth

- Production accounting role dashboards now consume live summary, transaction, and top-product APIs instead of fabricated values (`frontend/src/pages/accounting/RoleDashboardPage.tsx:55`).
- Fake email-delivery claims and temporary-password logging were removed from user creation.
- WhatsApp inbox production behavior no longer imports mock reply templates.
- Inventory forecast APIs return an explicit insufficient-data state instead of presenting generated placeholders as live facts.
- Backend tenant/auth tests and frontend API-contract tests were added.
- Frontend lint tooling was refreshed and outstanding correctness errors were resolved.

## Validation evidence

- Backend Prisma client generation: passed, Prisma Client `6.19.3`.
- Backend TypeScript production build: passed.
- Backend tests: **8 suites passed, 1 suite skipped; 23 tests passed, 29 skipped**.
- Backend ESLint: **0 errors, 797 warnings**.
- Backend `npm audit`: **0 vulnerabilities**.
- Frontend TypeScript and Vite production/PWA build: passed.
- Frontend tests: **1 file passed; 3 tests passed**.
- Frontend ESLint: **0 errors, 225 warnings**.
- Frontend dependency audit:
  - Production dependencies: **2 high advisories**, both from the current latest `react-router-dom@7.18.1` / `react-router` RSC advisory.
  - Full dependency tree: **15 high advisories**; the additional findings are in lint/PWA build tooling through `brace-expansion`.
- Regression scans:
  - Unsafe Prisma raw methods under `backend/src`: none.
  - Raw auth token/user access through frontend `localStorage`: none.
  - Added forbidden F&B role middleware: none.
  - Changed `.env` files: none.
  - `git diff --check`: passed; only repository line-ending notices were emitted.

## Remaining risks and operational actions

1. **Apply the new migration before starting the updated backend:** run the normal deployment migration workflow for `backend/prisma/migrations/20260728135000_add_webhook_events/`.
2. **React Router advisory:** no non-vulnerable published replacement was available during this audit. The application is a client-rendered SPA and does not use React Router RSC server actions, reducing direct applicability, but the dependency advisory remains open and should be upgraded when upstream publishes a fixed release.
3. **Build-tool advisory:** `brace-expansion` remains through PWA development/build dependencies. A blanket override was rejected because it broke ESLint's minimatch consumers. Upgrade the affected upstream packages once compatible releases are available.
4. **Public product media:** accounting attachments are no longer reachable through `/uploads` and remain available only through the authenticated tenant-scoped controller. Tenant product/media images remain intentionally public-by-URL so browser image rendering continues to work.
5. **Type and test debt:** lint warnings remain high and overall backend coverage is limited. These are no longer release-blocking errors, but should be reduced module-by-module, beginning with authentication, tenant boundaries, webhooks, uploads, and accounting approvals.
