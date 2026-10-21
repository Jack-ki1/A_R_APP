# opencode.md — Session summary

Breakout Radar (`Jack-ki1/A_R_APP`, local: `/home/jackson11/projects/clients_projects/MUSIC_APP/A_R_APP_v1`).

---

## 1. Project context (carried into this session)

Evidence-driven internal A&R web app for emerging African artists, per the masterplan. Stack is
preserved deliberately: React 19 + TanStack Start/Router, Vite 8/Nitro, Tailwind v4, Supabase
Auth/Postgres/RLS, Vitest. No framework migration; visual identity (lime action color) kept.

Standing rules for all work in this repo:

- Never fabricate metrics: `NULL ≠ 0`, unknown renders as "—", `DEMO` badge only for real fixtures.
- No schema resets, no production migrations, no RLS weakening.
- Baseline `npm run lint` was **47 problems (43 errors, 4 warnings)** — all pre-existing prettier
  debt in untouched files. Never run `prettier --write` on the whole README (churns every table;
  both `README.md` and `docs/IMPLEMENTATION_STATUS.md` fail prettier at baseline by design).
- Gates before every commit: `npm run typecheck`, `npm test`, `npm run build`, `npx eslint <touched
  files>` + `npx prettier --check <touched files>`.
- Git: work is on **`main`** (previously `fix/evidence-driven-pilot`, fast-forward merged).
  Remote `origin` uses SSH (`git@github.com:Jack-ki1/A_R_APP.git`); local key authenticates as
  `Jack-ki1`. Commits are pushed with `git push -u origin main`.
- `.env` is gitignored and holds a generated `PROVIDER_ENCRYPTION_KEY` (never committed/logged).
  Rotating it makes stored provider keys undecryptable.
- TanStack route files must not export page components (breaks code splitting); tests mount pages
  via `Route.options.component` through the `pageComponent(route)` helper.
