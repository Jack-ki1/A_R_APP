# Breakout Radar

Breakout Radar is a private internal workspace for an African record-label A&R team. It supports artist discovery, evidence collection, integrity decisions, artist development, and an auditable scouting pipeline.

## Current status

This is an implementation prototype, not a production-verified intelligence service. The local code builds and its unit tests pass, but no hosted Supabase project, staging migration, provider license, or private deployment has been verified.

- MusicBrainz provides identity metadata only. Confirmed candidates can be added to the radar without invented audience values.
- Authorized CSV imports support sourced artist metrics and aggregated audience cohorts, with import references and observation lineage.
- Audience comparisons require compatible source, cohort definitions, denominator, period, quality, rights, and coverage.
- UGC providers are not connected. The UGC page reports that state.
- Integrity decisions and pipeline moves are designed to record authenticated actors and audit history. The database changes for these workflows are in migration `0005` and have not been tested against staging.
- No trained model, validated breakout probability, or valid historical A&R backtest exists. Those pages state this directly.
- Operational alerts are not generated from real ingested signals yet. Demo alerts are excluded from operational views.

Treat legacy `artists.scores`, `series`, `events`, and any demo records as non-authoritative. Missing evidence must remain missing; do not use legacy or demo values for signing decisions.

## Main workflows

1. Sign in to the invite-only workspace.
2. Search MusicBrainz, resolve an artist identity, and choose **Add to Radar**.
3. Import authorized observations or audience cohorts using the Data Sources page. Each import needs an authorization reference; operator attestation is not a substitute for legal approval.
4. Review comparable audience snapshots and source-linked observations on the artist profile.
5. Record evidence-based integrity decisions and internal notes on each artist.
6. Move artists through the pipeline with a rationale. Signing requires Head of A&R or Admin and the database policy configured in staging.
7. Use Settings for data sources, reports, alerts, forecast readiness, and backtest readiness.

Audience cadence settings record a preferred review interval only. There is no scheduled ingestion. ListenBrainz is an exploratory community aggregate, not a representative measure of African listening demand.

## Technology and layout

- React 19, TypeScript, TanStack Start/Router/Query, Vite 8, Nitro Node server
- Tailwind CSS v4, Radix UI, Lucide, and Recharts
- Supabase Auth and Postgres with RLS
- SQL migrations in `drizzle/migrations/`; migration metadata in `drizzle/migrations/meta/`
- App code in `src/`; CI workflow in `.github/workflows/ci.yml`

