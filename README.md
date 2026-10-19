# Breakout Radar

Breakout Radar is a private internal workspace for an African record-label A&R team. It supports artist discovery, evidence collection, human review, integrity decisions, and an auditable scouting pipeline.

## Current status

This is an implementation prototype, not a production-verified intelligence service. The local code builds and its unit tests pass, but no hosted Supabase project, staging migration, provider license, or private deployment has been verified.

- MusicBrainz provides identity metadata only. Confirmed candidates can be added to the radar without invented audience values.
- Authorized CSV imports support sourced artist metrics and aggregated audience cohorts, with import references and observation lineage.
- Audience comparisons require compatible source, cohort definitions, denominator, period, quality, rights, and coverage.
- UGC providers are not connected. The UGC page reports that state.
- Artistic reviews, integrity decisions, and pipeline moves are designed to record authenticated actors and audit history. The database changes for these workflows are in migration `0005` and have not been tested against staging.
- No trained model, validated breakout probability, or valid historical A&R backtest exists. Those pages state this directly.
- Operational alerts are not generated from real ingested signals yet. Demo alerts are excluded from operational views.

Treat legacy `artists.scores`, `series`, `events`, and any demo records as non-authoritative. Missing evidence must remain missing; do not use legacy or demo values for signing decisions.

## Main workflows

1. Sign in to the invite-only workspace.
2. Search MusicBrainz, resolve an artist identity, and choose **Add to Radar**.
3. Import authorized observations or audience cohorts using the Data Sources page. Each import needs an authorization reference; operator attestation is not a substitute for legal approval.
4. Review comparable audience snapshots and source-linked observations on the artist profile.
5. Submit independent human artistic reviews and evidence-based integrity decisions.
6. Move artists through the pipeline with a rationale. Signing requires Head of A&R or Admin and two distinct reviewers.
7. Export reports containing accepted sourced observations, their windows, dates, source IDs, and rights status.

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
