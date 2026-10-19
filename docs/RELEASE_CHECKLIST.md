# Release checklist

## Local commands

- [x] `git status --short` clean before work; `git fetch origin main` succeeded; branch created from fetched `main`.
- [x] Record Node/npm versions (`node -v`, `npm -v`).
- [ ] `npm ci` — not run; existing `node_modules` present.
- [x] `npm run typecheck` — passed after Phase 3/4/5 changes.
- [x] `npm test` — passed, 3 files / 16 tests.
- [x] `npm run build` — passed; Vite 8 client and Nitro Node server artifacts generated.
- [x] Scoped ESLint on changed workflow/report TypeScript files — passed.
- [ ] Full `npm run lint` — fails on extensive Prettier drift across the pre-existing codebase (baseline: 656 errors, 7 warnings; after this batch: 667 errors, 7 warnings, including formatting findings in untouched files). Do not release until resolved or a scoped lint policy is agreed.

## Data and security gates

- [ ] Confirm staging project and migration version; prove `0003_secure_workspace.sql` applied there.
- [ ] Review and apply migration `0004_evidence_foundation.sql` in staging; verify RPCs, constraints, grants, deduplication, and rollback before proposing production rollout.
- [ ] Review and apply migration `0005_auditable_ar_workflows.sql` in staging; validate invited-user semantics, actor-derived workflow RPCs, two-review signing gate, and role matrix.
- [ ] Verify generated Supabase types against the migrated staging schema.
- [ ] Complete role/RLS/storage/RPC matrix in `SECURITY_TEST_RESULTS.md`.
- [ ] Disable public sign-ups; verify invited-user flow and admin bootstrap.
- [ ] Review provider contracts, data rights, retention and territories; no scraping.
- [ ] Verify no synthetic fixtures enter operational rank, alert or export.
- [ ] Confirm current deployment adapter/runtime with a built server artifact and staging deployment.
- [ ] Verify backup/recovery and migration rollback plan before any production schema change.

## Product truthfulness gates

- [ ] Missing/stale evidence is represented as unavailable, never as a fabricated zero.
- [ ] Index labels remain `not_validated`; no probabilities without a validated model artifact/evaluation.
- [ ] Audience comparison only runs for compatible definitions and sourced snapshots.
- [ ] UGC remains `Not connected` unless an authorized source is configured.
- [ ] Verify CSV import with synthetic test rows in a disposable staging database, including retry/dedupe, unauthorized role, bad MBID, mismatched cohorts and invalid counts.
- [ ] Reports/exports carry source, as-of date, coverage and limitations.

## Phase 3–5 readiness

- [x] Review, integrity resolution, and pipeline moves use server-side actor-derived RPCs with audit/history.
- [x] Forecast error and model ranking surfaces no longer present demo-derived success claims.
- [x] CI workflow runs lockfile install, typecheck, unit tests, and production build.
- [x] Private pilot operations and release gates documented in `PILOT_RUNBOOK.md`.
- [ ] Staging Supabase migration/RLS tests, provider rights review, and private deployment pilot remain external prerequisites.