The built app is a Node server, not a static-only site. The hosting adapter and deployed runtime still need staging verification.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
cp .env.example .env
# Set the Supabase URL and publishable key in .env
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm test
npm run build
npm run start
```

`npm run start` runs the most recent production build. `npm run lint` currently reports existing repository-wide formatting issues; lint the changed files while that baseline is addressed. The GitHub Actions workflow currently runs install, typecheck, tests, and build.

## Environment variables

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Supabase URL used by browser code | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable browser key; RLS remains required | No |
| `SUPABASE_URL` | URL used by server functions | No |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key used by server functions | No |
| `DATABASE_URL` | Database administration/migrations | Yes |

Never commit `.env`. The app does not need a service-role key in the browser.

## Database and access setup

The migration files are reviewed SQL; the repository does not currently provide a migration-apply script. **Do not apply migrations blindly to an existing project.** First identify the hosted schema and migration history. Use a separate staging Supabase project and backup/recovery plan.

Migration order is `0000` through `0005`. Migration `0003` removes demo artist rows and dependent data from the earlier prototype. Migrations `0004` and `0005` add the evidence/import and audited-workflow foundations. Both are authored but unverified on a live database. Migration `0005` changes Auth user creation: invited accounts receive Scout, public sign-ups do not receive a role, and the first Admin must be explicitly bootstrapped by a trusted operator. Verify the Auth invitation column and trigger behavior in staging before applying.

Disable public sign-ups in Supabase Auth, configure allowed redirect URLs, invite named users, and test each role. No migration has been applied by this repository work. Do not run migrations on production without explicit release approval, a verified backup, and a tested rollout/recovery plan.

## Project documents

- [Operations guide](docs/OPERATIONS_GUIDE.md): setup, migrations, deployment, and pilot steps.
- [Security and data governance](docs/SECURITY_AND_DATA_GOVERNANCE.md): roles, data rights, privacy, and validation gates.
- [Business summary](BUSINESS_SUMMARY.md): short nontechnical overview for stakeholders.

## Current verification

At the latest local checkpoint, typecheck passed, 16 unit tests passed, the production build passed, and scoped ESLint passed. Supabase migrations, login/RLS role matrix, provider rights, hosted deployment, browser E2E, and private pilot remain unverified. See the two project documents above for the practical next steps.

---

## Product map

The application has five primary navigation areas.

| Navigation area | Purpose | Routes included |
| --- | --- | --- |
| Home | Landing intelligence overview and current activity | `/radar` |
| Artists | Candidate discovery, artist records, pipeline, development, and integrity checks | `/artists`, `/discover`, `/pipeline`, `/development`, `/integrity` |
| Audience | Aggregate audience comparison and permitted fan-content status | `/audience`, `/ugc` |
| Settings | Sources, reports, alerts, and forecast/backtest readiness | `/settings`, `/sources`, `/reports`, `/alerts`, `/predictions`, `/backtesting` |
| Authentication | Invite-only sign-in entry point | `/auth` |

There is no standalone Reviews route. The former review page was removed from the product navigation and source tree.

### Home

The Home route is the working overview for an A&R team.

It contains dashboard cards and links to the artist workflow.

It may still render legacy synthetic fixture values when a database includes old demo rows.

Those values are not operational evidence.

The Home route is not a substitute for the sourced observation table on an artist profile.

### Artists

Artists is the operational center of the product.

It lists monitored canonical artists and omits demo rows from normal operational queries.

The search field in the header sends users to this area.

Artist cards expose identity, location, stage, integrity state, and any available legacy display metrics.

The artist profile is the place to inspect source-linked observations, compatible audience snapshots, notes, and workflow context.

The Artists navigation group also contains discovery, pipeline, development plans, and growth checks.

### Discovery

Discovery provides filters for existing monitored artists.

The Data Sources section provides MusicBrainz search and Add to Radar intake for a new candidate.

MusicBrainz identity results must be checked by a person before intake.

The application does not automatically merge ambiguous identities.

### Pipeline

The pipeline is part of the Artists navigation group.

It is a kanban-style operational view of pipeline stages.

Users can move an artist by drag and drop or by a keyboard-accessible select control.

Every stage movement must supply a rationale when migration `0005` is applied.

The database enforces senior authorization for the Signed stage.

### Development

Development plans belong to artists already progressing through the label workflow.

Tasks contain an area, a title, an optional due date, and completion state.

The page is an operational checklist, not an artist-performance measurement system.

### Growth checks

Growth checks are the integrity workflow under Artists.

An integrity case is a prompt for a human investigation.

It does not prove artificial activity.

The available outcomes distinguish organic evidence, declared paid promotion, unknown, needs review, and confirmed invalid activity.

Confirmed invalid decisions require an evidence reference when migration `0005` is active.

### Audience

Audience uses aggregate authorized cohort data.

It compares snapshots only after compatibility checks.

Compatibility includes source, cohort scheme, denominator type, collection window, rights status, quality status, and coverage.

The product can describe change in aggregate shares and supplied counts.

It cannot claim that named people or the same individual listeners moved from one segment to another.

### Fan content

The Fan content page is reserved for permitted UGC monitoring.

No commercial UGC provider is connected in the current repository.

The page reports Not connected instead of displaying synthetic UGC rankings as real monitoring.

### Settings

Settings is the administration and supporting-tools hub.

It links to data sources, reports and exports, alerts, forecast readiness, and backtest readiness.

Forecasts and reports are not primary navigation sections.

They are supporting workspace tools accessed from Settings.

### Forecast readiness

The forecast page documents model readiness.

It intentionally does not produce a probability or a breakout prediction.

The repository does not contain a trained artifact, approved feature dataset, target labels, or a held-out evaluation report.

### Backtest readiness

The backtesting page documents the evidence required for historical validation.

The earlier synthetic forecast chart was removed because it did not validate scouting outcomes.

No historical model evaluation should be inferred from the current product.

### Reports and exports

Reports export accepted source-linked observation rows.

The export includes source ID, metric window, observed time, territory, quality, and rights status.

CSV formula characters are protected before download.

The report does not export demo priority rankings as operational recommendations.

### Alerts

Alerts are a Settings support tool.

The UI suppresses demo alerts from the operational list.

No real rule-driven alert engine is available until source ingestion and alert rules are configured.

### Data sources

Data Sources is accessed from Settings.

It owns MusicBrainz identity lookup, candidate intake, source registry visibility, manual metric import, manual cohort import, and audience review cadence preference.

Changing the cadence does not start a scheduler.

## Repository layout

```text
A_R_APP_v1/
├── .github/
│   └── workflows/
│       └── ci.yml
├── docs/
│   ├── OPERATIONS_GUIDE.md
│   └── SECURITY_AND_DATA_GOVERNANCE.md
├── drizzle/
│   ├── migrations/
│   │   ├── 0000_migration.sql
│   │   ├── 0001_review_mode_notes.sql
│   │   ├── 0002_next_phase_modules.sql
│   │   ├── 0003_secure_workspace.sql
│   │   ├── 0004_evidence_foundation.sql
│   │   ├── 0005_auditable_ar_workflows.sql
│   │   └── meta/
│   └── schema.ts
├── src/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── integrations/
│   ├── lib/
│   ├── routes/
│   ├── test/
│   ├── routeTree.gen.ts
│   ├── router.tsx
│   ├── server.ts
│   ├── start.ts
│   └── styles.css
├── .env.example
├── BUSINESS_SUMMARY.md
├── README.md
├── components.json
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

