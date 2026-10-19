# Breakout Radar roadmap

The current UI contains broad A&R workflows, but its seeded analytics are synthetic. Treat it as a secured prototype until the data foundation and operating workflow below are complete.

## Completed in this hardening pass

- [x] Invite-only sign-in gate; reject signed-in accounts without a workspace role.
- [x] Supabase migration to remove anonymous review-mode access and secure module-table RLS.
- [x] Prevent first-account Admin assignment; invited accounts begin as Scouts.
- [x] Purge `is_demo` artist fixtures and dependent snapshots, notes, cases, and alerts when migration 0003 is applied.
- [x] Live MusicBrainz metadata search with server-side identifier, input validation, caching, and best-effort rate pacing.
- [x] Live ListenBrainz opt-in community listening pulse with clear limits and freshness.
- [x] Mark CSV cells as quoted and neutralize spreadsheet formula prefixes.

## Required before a real team pilot

- [ ] Apply migration `0003_secure_workspace.sql` to the connected Supabase project.
- [ ] Disable public sign-ups in Supabase Auth, invite the initial Admin, and grant that role using the documented trusted SQL operation.
- [ ] Confirm auth redirects, member/non-member access, and the migration on a staging project.
- [ ] Add auditable artist-candidate intake and source lineage; metadata lookups currently do not create workspace records.
- [ ] Replace synthetic audience, growth, integrity, and score fields with approved data or explicit “insufficient evidence” states.
- [ ] Add server-side provider adapters, rights/retention metadata, source freshness, retry/backoff, and scheduled snapshot ingestion.
- [ ] Record the authenticated author on notes, reviews, integrity decisions, and tasks.
- [ ] Define and run a historical backtest only when timestamped source data and an outcome label exist.

## Data-source sequence

1. Use MusicBrainz for open catalog identity and release metadata; resolve candidates manually before merging identities.
2. Treat ListenBrainz as a narrow, opt-in, global community signal. It is not representative of African markets and must not drive a breakout score.
3. Evaluate YouTube Data API for video discovery after configuring a server-only key, quota-aware caching, and retention rules.
4. Use TikTok's approved commercial/first-party access paths for commercial work; Research API access is not a general commercial feed.
5. Evaluate Spotify only with current policy review and rights that explicitly permit the intended analytics and retention.
6. Procure a licensed music-intelligence / UGC feed if cross-platform African audience history is needed; validate country coverage, history depth, derived-metric rights, and ML rights before integration.

## Later

- [ ] Role-management and invitation UI for Admins.
- [ ] Replace demo weighted indices and seeded alerts with transparent, versioned metrics backed by observed data.
- [ ] Improve mobile pipeline workflows, pagination, and accessibility.
