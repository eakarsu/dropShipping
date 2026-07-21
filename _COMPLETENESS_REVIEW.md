# Completeness Review: dropShipping

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 81 project files (70 source files), 1 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Functional but incomplete**

This is a substantive but unfinished commerce/order operations application, not just an empty scaffold. Inspection found 70 source files across `src/`, `nginx/` using Next.js, React, Prisma; however, the checked-in workflow and delivery controls do not yet demonstrate a complete, production-operable product.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Implement an idempotent order state machine covering reservation, payment, cancellation, refund, fulfillment, and exception recovery.
2. Connect real inventory, tax, payment, shipping/delivery, and partner-webhook providers behind retry-safe adapters.
3. Add role-scoped customer, operator, and merchant workflows with immutable order and refund audit history.
4. Test duplicate webhooks, partial fulfillment, payment failure, overselling, and reconciliation end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `README.md`
- `src/app/codex/custom-viz/page.tsx:31`
- `src/components/ai-tool-runner.tsx:58`
- `src/app/layout.tsx`
- `package.json`
- `start.sh`

## Recommended next action

Choose one real commerce/order operations journey, define acceptance criteria and external contracts, then close its persistence, permission, integration, failure, and test gaps before expanding features.

## Implementation progress (2026-07-19)

Implemented in source on 2026-07-20:

- Replaced free-form order CRUD with a transactional, idempotent state machine for reservation, payment success/failure, cancellation, partial/full fulfillment, delivery, refund success/failure, exceptions, and explicit recovery. Inventory reservations use PostgreSQL row locks and nonnegative database constraints; payment failure and cancellation release unfulfilled stock.
- Added merchant-scoped data access and customer/operator/merchant-admin authorization, short issuer/audience-bound cookie sessions, inactive/legacy-account quarantine, explicit account provisioning, customer-only order visibility, and merchant-only reconciliation/configuration boundaries. Global dashboard, analytics, feature, and AI-history reads were removed or tenant-scoped.
- Added HTTPS/timeout/idempotency provider adapters for tax, payment/refund, shipping, inventory, and partner reconciliation. Added exact-body HMAC webhooks, durable duplicate receipts, payload-identity conflict checks, retry handling, allowlisted event normalization, provider provenance checksums, and saga exception capture.
- Added append-only, HMAC-signed order event chains, immutable refund deletion protection, tenant-consistent foreign keys, total/state/stock constraints, refund persistence, history APIs, and reconciliation-to-exception workflows. PostgreSQL triggers reject audit event updates/deletes.
- Removed demo credentials, mock OpenRouter responses, generic AI product behavior, generated gap/batch routes, visualization-only claims, and destructive startup/seed/reset/process-kill behavior. Startup now only validates configuration and launches; install, migration, provisioning, backup, and guarded restore are explicit operations.
- Added a reviewed Drizzle migration with legacy-schema refusal, non-root read-only container/Compose definitions, one-shot migration service, readiness checks, locked dependency upgrades, CI for migration/typecheck/lint/tests/build/audit/container build plus gitleaks, provider/operations runbooks, and safe backup/restore scripts.
- Verified against a disposable PostgreSQL 17 server: clean migration and 15/15 unit/integration/route tests passed, including duplicate actions/webhooks, concurrent oversell prevention, payment-failure reservation release, partial fulfillment, reconciliation exception capture, webhook HMAC validation, and database audit immutability. Typecheck, ESLint, production Next.js 16.2.10 build, Compose validation, npm audit (0 vulnerabilities), gitleaks (0 findings), shell syntax, and diff checks passed. A local container build could not run because the Docker/Colima daemon was stopped; CI is configured to perform it.

Remaining external launch gates are provider contracts/credentials and sandbox certification, production merchant/legacy-data mapping, tax-nexus and PCI responsibility review, carrier/partner onboarding, secret rotation, load/failover and backup-restore exercises, accessibility/security review, and named operational/incident owners. No source-only implementation can substitute for those approvals and external systems.

## Isolated startup and login verification (2026-07-20)

`start.sh` now requires the assigned full-stack port, binds only to `127.0.0.1`, rejects occupied/default ports, and does not load the project `.env` during isolated acceptance. Explicit acknowledgement-gated administrator provisioning maps the validator tenant to a merchant, refuses overwriting an existing account, and is separate from migration/demo data. `/api/auth/me` revalidates the signed cookie against the active persisted user and merchant before returning the authenticated identity.

With disposable PostgreSQL on `55643`, the application started on `6096` and passed persisted administrator login, cookie-session establishment, and the authenticated `/api/auth/me` probe on its first attempt: `API_VERIFIED/startup_login_session_api`. Typecheck and the Next.js 16.2.10 production build passed; after the clean migration, all 15/15 unit, route, and database integration tests passed. The assigned ports were confirmed free after shutdown.