The root contains configuration and project entry points.

The `src` directory contains all application code.

The `drizzle` directory contains versioned SQL migrations.

The `docs` directory intentionally contains only the two detailed companion guides.

`BUSINESS_SUMMARY.md` is a separate short stakeholder document.

## Root-file reference

| File | Role | Operational context |
| --- | --- | --- |
| `.env.example` | Environment template | Shows safe variable names without secrets. |
| `.gitignore` | Git exclusions | Keeps dependencies, builds, local environment files, and host output out of commits. |
| `BUSINESS_SUMMARY.md` | Stakeholder overview | Short nontechnical explanation for employer or sponsor review. |
| `README.md` | Technical and product guide | This detailed project reference. |
| `components.json` | UI generator configuration | Retained for the Radix/shadcn-style component conventions. |
| `drizzle.config.ts` | Drizzle configuration | Points migration tooling at the placeholder schema and `DATABASE_URL`. |
| `eslint.config.js` | Lint configuration | Defines TypeScript, React, and formatting checks. |
| `package.json` | Dependencies and commands | Defines the application name, runtime packages, and npm scripts. |
| `package-lock.json` | Dependency lockfile | Ensures repeatable npm installs. |
| `tsconfig.json` | TypeScript configuration | Defines compiler behavior and import aliases. |
| `vite.config.ts` | Build/server configuration | Configures TanStack Start, Nitro Node output, Tailwind, React, and local port 3000. |
| `vitest.config.ts` | Test configuration | Configures browser-like test environment and setup. |

### `.env.example`

The environment template lists browser-safe Supabase configuration.

It also lists server-side variables used by the present source functions.

`DATABASE_URL` is only for controlled database administration or migration work.

It must never be exposed as a Vite-prefixed browser variable.

### `package.json`

The project uses npm.

`npm run dev` starts the development server.

`npm run build` creates the Node server output in `.output`.

`npm run start` runs that output.

`npm run typecheck` runs TypeScript without creating build files.

`npm test` runs Vitest once.

`npm run lint` is available but currently sees pre-existing broad formatting drift.

### `vite.config.ts`

Vite is configured with TanStack Start for routing and server integration.

Nitro uses the `node-server` preset.

Tailwind and React plugins are applied during the build.

The development server binds to all interfaces on port 3000.

### `drizzle.config.ts`

Drizzle Kit knows where migration files are stored.

It reads the connection string only from `DATABASE_URL`.