- `<Link to="/discover">` requires `search={{ q: undefined }}` (discover now has `validateSearch`).
- New code must satisfy `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; role checks in
  server functions are inlined (a typed helper triggers `TS2589`).

### Work completed before this chat

- **Delivery A** (`2ea972f`): Discover filter fix (unknown metrics never hidden), first-run on-ramp,
  evidence-driven Home, shared `ArtistIntakeSearch`, `evidenceSummaryQuery`, StatusBadge, tests 16→32.
- **Follow-up** (`6bd080c`): authoritative import accepted-count (post-RPC inserted-row count);
  `artistsQuery` error state on Home (`useQuery` instead of `useSuspenseQuery`).
- **Docs** (`06a9764`): delivery record in `docs/IMPLEMENTATION_STATUS.md`.
- **Provider connections + ML** (`41d78c8`): migration `0006_provider_connections` (vault-free
  rewrite), `0007_ml_predictions`; `src/lib/crypto.ts` (AES-256-GCM); provider connect/test/disconnect
  server functions; YouTube search wired; ML train in Python (`ml/train.py`, AUC 0.7041, synthetic
  data), predict in Node (`ml/model.json`, `src/lib/ml.ts`); `/predictions` route.
- **Vault fix** (`e76641f`): owner's Postgres lacks the `vault` extension → encryption moved to
  Node.js AES-256-GCM (`PROVIDER_ENCRYPTION_KEY`, scrypt-derived, ciphertext `iv:authTag:ciphertext`).
- **Nav round 1** (`988644c`): sidebar 14 entries → 5 (Home, Find artists, Pipeline, Audience,
  Settings) with prefix `match` arrays, mobile Sections menu, in-page links from Pipeline/Audience.

### Known blockers (still open)

- Migrations `0004`, `0005`, `0006`, `0007` **not applied** to the configured Supabase cloud project
  (owner applies manually in the SQL editor; `0006` previously failed on `create extension vault`
  and was fixed; `0007` pending).
- `DATABASE_URL` unreachable (IPv6 ENETUNREACH); no psql/supabase CLI/Docker/root → no direct DB
  inspection.
- Playwright blocked (`libnspr4.so` missing, no root) → no browser E2E; no signed-in test account,
  so live RLS/intake/provider flows cannot be verified end-to-end from this environment.

---

## 2. This chat — task

Answering "What did we do so far?", then executing the confirmed information-architecture
consolidation (decisions pre-confirmed via question round):

- Sidebar down to **3 sections: Home · Find artists · Settings**.
- **Merge content into single pages**: roster (`/artists`) → Discover; `/sources`, `/alerts`,
  `/reports`, `/predictions`, `/backtesting` → Settings (their routes deleted).
- Pages `/pipeline`, `/development`, `/integrity`, `/audience`, `/ugc`: **keep routes, unlink from
  nav**, reachable via in-page links.

---

## 3. Research done before writing code

- Read in full: `discover.tsx`, `artists.index.tsx`, `settings.tsx`, `sources.tsx` (748 lines),
  `alerts.tsx`, `reports.tsx`, `predictions.tsx`, `backtesting.tsx`, `route.tsx`, `radar.tsx`,
  `first-run.tsx`, `first-run.ts`, `dashboard-pages.test.tsx`, `first-run.test.tsx`, `musicbrainz
  .functions.ts` (pulse type), `ml.functions.ts`.
- Grepped all inbound links to the six doomed routes: `artists.$id.tsx:82`, `pipeline.tsx:80`,
  `route.tsx` (NAV/SUB_PAGES/header search), `settings.tsx` (`SettingsLink` union), `first-run.tsx`
  (×2 `/sources`), tests (`dashboard-pages` `/sources` path, `first-run.test` `/sources` route).
- Confirmed no non-route-tree imports of the deleted files (only `routeTree.gen.ts`, regenerated by
  the build).
- Checked `Panel` signature in `br-ui.tsx` (no `id` prop → anchors go on wrapper `<div>`s).
- Verified TanStack Router v1.170.41: `useLoaderData`/`useSearch` accept `strict: false` and
  delegate to `useMatch`, which is safe when a component is mounted outside its own route (how the
  tests render pages).

---

## 4. Implementation

### New files

| File | Purpose |
| --- | --- |
| `src/components/roster-panel.tsx` | Roster card grid moved from `artists.index.tsx`; props `{ initialQuery: string }` seeds the name/city/genre filter; syncs via `useEffect` when the URL `q` changes. |
| `src/components/settings/sources-section.tsx` | Former `/sources` content (pulse, intake, CSV imports, provider connections, YouTube search, coverage, cadence, API caveats). Props `{ pulse, pulseError }` replace `Route.useLoaderData()`; exports `type Pulse`. |
| `src/components/settings/alerts-section.tsx` | Former `/alerts` content (`useSuspenseQuery(tableQuery("alerts"))`). |
| `src/components/settings/reports-section.tsx` | Former `/reports` content (evidence report + pipeline overview). |
| `src/components/settings/predictions-section.tsx` | Former `/predictions` content (model metadata, run action, readiness gates). |
| `src/components/settings/backtesting-section.tsx` | Former `/backtesting` content. |
| `src/lib/reports.ts` | `observationsQuery` moved out of `reports-section.tsx` (fixes `react-refresh/only-export-components` warning; shared with the Settings loader). |

The five section components were produced by transforming the original route files with a Node
script (strip `createFileRoute`/route def, export the component), preserving code exactly.

### Rewritten pages

- **`src/routes/_authenticated/discover.tsx`**
  - Added `validateSearch: (s) => ({ q: typeof s.q === "string" ? s.q : undefined })`.
  - Reads `q` via `useRouterState({ select: s => s.location.search["q"] … })` (not
    `Route.useSearch()`), so the component still mounts standalone in tests.
  - Renders `<RosterPanel initialQuery={rosterQuery ?? ""} />` below the cohort grid.
- **`src/routes/_authenticated/settings.tsx`**
  - Loader: `Promise.all([getListenBrainzPulse() (try/catch → null), ensureQueryData(alerts),
    ensureQueryData(artists), ensureQueryData(observations)])`, returning `{ pulse, pulseError }`.
  - Component: admin panel → anchor jump nav (`#sources`, `#alerts`, `#reports`, `#predictions`,
    `#backtesting`, each wrapper `scroll-mt-20`) → the five sections → Roles → Evidence policy.
  - Reads loader data with `useLoaderData({ strict: false })` + fallback (test-mountable).
  - `SettingsLink` union to deleted routes removed.
- **`src/routes/_authenticated/route.tsx`**
  - `NAV` = 3 items; Find artists gets `match: ["/artists"]` so artist profiles still highlight it.
  - `SUB_PAGES` deleted; mobile menu now lists only the three destinations.
  - Header search: `navigate({ to: "/discover", search: { q } })`.
  - Unused `Kanban`/`PieChart` icon imports removed.
- **`src/routes/_authenticated/radar.tsx`** (Home)
  - New "Workspace sections" panel linking all five unlisted pages (`/pipeline`, `/audience`,
    `/development`, `/integrity`, `/ugc`) so they stay reachable on desktop and mobile.
  - Hero "Find an artist" link gained `search={{ q: undefined }}`.

### Link fixes

