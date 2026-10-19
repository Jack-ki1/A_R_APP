# Security test results

## Evidence available

Source migrations contain team policies and the `0003_secure_workspace.sql` patch. Migration `0002_next_phase_modules.sql` explicitly granted anon CRUD and `USING (true)` to five tables; `0003` revokes anon access and applies `is_team(auth.uid())` policies. Migrations `0004` and `0005` are authored but not applied. `0004` limits evidence writes to role-checked RPCs. `0005` adds atomic workflow RPCs, denies direct review/case decision writes, and changes new-user bootstrap so public sign-up cannot grant the first user admin; only invited users are assigned scout automatically. The local repository cannot prove which migrations have been applied to a live project.

## Test matrix status

| Principal                | Read/write/RPC/storage tests          | Result                       |
| ------------------------ | ------------------------------------- | ---------------------------- |
| Anonymous                | All private tables and functions      | NOT RUN — no staging project |
| Authenticated non-member | All tables/functions                  | NOT RUN — no staging project |
| Scout                    | CRUD and role-restricted transitions  | NOT RUN                      |
| Analyst                  | CRUD, export and RPC                  | NOT RUN                      |
| Artist development       | assigned task / private asset access  | NOT RUN                      |
| Head of A&R              | signing / integrity / review          | NOT RUN                      |
| Admin                    | role management / all allowed actions | NOT RUN                      |

Login/invitation, signed recording storage, staging migration and production migration version are also **NOT RUN / NOT VERIFIED**. No migration was applied by this work. Review `handle_new_user()` against the actual Supabase Auth schema and invite flow before applying `0005`; the operator must explicitly bootstrap the first admin.

## Required staging run before release

Apply migrations to an isolated staging Supabase project with an approved backup/recovery plan. For every principal, assert read, insert, update, delete, export, RPC and storage behavior on every private table. Verify invite-only registration and first-admin bootstrap. Attempt direct API calls bypassing the UI, forged reviewer identity, cross-user task/review mutation, and unauthorized `signed` transitions. Save sanitized SQL/test output and migration version here. Never paste secrets into test logs or this document.
