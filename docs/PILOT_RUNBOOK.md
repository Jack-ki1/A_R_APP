# Private pilot and operations runbook

## Current pilot readiness

The application now supports authenticated candidate intake, authorized CSV observation/audience imports, human review, integrity decisions, auditable pipeline actions, and honest unavailable states for UGC and modeling. It is **not ready for production use** until migrations 0004 and 0005 have been tested in a separate Supabase staging project, access controls have been verified, data licenses approved, and the deployed TanStack Start runtime exercised.

## Pilot gates

1. Name an internal owner for Supabase, provider rights, incident response, and weekly A&R review.
2. Create isolated development and staging Supabase projects. Confirm `0002` through `0005` migration state; test from a disposable backup or fresh staging project, never by resetting production.
3. Disable public sign-up. Invite named staff; bootstrap the first admin manually with a reviewed SQL statement in the Supabase SQL editor. Test each role with separate accounts.
4. Review each provider agreement for geography, metric definitions, retention, internal display, derived metrics, and ML rights. Record the approved scope and expiration. Do not upload data until that source is approved.
5. Configure server runtime variables and deploy a private staging preview. Confirm TanStack Start server functions execute and secrets stay server-side.
6. Run the RLS/RPC matrix, verify backup/restore, test idempotent CSV retry, and save sanitized evidence in `SECURITY_TEST_RESULTS.md`.
7. Pilot with a small explicitly approved artist cohort. Review source freshness, coverage, unknown integrity state, reviewer disagreement, workflow audit history, and deletion/retention requests weekly.
8. Capture artist outcomes and observation cutoffs before any model research. Keep predictions disabled until legal, label, and evaluation gates are met.

## Incident and outage handling

- Preserve the last accepted observation; mark it stale or unavailable rather than fabricating a refresh.
- Stop a provider import if authorization expires or its schema/meaning changes; record the source and run status.
- For suspected access leakage, disable affected credentials and access paths, preserve logs, notify the internal security owner, and follow the label's incident process.
- Before schema rollout, take and verify a backup, apply to staging, run smoke/RLS checks, and prepare a tested recovery path. Production migrations require the label's explicit release approval.

## Weekly review agenda

- New candidates and identity conflicts.
- Observation freshness, rights status, and coverage gaps.
- Integrity cases labeled unknown, needs review, disclosed paid promotion, or confirmed invalid, with cited evidence.
- Independent artistic assessments and disagreement.
- Due actions, owners, missed deadlines, and recorded rationale.
- Provider cost, quotas, rights expiry, failures, and user feedback.

This runbook does not assert that staging, a licensed provider, a production deployment, or a pilot currently exists.
