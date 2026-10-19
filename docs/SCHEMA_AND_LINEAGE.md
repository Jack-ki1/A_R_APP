# Schema and lineage

## Current checked-in schema

Migration order is `0000_migration.sql` → `0001_review_mode_notes.sql` → `0002_next_phase_modules.sql` → `0003_secure_workspace.sql`.

- `artists` stores canonical ID, identity, non-null `audience_current`, `growth_30d`, `expected_growth_30d`, confidence, JSON scores/series/events/evidence, and `is_demo`.
- `audience_snapshots` stores artist, reference date/window, free-form source, total and JSON segments. It has no source registry, cohort schema, rights snapshot or comparability constraint.
- Notes, audit log, reviews, integrity cases, alerts and tasks exist, but review actor is free text and cases/reviews lack immutable decision history.
- `0002` creates broad anon policies; `0003` attempts to revoke them and remove demo artists. Application state is unverified.

`artists.scores`, `series`, `events` and seeded values are legacy/demo read state, not source observations. They must not be reinterpreted as real historical evidence.

## Proposed additive lineage

```text
data_sources → ingestion_runs → metric_observations → derived features / read models
                                  ↑                               ↓
artist_source_accounts → artists              model_predictions / alerts / reports
candidate_intake ──────────────────────────────┘
```

Add, in later migrations after staging validation:

1. `data_sources` with rights status, allowed uses, coverage, retention and terms review.
2. `artist_source_accounts` with normalized external identity and unique `(source, external_artist_id)`.
3. `candidate_intake` with authenticated submitter, status and provenance.
4. `ingestion_runs` with status, counters, retry and error metadata.
5. `metric_observations` with source, artist/track, metric definition, exact time window, observed/ingested times, territory, unit/value, rights snapshot, run and quality status.
6. `audience_cohort_snapshots` with taxonomy/version, dimension, segment, denominator, period and completeness.
7. Later workflow/review/integrity history, model registry, point-in-time feature snapshots and outcome/backtest artifacts only when the product is ready to use them.

## Constraints and migration order

- First verify deployed schema and back up staging. Never edit applied migrations or reset a hosted database.
- Make unmeasured metrics nullable before candidate intake; do not insert zero to satisfy existing constraints.
- Use checks for valid windows, percentages and nonnegative counts; use indexes on artist/time and source/status.
- For nullable uniqueness, use an explicit normalized key or a supported `NULLS NOT DISTINCT` index after checking PostgreSQL version.
- Keep raw provider payloads only when terms allow; otherwise store normalized permitted fields and a source reference/hash.
- Attach provenance and rights snapshots to each observation so later policy changes do not erase historical context.
- Any derived metric records formula/version, input observation IDs, calculation time and exclusions.
- Retention/deletion should follow the strictest source contract and be auditable; do not assume indefinite storage rights.
