# Schema and lineage

## Current checked-in schema

Migration order is `0000_migration.sql` → `0001_review_mode_notes.sql` → `0002_next_phase_modules.sql` → `0003_secure_workspace.sql` → `0004_evidence_foundation.sql` (authored in this branch; **not applied**).

- `artists` stores canonical ID, identity, non-null `audience_current`, `growth_30d`, `expected_growth_30d`, confidence, JSON scores/series/events/evidence, and `is_demo`.
- `audience_snapshots` stores artist, reference date/window, free-form source, total and JSON segments. It has no source registry, cohort schema, rights snapshot or comparability constraint.
- Notes, audit log, reviews, integrity cases, alerts and tasks exist, but review actor is free text and cases/reviews lack immutable decision history.
- `0002` creates broad anon policies; `0003` attempts to revoke them and remove demo artists. Application state is unverified.

`artists.scores`, `series`, `events` and seeded values are legacy/demo read state, not source observations. They must not be reinterpreted as real historical evidence.

Migration `0004_evidence_foundation.sql` makes legacy metric columns nullable, adds `data_sources`, `artist_source_accounts`, `candidate_intake`, `ingestion_runs`, and `metric_observations`, and adds source/rights/taxonomy/coverage/count lineage to `audience_snapshots`. It adds role-checked transactional RPCs for MusicBrainz intake, metric/audience imports, and saving an exact audience review cadence preference. Cadence defaults to manual and is not a job schedule. Direct client writes to the new provenance tables are revoked; authenticated members receive read access under team RLS.

## Proposed additive lineage

```text
data_sources → ingestion_runs → metric_observations → derived features / read models
                                  ↑                               ↓
artist_source_accounts → artists              model_predictions / alerts / reports
candidate_intake ──────────────────────────────┘
```

Add, in later migrations after staging validation:

1. `data_sources` carries rights status, allowed uses, coverage, retention and terms review.
2. `artist_source_accounts` normalizes external identity with unique `(source, external_artist_id)`.
3. `candidate_intake` records authenticated submitter, status and provenance.
4. `ingestion_runs` records status, counters and error metadata.
5. `metric_observations` records metric definition, exact window, observed/ingested time, territory, unit/value, rights snapshot, run and quality status.
6. `audience_snapshots` now records taxonomy/version, denominator, period, coverage, rights reference, quality and actual segment counts.
7. Workflow/review/integrity history, model registry, point-in-time feature snapshots and outcome/backtest artifacts remain later-phase work.

## Constraints and migration order

- First verify deployed schema and back up staging. Never edit applied migrations or reset a hosted database.
- Make unmeasured metrics nullable before candidate intake; do not insert zero to satisfy existing constraints.
- Use checks for valid windows, percentages and nonnegative counts; use indexes on artist/time and source/status.
- For nullable uniqueness, use an explicit normalized key or a supported `NULLS NOT DISTINCT` index after checking PostgreSQL version.
- Keep raw provider payloads only when terms allow; otherwise store normalized permitted fields and a source reference/hash.
- CSV imports record the operator supplied authorization reference and set rights state to `operator_documented`; this is an auditable attestation, not legal review. The import never grants model-training permission.
- Attach provenance and rights snapshots to each observation so later policy changes do not erase historical context.
- Any derived metric records formula/version, input observation IDs, calculation time and exclusions.
- Retention/deletion should follow the strictest source contract and be auditable; do not assume indefinite storage rights.
