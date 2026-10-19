# Operations guide

This guide covers setup and rollout tasks that are not part of the README's quick start. Current local code does not prove that any hosted environment is configured.

## Supabase setup

1. Create a **separate staging project**. Do not experiment on production.
2. Inspect the current database and determine which migrations have actually run. This repository has SQL files and Drizzle journal metadata, but no configured migration-apply script. Do not replay `0000`–`0003` on an established project: `0000` seeds demo rows and `0003` deletes demo artists and dependent rows.
3. For a fresh staging database, review and apply migration SQL in order, `0000_migration.sql` through `0005_auditable_ar_workflows.sql`. For an existing staging database, reconcile the schema/migration ledger first and apply only the missing changes. Save sanitized output and the resulting migration version.
4. Verify `0005`'s `auth.users.invited_at` dependency and test invitations. It creates a profile for each account, assigns Scout only to invited accounts, and does not grant Admin automatically.
5. Disable public sign-ups in Supabase Auth. Configure the staging app URL under allowed redirect URLs, then invite named testers.
6. After migrations and an invitation, bootstrap the first Admin using the trusted Supabase SQL editor. Replace the email with the invited operator's address:

   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin'::public.app_role
   from auth.users
   where email = 'ADMIN_EMAIL'
   on conflict (user_id, role) do nothing;
   ```

7. Test anonymous, nonmember, Scout, Analyst, Artist Development, Head of A&R, and Admin reads/writes/RPCs. In particular verify review authorship, atomic integrity resolution, stage rationale, and the two-review signing gate.

## Local environment

Copy `.env.example` to `.env` and set the staging project URL and publishable key. Keep `DATABASE_URL` out of browser variables. Do not add a service-role key unless a reviewed server-side feature requires one; the current app does not use it.

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run start
```

The app builds a Nitro Node server. Select a host that supports the generated server and validate the adapter in a private staging deployment; static-only hosting is insufficient. Configure the environment variables in the host's protected settings, not in committed files.

## Importing evidence

- Confirm the artist's identity before intake; ambiguous MusicBrainz matches need human resolution.
- Obtain legal/contractual approval before importing an export. The UI's authorization reference is an audit note, not legal review.
- Use the Data Sources page templates and exact period/metric definitions. Keep source exports and proof of permission in the label's approved storage, not this repository.
- Audience review cadence is a preference only. No recurring job or provider ingestion is scheduled.
- UGC remains unavailable until an approved source and retention policy are configured.

## GitHub and release

Open a pull request from the feature branch. `.github/workflows/ci.yml` runs `npm ci`, typecheck, unit tests, and build. Resolve the existing full-lint formatting debt separately; changed files have been scoped-linted. After staging checks, review the migration and backup/recovery plan before any production change. Do not deploy or migrate production from the CI workflow.

## Pilot routine

Use a small approved artist cohort. Review identity conflicts, source freshness/rights, missing coverage, integrity cases, reviewer disagreement, task ownership, and audit history at each A&R meeting. Stop ingestion when a provider contract expires or data semantics change. Record outcomes and observation cutoffs before considering model research.