The presence of this file does not mean migration execution is automated.

All hosted migrations still require reviewed operator action.

## Source-directory reference

### `src/assets`

`hero.jpg` is the visual hero asset used by the product shell.

`portraits-a.jpg` and `portraits-b.jpg` are legacy sprite sheets.

They are used only to render clearly marked demo artwork where an artist image is unavailable.

They must not be represented as photographs of named real artists.

### `src/components`

`audience-compare.tsx` validates and renders comparison of compatible cohort snapshots.

It warns when snapshots are incompatible, insufficient, stale, or too small to interpret safely.

`br-ui.tsx` provides shared Breakout Radar visual primitives.

These include panels, badges, portraits, score rings, integrity chips, and KPI cards.

`theme-toggle.tsx` switches the visual color theme and persists the preference in browser storage.

### `src/components/ui`

The `ui` directory contains only UI primitives currently imported by the app.

`button.tsx` defines shared button variants.

`dialog.tsx` supports modal dialog behavior for components that use it.

`input.tsx` wraps standard text input styles.

`label.tsx` supplies accessible labels.

`separator.tsx` provides visual separators.

`sheet.tsx` supports slide-over UI used by navigation primitives.

`sidebar.tsx` contains reusable sidebar composition helpers.

`skeleton.tsx` provides loading placeholders.

`sonner.tsx` configures the toast notification host.

`tabs.tsx` provides accessible tab behavior on the artist profile.

`textarea.tsx` wraps multiline input styles.

`toggle.tsx` provides toggle styling.

`tooltip.tsx` supplies accessible tooltips.

Unused UI generator files were removed during the cleanup.

### `src/hooks`

`use-mobile.tsx` exposes responsive media-query state for components that need it.

`use-theme.ts` reads and persists the selected light or dark theme.

### `src/integrations/supabase`

`client.ts` creates the browser-facing Supabase client and checks configuration presence.

`auth-attacher.ts` attaches the authenticated token to supported server function calls.

`auth-middleware.ts` verifies bearer-token context for server operations.

`types.ts` contains the generated-style TypeScript representation of known database tables, enums, and RPC signatures.

This type file must be rechecked after applying migrations to staging.

### `src/lib`

`analytics.ts` contains null-aware growth and cohort-comparison helpers.

It distinguishes growth-rate ratios from growth-factor ratios.

`artists.ts` defines artist types, pipeline-stage labels, data queries, and formatting helpers.

Operational artist queries exclude rows marked as demo.

`error-capture.ts` centralizes safe client error capture.

`error-page.ts` supplies a user-facing fallback for server-side rendering errors.

`metric-import.ts` parses and validates authorized metric and audience-cohort CSV data before it reaches an RPC.

`modules.ts` contains shared table query helpers, source registry display data, legacy heuristic metadata, and legacy-series helpers.

`musicbrainz.functions.ts` contains server-side MusicBrainz lookup helpers and rate-limit behavior.

`source.functions.ts` contains authenticated server functions for identity intake and CSV import RPC calls.

`utils.ts` contains shared class-name and formatting utilities.

### `src/routes`

`__root.tsx` establishes the application root, document metadata, and global toast host.

`index.tsx` redirects visitors to the correct authenticated landing flow.

`auth.tsx` is the sign-in and configuration entry page.

`_authenticated/route.tsx` enforces a session and workspace-role check before rendering the private shell.

It also declares the navigation hierarchy.

The source tree has no `review.tsx` route.

### Authenticated route files

| File | URL | Responsibility |
| --- | --- | --- |
| `radar.tsx` | `/radar` | Home dashboard and recent pipeline activity. |
| `artists.index.tsx` | `/artists` | Artist list and filtered search results. |
| `artists.$id.tsx` | `/artists/:id` | Canonical artist profile, observations, cohorts, events, and notes. |
| `discover.tsx` | `/discover` | Existing artist discovery filters and saved searches. |
| `pipeline.tsx` | `/pipeline` | Artist pipeline board; grouped under Artists navigation. |
| `development.tsx` | `/development` | Artist development task plans; grouped under Artists navigation. |
| `integrity.tsx` | `/integrity` | Growth integrity cases; grouped under Artists navigation. |
| `audience.tsx` | `/audience` | Aggregate audience snapshot overview. |
| `ugc.tsx` | `/ugc` | Explicit not-connected UGC state. |
| `settings.tsx` | `/settings` | Administration and hub for supporting tools. |
| `sources.tsx` | `/sources` | Source registry, MusicBrainz intake, and approved CSV imports. |
| `reports.tsx` | `/reports` | Source-linked report and export tool. |
| `alerts.tsx` | `/alerts` | Operational alerts list. |
| `predictions.tsx` | `/predictions` | Model and forecast readiness disclosure. |
| `backtesting.tsx` | `/backtesting` | Historical validation readiness disclosure. |

