# Implementation Status — Delivery A (first-run, Discover fix, evidence status)

## Run context

| Field | Value |
| --- | --- |
| Date / time | 19 October 2026, 10:15–13:35 UTC |
| Branch | `fix/evidence-driven-pilot` (created from `main`) |
| Base commit | `c4382fd` ("add_2") |
| Commits | `2ea972f` (Delivery A), `6bd080c` (follow-up: authoritative import counts, artistsQuery error state), later work through `0e90d06` (see "Subsequent deliveries") |
| Environment inspected | WSL2 Linux, Node v24.21.0, npm 11.19.0 |
| Stack | React 19, TanStack Start/Router, Vite 8, Nitro, Tailwind v4, Supabase Auth/Postgres, Vitest |
| Migrations changed | **none** (no SQL written, no schema applied) |

## Scope delivered

Delivery A of the masterplan: baseline verification, the Discover filtering bug, the first-run
on-ramp, evidence-based dashboard honesty, table/responsive fixes, and documentation.

## Observed behavior before edits (verified, not assumed)

- `npm run typecheck`, `npm test` (16 tests), `npm run build` all passed at `c4382fd`.
- `npm run lint` reported 47 problems (43 errors, 4 warnings), all pre-existing Prettier debt in
  untouched files. Unchanged by this work (still 47 problems after it); every file touched here
  lints clean.
- `/radar` with zero artists rendered a blank "Today's Breakouts" table, an always-on `DEMO`
  badge in the hero (even with no demo rows), a hardcoded `—` for audience shifts, and a
  "Predictions validated" KPI for a model that does not exist.
- `/discover` filtered with
  `(sc(a).momentum ?? -1) >= 0 && a.growth_30d != null && a.growth_30d >= 0`,
  so every newly onboarded artist (NULL growth, no score) was hidden by default even though the
  empty-state text claimed otherwise.
- `/discover` had no artist search; the MusicBrainz intake lived only on `/sources`, while the
  sidebar calls `/discover` "Find artists".
- Read-only probe of the configured Supabase project (publishable key only, no secrets printed):
  `artists`, `user_roles`, `audience_snapshots`, `artistic_reviews`, `integrity_cases`,
  `saved_searches`, `alerts`, `dev_tasks`, `audit_log` exist and return `42501 permission denied`
  for `anon` (correct RLS behavior). `data_sources`, `candidate_intake`, `ingestion_runs`,
  `metric_observations`, `artist_source_accounts`, `integrity_decisions`, `workflow_history`
  return `PGRST205 could not find the table` → **migrations `0004` and `0005` are not applied**
  there. Auth (`GoTrue`) is healthy (HTTP 200).

## Changed files

| File | Change |
| --- | --- |
| `src/lib/discover.ts` | **new** — pure filter/tab rules: opt-in thresholds, never coerce unknown to 0, five cohort tabs, tab counts |
| `src/lib/first-run.ts` | **new** — onboarding step model and progress states |
| `src/lib/artists.ts` | **new** `evidenceSummaryQuery` — accepted observations/snapshots with exact counts, distinct artists, freshness, truncation flag; errors throw (never render as 0) |
| `src/components/artist-intake.tsx` | **new** — shared MusicBrainz search + confirm-and-add intake (moved out of `sources.tsx`), invalidates `["artists"]`, `["artist", id]`, `["data_sources"]`, toasts, navigates to profile |
| `src/components/first-run.tsx` | **new** — `FirstRunChecklist` (six steps + 3-step progress) and `NeedsEvidenceCard` |
| `src/components/br-ui.tsx` | **new** `StatusBadge` (live/imported/partial/off/unvalidated); `DEMO` badge left reserved for real fixtures |
| `src/routes/_authenticated/discover.tsx` | tabs with counts, opt-in threshold checkboxes, intake panel, honest empty states, `aria-label`s, "—" for unknown momentum |
| `src/routes/_authenticated/radar.tsx` | first-run/needs-evidence cards, evidence-driven KPI order and gating, source-health panel with error state, "Awaiting integrity verification" queue, hero `DEMO` removal and "Find an artist" CTA, table `min-w`, `scope="col"`, per-cell padding, priority "—" for unscored, clean-cohort explanation, audit-error state, artistsQuery error state |
| `src/routes/_authenticated/sources.tsx` | uses shared `ArtistIntakeSearch` (net −143 lines, behavior preserved); import success message now reports accepted vs submitted and flags skipped rows |
| `src/lib/source.functions.ts` | `importAuthorizedMetricRows` now counts actual inserted rows after the RPC (which uses `on conflict do nothing`) instead of echoing the submitted count |
| `src/test/fixtures.ts` | **new** — complete artist row fixtures |
| `src/test/discover.test.ts` | **new** — 9 filter/tab/threshold tests |
| `src/test/first-run.test.tsx` | **new** — 3 tests (step model + rendered checklist) |
| `src/test/dashboard-pages.test.tsx` | **new** — 5 tests rendering Discover and Home against a mocked Supabase client |
| `README.md` | Home, Discovery, Tests and Current verification sections updated to match reality |

