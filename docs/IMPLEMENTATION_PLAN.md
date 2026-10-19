# Implementation plan

## Phase 0 — verify, protect, stabilize

1. Establish clean branch and reproducible baseline. **Done:** clean `main`, fetched `origin/main`, created `fix/production-intelligence-foundation`; baseline environment recorded in `AUDIT_FINDINGS.md`.
2. Make unsupported metrics/model claims explicit. **In this batch:** distinguish growth rate vs growth factor, reject invalid inputs, stop presenting hand-authored weights as trained/production, gate index output on feature coverage, guard the forecast baseline.
3. Verify auth/RLS in an isolated staging Supabase project. **Blocked on setup:** project URL and credentials are intentionally not requested in chat; a team operator must identify the non-production project and current migration state.
4. Add CI and baseline reproducibility after the current lint baseline is reconciled. Current lint failure is broad formatting drift, so avoid masking it with a giant unrelated format commit.
5. Update audit findings and release evidence with actual command results.

**Acceptance:** no hosted access state is claimed without a staging role matrix; no demo values are described as operational; typecheck/tests/build outcomes are recorded; unvalidated model surfaces say so.

## Phase 1 — canonical intake and evidence foundation

1. Design additive migrations for nullable unmeasured artist fields, source registry, source accounts, candidate intake, ingestion runs and immutable metric observations. Preserve deployed history; use a new migration only.
2. Review the migration against the actual migration journal and test on a disposable/staging database. Add dedupe constraints and rollback/recovery notes before any production proposal.
3. Add authenticated server-side MusicBrainz intake: validated MBID, analyst identity confirmation, idempotent unique source identity, actor/provenance, explicit pending metrics. Keep source search metadata-only.
4. Add a licensed/artist-authorized CSV import template and validation; persist source, period, territory, unit, rights state and import run. Do not accept records without permission attestation and provenance fields.
5. Build a sourced observation view and explicit missing/stale states. Keep synthetic fixtures separate and disabled in production.

**Dependencies:** rights and retention policy, staging Supabase, confirmation of permitted artist exports, deployment runtime choice. No provider credentials should be placed in source control.

## Phase 2 — audience and UGC

1. Resolve cohort definitions, cadence terminology and suppression threshold with the label.
2. Add comparability rules and share-point / count deltas; incompatible cohorts show unavailable rather than a comparison.
3. Integrate only licensed or artist-authorized audience/UGC sources. Record allowed uses, retention, source freshness and coverage per observation.
4. Implement provider status, retries and durable scheduled jobs only after deployment/runtime and quota decisions.

## Phase 3 — human review, integrity and operations

1. Add server-derived reviewer IDs and rubric versions; require separate reviewer sign-off for signing consideration.
2. Make integrity decisions atomic with decision history and evidence references; preserve `unknown` as unreviewed.
3. Add guarded pipeline transitions, ownership, next action, deadlines and workflow history.
4. Generate private reports/alerts from sourced observations only.

## Phase 4 — research and backtesting

1. Agree on target outcome, eligible cohorts, scout capacity K, markets/genres and source training rights.
2. Capture point-in-time feature snapshots and outcomes; keep censored/unobserved outcomes explicit.
3. Compare transparent baselines under rolling chronological splits; publish coverage and uncertainty before any probabilities.
4. Keep model registry state `not_trained` until artifacts and evaluation evidence exist.

## Phase 5 — pilot and hardening

Run a private label pilot with recovery procedures, provider outage drills, role testing, accessibility checks, costs/rights review and A&R feedback. Deploy only through the verified runtime and approved staging-to-production procedure.

## Risks and gates

- **Data rights and availability:** blocks real audience/UGC claims and source ingestion, not nullable adapters or metadata-only identity lookup.
- **Hosted migration state:** blocks any assumption that `0003` protects an existing deployment and blocks production migration.
- **Feature completeness:** blocks index output under the configured 80% heuristic threshold; threshold itself is provisional and not validated.
- **Existing lint debt:** keep baseline visible; fix touched files only and plan a separate style normalization if desired.
- **No label outcomes/history:** blocks scientifically meaningful breakout validation and probabilities.
