# Audit Apply Notes — dropShipping

Source: `_AUDIT/reports/batch_09.md` § dropShipping

## Original audit recommendations

The audit section is brief:
> **Domain:** Drop-shipping product management and AI tools.
> **Stack & Maturity:** Next.js. 9 pages, 6 AI endpoints. **Verdict: Skeleton-to-Template**.
> **Pages:** Feature pages (new, id, list), dashboard, AI tools (new, id, list), analytics, login.

No specific "Missing AI Counterparts", "Missing Non-AI Features", or "Custom Feature Ideas" subsections were raised.

## Implemented this pass

**None.** Backlog-only — no concrete audit recommendations to apply mechanically.

The codebase already has a clean slug-driven AI tool registry at `src/lib/ai-tools.ts` with a single dynamic Next.js API route (`src/app/api/ai/[tool]/route.ts`). Any future "AI tool" addition is genuinely a one-entry change in the registry, but the audit didn't list specific gaps to fill, so this pass logs only the backlog.

## Backlog (suggested next pass — explicit additions to `AI_TOOLS`)

These are inferred from the dropshipping domain and would each be a single registry entry plus matching system prompt; safe and mechanical when prioritised:

- `supplier-vetting` — score a supplier on reliability, fulfilment risk, IP risk.
- `stockout-risk` — given a SKU + recent demand + lead time, predict stockout probability.
- `pricing-strategy` — suggest tiered pricing per channel given cost + competitor anchor.
- `bundle-suggester` — given an order history, suggest profitable bundles.
- `negative-review-triage` — classify and draft a response for a returned-item complaint.

## Categorisation

- MECHANICAL (could be added next pass): the five tools above.
- NEEDS-PRODUCT-DECISION: which marketplaces to target, branded-vs-generic copy guardrails.

## Apply pass 3 (frontend)

LEFT-AS-IS — frontend was already wired for every backend AI endpoint.

- Verified the FE (React/CRA pages or Next.js dynamic AI tool registry) calls every AI route exposed by the backend.
- Auth pattern (JWT in localStorage with axios `Authorization: Bearer` interceptor for the React projects, cookie-based JWT middleware for the Next.js project) is already in place.
- 503/no-key error responses surface to the user via existing error rendering.
- No edits made; idempotence rule applied.

See `_AUDIT/apply3_logs/ab3_53.md` for the full per-project breakdown.

## Apply pass 4 (mechanical backlog)

Implemented all 5 mechanical backlog items by appending entries to `src/lib/ai-tools.ts` (the single dynamic AI registry). Each entry inherits the existing dynamic API route (`src/app/api/ai/[tool]/route.ts`) and the existing dynamic FE pages — so a registry entry constitutes both BE endpoint and FE page automatically.

1. `supplier-vetting` — IP / counterfeit / fulfilment-risk score before onboarding.
2. `stockout-risk` — predicts stockout probability over 30 days, recommends reorder qty.
3. `pricing-strategy` — channel-tiered pricing with anchor-based rationale and MAP risk notes.
4. `bundle-suggester` — co-occurrence bundle suggestions with margin uplift estimates.
5. `negative-review-triage` — classify return/complaint, route, public + private response, prevention insight.

Auth: JWT in `ds_session` cookie is already enforced by `src/middleware.ts` on `/api/ai/*`.
Key handling: existing `callOpenRouter` returns a clearly-labelled "(mocked — no key)" preview when `OPENROUTER_API_KEY` is missing — matches project convention rather than 503'ing. No new BE/FE files, no new deps.

`tsc --noEmit` against `tsconfig.json` shows no errors in `src/`. No runtime smoke test (requires Postgres + drizzle push); registry entries are pure data and exercise no runtime branch beyond what is already shipped.
