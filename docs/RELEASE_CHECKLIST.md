# Release checklist

## Local commands

- [x] `git status --short` clean before work; `git fetch origin main` succeeded; branch created from fetched `main`.
- [x] Record Node/npm versions (`node -v`, `npm -v`).
- [ ] `npm ci` — not run; existing `node_modules` present.
- [x] `npm run typecheck` — passed after Phase 0 changes.
- [x] `npm test` — passed, 2 files / 8 tests.
- [x] `npm run build` — passed; Vite 8 client and Nitro Node server artifacts generated.
- [x] Scoped ESLint on modified TypeScript files — passed.
- [ ] Full `npm run lint` — fails on extensive Prettier drift across the pre-existing codebase (baseline: 656 errors, 7 warnings; after this batch: 667 errors, 7 warnings, including formatting findings in untouched files). Do not release until resolved or a scoped lint policy is agreed.

## Data and security gates

- [ ] Confirm staging project and migration version; prove `0003_secure_workspace.sql` applied there.
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
- [ ] Reports/exports carry source, as-of date, coverage and limitations.