`routeTree.gen.ts` is generated from route files by the TanStack tooling.

Do not edit it manually.

Running the application build after a route-file change regenerates it.

### Runtime files

`router.tsx` constructs the TanStack Router with its shared Query Client.

`server.ts` provides the server render entry and error boundary behavior.

`start.ts` registers server startup middleware.

`styles.css` defines global Tailwind imports, theme tokens, and shared visual rules.

### Tests

`test/setup.ts` configures the test environment and testing-library matchers.

`test/analytics.test.ts` covers growth and snapshot-comparability helper behavior.

`test/metric-import.test.ts` covers CSV parsing, source requirements, and cohort validation.

`test/app-routing.test.tsx` confirms that the generated route tree resolves the root route.

## Database reference

The database design is additive after the historical prototype migrations.

Existing JSON fields are legacy display state.

They are not the authoritative source for newly imported operational evidence.

### Migration sequence

`0000_migration.sql` creates base roles, profiles, artists, audience snapshots, notes, audit log, and the original demo seed.

It also creates initial role helper functions and stage auditing.

`0001_review_mode_notes.sql` is a historical prototype migration.

It should be treated as historical context, not as a desired production access pattern.

`0002_next_phase_modules.sql` adds saved searches, integrity cases, artistic-review records, alerts, and development tasks.

It also contains historical broad review-mode grants which must not be treated as production authorization.

`0003_secure_workspace.sql` removes the insecure review-mode access and narrows private workspace policies.

It also removes earlier generated demo rows when applied.

`0004_evidence_foundation.sql` makes legacy metric fields nullable.

It adds source accounts, candidate intake, data-source registry, ingestion runs, metric observations, and audience source lineage.

It defines guarded RPCs for MusicBrainz candidate intake and approved manual imports.

`0005_auditable_ar_workflows.sql` adds workflow history and integrity decision records.

It adds guarded RPCs for integrity resolution and stage movement.

It also contains previous artistic-review support retained at the data layer, although the standalone review page is removed from the app.

### Core tables

| Table | What it stores | Important usage rule |
| --- | --- | --- |
| `profiles` | User display profile | Created from Supabase Auth events. |
| `user_roles` | One or more workspace roles per user | Server/RLS checks read this table. |
| `artists` | Canonical artist record and legacy display fields | New artists may have null metrics. |
| `artist_source_accounts` | External identities such as MusicBrainz MBID | `(source, external_artist_id)` is unique. |
| `candidate_intake` | Who added an artist and from which source | Starts candidates in monitoring-pending state. |
| `data_sources` | Rights and source configuration registry | Rights must be reviewed outside the UI. |
| `ingestion_runs` | Batch import attempt metadata | Records actor, counters, and outcome. |
| `metric_observations` | Immutable normalized metric values | Must include window, source, rights, and quality state. |
| `audience_snapshots` | Aggregate cohort records | Used only after comparability validation. |
| `artist_notes` | Team notes | A shared operational record. |
| `integrity_cases` | Human investigation queue | A suspicion is not evidence of fraud. |
| `integrity_decisions` | Outcome history for integrity cases | Created by guarded resolution flow. |
| `workflow_history` | Pipeline changes and rationale | Captures actor and evidence references. |
| `alerts` | Alert delivery state | Demo alerts are excluded from operational view. |
| `dev_tasks` | Artist development work items | Tracks concrete development work. |
| `audit_log` | Broad audit events | Provides cross-workflow traceability. |

### Important constraints

