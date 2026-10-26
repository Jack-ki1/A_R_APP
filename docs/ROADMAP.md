# Roadmap: from this MVP to a production system

## What this MVP is, and is not

It is a working front end and a tested scoring engine on **simulated** data. It shows the three sections, the evidence behind every rank, and the rules for holding, discounting and recommending. It is not connected to any real source, has no login, and has no database.

## How it answers the issues found in the A_R_APP repository review

| Issue found in the repo | Handling here |
|---|---|
| Artistic review RPC existed but no screen called it | Full rubric screen in Analyse with named reviewers, notes, panel score and disagreement |
| No way to open an integrity case | Flags come from the engine each sweep; a human decides what to do with them |
| ML trained on synthetic labels, shown as a prediction | No trained model, no probabilities. A readiness panel lists what must exist first |
| Missing features became "average" in scoring | Missing signals drop out and lower evidence coverage. Tested |
| Predictions trusted client-supplied features | Engine computes features from series, never from caller input |
| Only MusicBrainz artists could be registered | Still MusicBrainz-first here. Manual add is the first thing to build next |
| Unbounded queries | Not applicable yet. Needs pagination when data is real |
| Legacy score JSON mixed with sourced facts | Scores are always recomputed from series |

## Phases

**1. Real data, one source at a time.** Pick the sources that pass the rights checks in `docs/DATA_SOURCES.md`. Build one scheduled job per source that writes observations with rights reference, definition version, window and ingestion run. Start with YouTube (quota planned) and artist-authorised exports.

**2. Backend and access.** A database (the existing A_R_APP uses Supabase with row-level security), invited users only, roles for scout, analyst, Head of A&R and admin. Reviews, shortlist and decisions move from localStorage to audited tables. Restrict who can export.

**3. Move the engine server-side.** `src/engine` is framework-free. Run it as a weekly job, store point-in-time feature snapshots, and serve results to the UI.

**4. Identity.** Add manual artist creation and a merge-review queue so artists missing from MusicBrainz are not excluded.

**5. Integrity.** Add licensed AI-music detection, then ad-account data from the artist's team so paid campaigns are confirmed rather than inferred.

**6. Outcomes and validation.** Agree an outcome definition with the label. Collect point-in-time snapshots and labelled outcomes, including artists who did not break out. Split by time, report precision at K, PR-AUC, calibration and lead time. Only then train a model. A common rule of thumb is about ten positive outcomes per feature, so roughly 80 for the current eight. Keep the heuristic ranking as the baseline to beat.

**7. Develop and decide.** The earlier handoff described Decide and Develop sections. The client has folded the work into three sections, so these return only if asked.

## Porting into the existing A_R_APP (TanStack Start + Supabase)

- Copy `src/engine/*` unchanged and call it from server functions.
- Map `Discovery`, `Analyse`, `Recommendations` to three routes. Replace `buildUniverse()` with queries.
- Keep the three-item sidebar. Put settings and the source ledger behind the header.
- Replace localStorage persistence with the existing review, pipeline and audit tables.

## Questions for the client

1. Is the weekly review cadence Monday to Monday, and who must complete it?
2. What outcome counts as a breakout, over what horizon, in which territories?
3. Which sources does the label already hold rights to, including ML training?
4. Who may approve a signing, and is two-reviewer sign-off acceptable?
5. Which rubric dimensions and thresholds has the Head of A&R approved?
6. Priority markets and genres for the first real sweep?