No migration files, no schema, no route paths, no styling system and no dependencies were changed.

## Bugs reproduced vs assumptions

Reproduced with running code:

1. Discover hides unmeasured artists by default → now reproduced *and fixed*, covered by
   unit tests (unknown growth never coerced to 0) and a rendered-page test.
2. Empty Home is a dead end (blank table, no route onward) → fixed with `FirstRunChecklist`.
3. `DEMO` badge shown on a workspace with no demo rows → removed from the hero.
4. Breakouts KPI counted `0` with no baseline → now shows `—` until a growth baseline exists.
5. MusicBrainz intake only reachable through Settings → added to "Find artists".
6. Direct database inspection via `DATABASE_URL` fails with `ENETUNREACH` (IPv6 literal, no v6
   route from this host) → schema checks were done read-only over the REST API instead.
7. `import_authorized_metric_rows` returned the submitted row count as "accepted" even though the
   RPC inserts with `on conflict do nothing` → fixed in the server function by counting actual
   inserted rows after the RPC call.
8. Home rendered the first-run checklist when `artistsQuery` failed (indistinguishable from an
   empty workspace) → fixed by switching to `useQuery` with an explicit error panel.

Still unknown / not proven here:

- Whether migrations `0004`/`0005` are applied anywhere (staging not provided; see BLOCKED).
- Actual RLS/role matrix behavior for signed-in users (no test account in this environment).
- Browser E2E: Playwright Chromium cannot start (`libnspr4.so` missing, no root to install it).

## Tests run

| Command | Result |
| --- | --- |
| `npm run typecheck` | pass, 0 errors |
| `npm test` | **32 passed / 32** (6 files; was 16) |
| `npm run build` | pass (`✓ built`, nitro output generated) |
| `eslint` on changed files | pass, 0 problems |
| `npm run lint` (repository) | 47 problems — identical to baseline, all pre-existing debt elsewhere |
| `vite dev` + `curl` smoke | `/` → 307, `/auth` → 200, `/radar` → 200, no server errors in log |

## Sample tested evidence flow (anonymized)

1. Operator onboards MusicBrainz artist `MBID 84c2e4a0-…` (mocked in tests as
   `00000000-0000-0000-0000-000000000001`, "Newcomer"): row lands with `growth_30d = NULL`,
   `scores = {}`, `integrity = unknown`.
2. Home: `Artists monitored = 0 → 1`, breakouts `—`, source health shows "No observations yet",
   and the artist appears in the "Awaiting integrity verification" queue (never in the clean
   cohort, never labelled organic).
3. Discover: "All tracked" count includes it; "Growth-qualified" excludes it;
   "Needs first observation" includes it; enabling the growth threshold is the only way it
   disappears, and the copy says so.
