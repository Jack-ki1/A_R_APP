# Implementation plan

## Phase 0 — verify, protect, stabilize

1. Establish clean branch and reproducible baseline. **Done:** clean `main`, fetched `origin/main`, created `fix/production-intelligence-foundation`; baseline environment recorded in `AUDIT_FINDINGS.md`.
2. Make unsupported metrics/model claims explicit. **Done in commit `1d1a212`:** distinguish growth rate vs growth factor, reject invalid inputs, stop presenting hand-authored weights as trained/production, gate index output on feature coverage, guard the forecast baseline.
3. Verify auth/RLS in an isolated staging Supabase project. **Blocked on setup:** project URL and credentials are intentionally not requested in chat; a team operator must identify the non-production project and current migration state.
4. Add CI and baseline reproducibility after the current lint baseline is reconciled. Current lint failure is broad formatting drift, so avoid masking it with a giant unrelated format commit.
5. Update audit findings and release evidence with actual command results.

**Acceptance:** no hosted access state is claimed without a staging role matrix; no demo values are described as operational; typecheck/tests/build outcomes are recorded; unvalidated model surfaces say so.

## Phase 1 — canonical intake and evidence foundation

1. **Implemented, staging verification pending:** additive migration `0004_evidence_foundation.sql` makes metrics nullable and adds source, identity, intake, ingestion and observation tables/RPCs. No existing migration was rewritten.
2. **Not run:** migration application, SQL compilation against target PostgreSQL, RLS/integration tests, backup/rollback validation. These require a disposable staging Supabase project.
3. **Implemented:** authenticated MusicBrainz verification and explicit “Confirm identity & Add to Radar” flow. Dedupe is enforced by canonical MBID and source-account uniqueness; the candidate remains `monitoring_pending` with missing metrics.
4. **Implemented:** header-only downloadable metric and audience CSV templates, validation, rights-reference/attestation, transactional imports, and per-record lineage. Imported data is not enabled for model training.
5. **Implemented:** profile displays sourced observations; normal artist queries exclude demo rows; no-data values stay null. Audience comparisons require comparable rights/taxonomy/denominator/coverage and only show count deltas from supplied counts. UGC page now says `Not connected` and does not render fixture scores/events.

**Dependencies:** rights and retention policy, staging Supabase, confirmation of permitted artist exports, deployment runtime choice. No provider credentials should be placed in source control.

## Phase 2 — audience and UGC

1. Comparability rules and upload schema are implemented; cadence preference choices are explicit (`manual`, every 14 days, twice monthly, every two months) and default to `manual`. This records review intent only; no recurring import is scheduled.
2. Compatible imported snapshots show share-point change and supplied raw-count delta; mismatched or low-coverage cohorts show unavailable.
3. No platform audience or UGC provider is connected. UI states this clearly; no provider scraping or fabricated posts are used.
4. Retries/scheduled jobs are not implemented; choose a durable runtime and provider terms/quotas first.

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
