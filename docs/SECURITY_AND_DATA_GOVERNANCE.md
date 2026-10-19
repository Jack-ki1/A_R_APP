# Security and data governance

## Workspace access

Breakout Radar is intended for a private invite-only label workspace. Supabase RLS and server/database role checks are the authorization boundary; hidden buttons and client route guards are not sufficient security controls.

| Role | Intended work |
| --- | --- |
| Scout | Find candidates, add verified identities, review evidence, move artists through permitted stages |
| Analyst | Analyze and import approved data, review integrity cases, create reports |
| Artist Development | Work on development actions and artist plans |
| Head of A&R | Senior workflow decisions, approve signing, set audience review cadence |
| Admin | Workspace administration and senior workflow actions |

The first Admin must be created by a trusted operator after staging migrations and an invited account exist. Public self-registration must remain disabled. Audit the actual policies and grants in the target Supabase project; checked-in SQL alone cannot prove the hosted state.

## Workflow integrity

- Review saves derive reviewer identity from the authenticated Supabase user and store a rubric version and evidence references.
- Integrity resolution updates the case, artist label, decision history, and audit log atomically. `unknown` is not a clean finding; `suspicious` is not proof. `confirmed_invalid` requires a cited evidence reference.
- Pipeline changes require rationale and are recorded in workflow history. Signed status requires a Head of A&R/Admin and at least two distinct reviewers.
- `0005_auditable_ar_workflows.sql` enforces these writes through RPCs and revokes direct client writes to reviews and integrity cases. Staging tests are still required.

## Source rights, privacy, and retention

Before collection, storage, derivation, or redistribution, record the source agreement, allowed purposes, geographies, definitions, retention limit, redisplay rights, and whether model training is permitted. An importer's free-text authorization reference is an operational attestation only.

Prefer aggregate authorized audience data. Do not infer named individuals, sensitive traits, or individual audience migration from aggregate cohorts. Suppress small groups and honor provider deletion/retention requests. Do not scrape platforms without permission. Do not send confidential label research to an external LLM without an explicit company policy and approval.

MusicBrainz is used for metadata/identity, not popularity. ListenBrainz community aggregates are exploratory, not representative African audience coverage. TikTok/Instagram and other UGC providers are not connected. No source is currently approved for model training by this repository.

## Truthful analytics

- Null, unavailable, stale, and insufficient evidence must not be turned into zero or interpolated values.
- Legacy JSON score, series, event, and demo fields are not authoritative observations.
- No model is trained or validated; no breakout probabilities are available.
- No valid historical A&R backtest is available; demo forecast error was removed.
- No automated integrity verdict, scheduled ingestion, or evidence-backed alert generation is enabled.
- Audience cohort deltas describe aggregate composition changes, not movement of the same people.

## Release evidence still required

Before a private pilot, verify the migration versions and Auth invitation behavior, run the role/RLS/RPC/storage matrix, test backup and recovery, review provider rights, validate exports for authorized roles, deploy the Node server to staging, and perform browser and accessibility checks. Store sanitized evidence without secrets in the label's approved records. No production migration or deployment has been performed by this repository work.