- `artists.$id.tsx:82`: back link `/artists` → `/discover` (label "Artists" kept).
- `pipeline.tsx:80`: "Artist roster" link `/artists` → `/discover`.
- `first-run.tsx`: both `/sources` links → `/settings`; both `/discover` links gained
  `search={{ q: undefined }}`.
- `src/lib/first-run.ts`: step text "Discover or Data sources" → "Discover or Settings".

### Deleted route files

`artists.index.tsx`, `sources.tsx`, `alerts.tsx`, `reports.tsx`, `predictions.tsx`,
`backtesting.tsx` — `src/routeTree.gen.ts` regenerated by `npm run build` (129 lines removed).

### Tests

- `dashboard-pages.test.tsx`
  - Child routes: `/sources` → `/settings`, added `/development`, `/integrity`, `/ugc` (needed by
    the new Home links); imported `SettingsRoute`.
  - Discover assertions scoped to the cohort panel via a new `cohortPanel()` helper (`within()`),
    because the roster renders the same artist names a second time (this was the only test failure
    during the round).
  - New tests: **roster on the same page** (shows demo fixtures the cohort excludes; filter works),
    **Home links every unlisted workspace section**, **Settings merges all five former pages**
    (headings + `#sources` anchor).
- `first-run.test.tsx`: fake `/sources` route and href assertion → `/settings`.
- Total: **35 tests across 6 files, all passing** (was 32).

---

## 5. Gates and verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Clean (first run failed on 3 `<Link to="/discover">` missing `search` — fixed). |
| `npm test` | 35/35 (first run: 3 failures from duplicate "Newcomer" matches — fixed by scoping). |
| `npm run build` | Succeeds; route tree regenerated. |
| `npx eslint <touched files>` | Clean (fixed the fast-refresh warning by moving `observationsQuery` to `src/lib/reports.ts`). |
| `npx prettier --check <touched files>` | Clean (reformatted only `settings.tsx` and `dashboard-pages.test.tsx`, both written this session). |
| `npm run lint` (full) | **34 problems (30 errors, 4 warnings)** — down from baseline 47; deletions removed pre-existing debt, zero new issues. |
| Runtime smoke | Built server (`node .output/server/index.mjs`) boots and serves: root → **HTTP 307** (auth/landing redirect). |
| MD prettier | `README.md` + `docs/IMPLEMENTATION_STATUS.md` fail prettier — verified **pre-existing at `988644c`** via `git show` + `prettier --check`; intentionally not reformatted. |

---

## 6. Documentation

**`README.md`**

- Product map: five-section table → three-section table; explains unlisted routes and the six
  removed routes.
- Page sections: "Artists" (roster now on Find artists, header search → `/discover?…`), "Discovery"
  (roster panel paragraph), "Pipeline" (no longer top-level; linked from Home), "Settings" (sections
  rendered directly, anchor jump list), "Forecast readiness"/"Backtest readiness"/"Data sources"
  intros reworded to sections of Settings.
- Route table: deleted rows removed; new note about where the content moved; `discover`, `radar`,
  `pipeline`, `settings` responsibilities updated.
- `src/components`: added `roster-panel.tsx`, `settings/`, `first-run.tsx`; `src/lib`: added
  `reports.ts`; Tests: dashboard-pages description updated.

**`docs/IMPLEMENTATION_STATUS.md`**

- Commits row extended; new "Subsequent deliveries" table recording `06a9764`, `41d78c8`,
  `e76641f`, `988644c`, `0e90d06` plus the gate results at `0e90d06`.

---

## 7. Commits (both pushed to `origin/main`)

```
7528744 docs: record provider/ML deliveries and the 3-section navigation consolidation
0e90d06 refactor(nav): reduce sidebar to 3 sections; merge roster and tool pages
988644c refactor(nav): reduce sidebar from 14 entries to 5 essential sections   (previous)
```

`0e90d06`: 19 files changed, +302/−356 (git detected the six route→component renames).

---

## 8. Current state / next steps

**State:** working tree clean; 3-section IA live in code; nav is Home · Find artists · Settings;
roster lives on Discover; data sources, alerts, reports, forecasts and backtests are anchored
sections of Settings; five workflow pages keep routes and are linked from Home.

**Next steps (blocked on owner inputs):**

1. Apply migrations `0004`, `0005`, `0006`, `0007` to the staging Supabase project (SQL editor),
   then verify intake → profile → Discover → Home end-to-end with a signed-in test account.
2. Browser smoke suite once Playwright can run (system libs) or with approval to install them.
3. Optional: live verification of provider connections (YouTube key connect/test/search) and the
   prediction run — both need the applied migrations plus a role with access.