Artist identity intake requires a valid MusicBrainz UUID, normalized name, and expected source URL.

Metric imports must use one permitted named source per batch.

MusicBrainz and ListenBrainz cannot be used as artist-level commercial metric sources in the CSV importer.

Audience rows must reconcile shares and actual counts to the provided denominator.

Audience coverage must meet the configured minimum in the importer.

Observations record their source window and observed timestamp.

No importer silently replaces unknown data with zero.

## Application behavior and state

Every data panel should have an honest state.

Ready means a query or compatible evidence exists.

Loading means the request has not completed.

Empty means a valid query found no records.

Insufficient evidence means available records cannot support the requested calculation.

Source not connected means the platform is intentionally unavailable.

Stale means the last accepted observation no longer meets its freshness expectation.

Error means the application could not determine the state safely.

Demo mode means a visibly labeled fixture is present only for development or prototype context.

## Data flow

```text
MusicBrainz identity result
        ↓
Human confirmation
        ↓
Candidate intake RPC
        ↓
Canonical artist + source account + intake record
        ↓
Authorized export upload
        ↓
Parser validation + import RPC
        ↓
Data source + ingestion run + immutable observation
        ↓
Artist profile, compatible audience comparison, sourced report
        ↓
Human integrity action and pipeline decision
```

The browser should never manufacture an observation just to complete the flow.

Provider data should be retained only as permitted by the provider agreement and the label policy.

## Security model

The browser contains only a publishable Supabase key.

Row-level security must guard all private tables, storage objects, and RPC access.

Authenticated UI checks are usability controls.

They are not a substitute for database authorization.

Server and database operations derive the actor from the authenticated session.

The application must not accept client supplied reviewer or decision-maker identity as trusted input.

Role checks for signing, imports, integrity resolution, and administration need staging validation.

No anonymous user should access private research.

No authenticated nonmember should access private research.

## Data governance

Use data only after confirming the provider contract allows the intended collection, retention, display, derived-metric use, and territory.

Keep the legal source record outside the app as part of the label's vendor and rights process.

Prefer aggregate, privacy-preserving audience statistics.

Do not infer sensitive characteristics or identify people from social posts.

Do not treat paid promotion as fraud.

Do not treat an anomaly score as proof of invalid activity.

Do not send confidential research to external AI services without company approval.

## Deployment architecture

The application is built as a TanStack Start application with a Nitro Node server output.

The intended deployment contains a Node-compatible application host and Supabase for database and authentication.

The source does not prove a Vercel, Cloudflare, or other production adapter has been tested.

Provider ingestion work must run through a durable worker or scheduler selected after verifying platform constraints.

Browser requests must not be used as the long-running ingestion scheduler.

## Continuous integration

`.github/workflows/ci.yml` runs on pull requests and pushes to `main`.

It installs locked dependencies using `npm ci`.

It runs TypeScript checking.

It runs the unit tests.

It runs a production build.

It does not apply database migrations.

It does not deploy the application.

It does not grant access to provider credentials.

## Testing guide

Run the following before opening a pull request.

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Run a scoped ESLint command for files changed in the pull request while the historical repository-wide formatting debt remains.

Do not call a manual browser check an automated end-to-end test.

Staging tests still need separate accounts for anonymous, nonmember, Scout, Analyst, Artist Development, Head of A&R, and Admin users.

Test direct API and RPC calls as well as the visible UI.

Test malformed CSV rows, duplicate identity intake, mismatched cohort schemes, low coverage, unauthorized imports, and signed-stage restrictions.

## Local setup checklist

1. Install a supported Node.js version.
2. Run `npm ci`.
3. Copy `.env.example` to `.env`.
4. Add only the staging Supabase URL and publishable key.
5. Run `npm run dev`.
6. Visit the URL printed by Vite.
7. Do not paste secrets into a terminal transcript, commit, issue, or chat.
8. Use a nonproduction Supabase project for migration and workflow verification.

## Staging rollout checklist