4. After an authorized import (not run here — blocked), `evidenceSummaryQuery` would report the
   accepted row count, distinct artists and latest window end; a failure renders an error banner,
   not a zero.

## Subsequent deliveries (recorded after Delivery A)

| Commit | What shipped |
| --- | --- |
| `06a9764` | docs: record the Delivery A follow-up fixes in this file |
| `41d78c8` | per-user provider connections (migration `0006`) and the breakout prediction model (`ml/train.py`, `ml/model.json`, `src/lib/ml*`, migration `0007`) |
| `e76641f` | the `vault` extension is unavailable in the owner's Postgres → migration `0006` rewritten and encryption moved to Node.js AES-256-GCM (`src/lib/crypto.ts`, env `PROVIDER_ENCRYPTION_KEY`) |
| `988644c` | sidebar reduced from 14 entries to 5 sections |
| `0e90d06` | sidebar reduced to 3 sections (Home, Find artists, Settings); the roster merged into `/discover` (`src/components/roster-panel.tsx`, `?q=` filter); data sources, alerts, reports, forecasts and backtests merged into `/settings` as anchored sections (`src/components/settings/*`) with their route files deleted; `/pipeline`, `/development`, `/integrity`, `/audience`, `/ugc` unlinked from the nav but kept and linked from Home |

Gates at `0e90d06`: `npm run typecheck` clean; `npm test` 35/35 across 6 files; `npm run build`
regenerates the route tree and succeeds; full `npm run lint` reports 34 problems (baseline 47, all
pre-existing elsewhere — deleting the six route files removed their debt); touched files are
prettier-clean. The built server boots and serves (root returns HTTP 307 to the auth/landing
redirect). Browser E2E and live Supabase flows remain blocked exactly as listed below; migrations
`0004`–`0007` are still unapplied.

## BLOCKED — owner inputs required

1. **Apply migrations `0004_evidence_foundation.sql` and `0005_auditable_ar_workflows.sql`** to
   the staging Supabase project referenced in `.env` (read-only probe shows they are absent, so
   `intake_musicbrainz_candidate`, both import RPCs and the workflow RPCs cannot exist).
   Approval + confirmation that the project is staging are required before any schema write.
2. **IPv4-reachable database URL (Supabase pooler host) or an owner-run SQL session**, so
   migration/RLS state can be inspected from this environment.
3. **Staging invite/test account** (Head of A&R or Analyst role) for authenticated end-to-end
   verification of intake, imports, RLS denial cases, and for browser E2E.
4. **One verified MusicBrainz artist** agreed as the smoke-test identity, and one authorized
   metric export plus two compatible audience snapshots when Delivery B/C start.
5. **Browser E2E environment**: a machine/container where Playwright Chromium can run
   (system libs present) or approval to add those packages.

No credentials, connection strings, keys or artist-confidential data were written to any file,
log or commit.

## Deployment impact and rollback

- Purely additive client/server code plus edits to three route files; no SQL, no RLS change, no
  new dependency, no environment variable, no route path change.
- Rollback: `git revert` of the Delivery A commit restores the previous UI; no data migration to
  undo. Existing saved searches from older versions still load (missing keys fall back to
  "threshold off" rather than silently filtering).
- If/when `0004`+`0005` are applied to staging, take a backup first and follow
  `docs/OPERATIONS_GUIDE.md`; this work does not depend on new schema.

## Next prioritized tasks (max 5)

1. Owner applies `0004`+`0005` to staging; then verify intake → profile → Discover → Home
   end-to-end with a real MBID and a signed-in test account.
2. Delivery B: read-only derived layer over `metric_observations` (observed growth, freshness,
   coverage) feeding Home/Discover instead of legacy `artists.growth_30d`, plus import dry-run
   preview and authoritative accepted/rejected counts from the RPC.
3. Browser smoke suite once Playwright can run: empty first-run, intake, threshold tabs,
   light/dark, mobile table scroll.
