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

1. **Implemented in migration 0005 and UI:** server-derived reviewer IDs, rubric versions, evidence references, atomic review insert/status update, and distinct reviewer count for signing consideration.
2. **Implemented in migration 0005 and UI:** atomic integrity case resolution, immutable decision row, actor, reason, outcome, and audit event. Unknown remains an allowed outcome; suspicion remains a human classification.
3. **Implemented in migration 0005 and UI:** guarded stage RPC with rationale, server role check, audit trigger, and workflow history. Stage rationale is required; signing requires Head of A&R/Admin and two distinct reviewers.
4. **Implemented in UI:** reports export accepted source-linked metric observations with source ID, window, freshness, territory, and rights status. Demo alerts and cases are excluded from operational views. Rule-generated alerts remain unimplemented until real ingestion rules exist.
5. **Pending external validation:** all RPC behavior and role boundaries require migration application and adversarial tests in staging.

## Phase 4 — research and backtesting

1. **Product status implemented:** predictions page reports `not trained`; backtesting page says no validated backtest is available. Removed demo-derived forecast error tables and heuristic ranking from the prediction surface.
2. Agree on target outcome, eligible cohorts, scout capacity K, markets/genres and source training rights.
3. Capture point-in-time feature snapshots and outcomes; keep censored/unobserved outcomes explicit.
4. Compare transparent baselines under rolling chronological splits; publish coverage and uncertainty before any probabilities. This research work is blocked by absent licensed history and outcome labels.

## Phase 5 — pilot and hardening

**Preparation implemented:** private pilot runbook and CI workflow for lockfile install, typecheck, unit tests, and build. The pilot itself, recovery drills, full role matrix, accessibility review, hosting adapter verification, and cost/rights review require label-owned environments and staff; they have not been claimed as completed.

## Risks and gates

- **Data rights and availability:** blocks real audience/UGC claims and source ingestion, not nullable adapters or metadata-only identity lookup.
- **Hosted migration state:** blocks any assumption that `0003` protects an existing deployment and blocks production migration.
- **Feature completeness:** blocks index output under the configured 80% heuristic threshold; threshold itself is provisional and not validated.
- **Existing lint debt:** keep baseline visible; fix touched files only and plan a separate style normalization if desired.
- **No label outcomes/history:** blocks scientifically meaningful breakout validation and probabilities.