1. Create or identify a separate Supabase staging project.
2. Back up and inspect the target before changing schema.
3. Confirm the already-applied migration state.
4. Review `0003`, `0004`, and `0005` with the database owner.
5. Apply only missing migrations in the correct sequence.
6. Confirm grants, RLS policies, triggers, and function ownership.
7. Disable public sign-up and configure redirect URLs.
8. Invite named test users.
9. Bootstrap the first Admin through a controlled operator process.
10. Test every role and record sanitized outcomes.
11. Import an authorized disposable sample file.
12. Confirm evidence appears on the artist profile with provenance.
13. Confirm incompatible audience snapshots do not produce a comparison.
14. Confirm unknown integrity remains unknown rather than clean.
15. Confirm exports exclude demo records and protect formulas.

## Production rollout checklist

1. Obtain explicit release approval.
2. Verify a current backup and recovery process.
3. Confirm staging migration and RLS evidence.
4. Confirm provider licenses and retention policy.
5. Confirm host environment variables are protected.
6. Deploy the application build to the approved Node host.
7. Apply reviewed database changes through the approved process.
8. Run login and authorization smoke checks.
9. Confirm imported observation lineage and private file permissions.
10. Monitor errors, source freshness, and workflow audit events.

## Known limitations

The repository does not currently connect to a licensed commercial music intelligence provider.

The repository does not currently ingest TikTok, Instagram, Spotify, or YouTube analytics.

The repository does not currently schedule daily or real-time imports.

The repository does not currently provide production storage for private demo recordings.

The repository does not currently offer an admin UI for inviting users or changing roles.

The repository does not currently contain a training dataset or outcome registry for machine learning.

The repository does not currently compute a validated probability of artist breakout.

The repository does not currently run an evidence-backed historical backtest.

The repository does not currently send email or chat notifications.

The repository does not currently prove production migration state.

## Troubleshooting

### The app opens an environment setup page

Confirm that `.env` exists.

Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set.

Restart `npm run dev` after editing environment variables.

### A page reports permission denied

Check the authenticated user's `user_roles` rows.

Check that the target migration has been applied.

Check RLS policy behavior using the actual role account.

Do not bypass RLS by placing privileged keys in the browser.

### A candidate cannot be added to radar

Confirm the MusicBrainz result has a valid MBID.

Confirm the authenticated account is a workspace member.

Confirm migration `0004` is applied and the candidate intake RPC is granted.

### An import is rejected

Confirm each metric batch uses one named permitted source.

Confirm every MBID maps to an existing confirmed artist source account.

Confirm dates, coverage, totals, segments, and authorization reference meet the template rules.

### A pipeline move fails

Confirm migration `0005` is applied.

Confirm the user has a permitted role.

Provide a rationale.

For Signed, use a Head of A&R or Admin account and verify the database policy.

### The build has no recent changes

Run `npm run build` again.

The production server reads from `.output`, which is generated by the build command.

### GitHub push fails

Authenticate Git locally using the GitHub account that has write permission to the repository.

Then run `git push -u origin main` after confirming `git status -sb` shows the intended branch.

Never paste a GitHub personal access token into this README or a public issue.

## Glossary

**A&R** means Artists and Repertoire: the label function that discovers, signs, and develops artists.

**Artist intake** means creation of a canonical internal candidate record after identity confirmation.

**Canonical identity** means one internal artist record linked to verified external source accounts.

**Cohort** means an aggregate group reported by an authorized provider, such as a market or age band.

**Coverage** describes how completely a source represents the eligible population or report.

**Data lineage** records where a value came from, when it was observed, and what import created it.

**Evidence** is a source-linked observation or documented human rationale.

**Growth integrity** is a human investigation into whether observed growth has adequate explanation.

**MBID** is a MusicBrainz artist identifier.

**RLS** means row-level security in Postgres/Supabase.

**Source account** is an external identity mapping for an artist.

**Staging** is a separate nonproduction environment used to verify changes safely.

**UGC** means user-generated content such as fan covers, dances, edits, or remixes.

## Companion documents

Read [Operations guide](docs/OPERATIONS_GUIDE.md) for external setup and rollout tasks.

Read [Security and data governance](docs/SECURITY_AND_DATA_GOVERNANCE.md) for access, privacy, rights, and release requirements.

Read [Business summary](BUSINESS_SUMMARY.md) for a short employer-facing overview.
