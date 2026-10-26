# Breakout Radar

Internal A&R intelligence MVP for a record label scouting emerging African artists. It has three sections, as specified by the client:

| Section | What it does |
|---|---|
| **Discovery** | The core. An autonomous weekly sweep finds, resolves, screens and ranks upcoming artists from credible data, and shows the evidence behind every rank. |
| **Analyse** | The weekly review of the shortlist. Data movement on one side, artistic quality on the other: songwriting, vocals, key and harmony, production, originality, live presence, catalogue, authenticity. |
| **Recommendations** | The program proposes whom to pick, with reasons, gaps, a pipeline view, a grounded Q&A panel, a board memo and an audit trail of accept or override decisions. |

> **Every artist in this build is invented and every series is generated.** The UI says "Simulated" throughout. The ranking is an unsupervised, expert-weighted model. It is not trained or validated and it never shows success probabilities. See [docs/ROADMAP.md](docs/ROADMAP.md) for what has to exist before that changes.

## Quick start

Needs Node 20.19 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 42 tests: engine rules and full UI flows
npm run build      # static site in dist/
```

The app is a static React site with no backend. Host `dist/` anywhere. Reviews, shortlist and decisions persist in the browser's localStorage (with an in-memory fallback).

## What is in the box

```
src/
  engine/        framework-free scoring engine (portable to a server or another app)
    constants.js   week index, platform metadata
    math.js        robust statistics, PRNG, Dirichlet sampling
    engine.js      features, integrity screen, scoring, Monte Carlo, artistic value, recommendations
    insights.js    views derived from engine output (market movers, signals, underpriced potential, explainer)
  data/
    providers.js   source ledger: rights, quotas, ML permission (checked 21 Oct 2026)
    universe.js    the simulated artists and seed reviews. Replace this with real adapters.
  ui/            theme (dark navy + lime), primitives, charts (area, donut, heatmap, Africa map, hero art)
  sections/      Discovery, Analyse, Recommendations, Ledger
  App.jsx        shell, state, sweep simulation
tests/           engine.test.js and app.test.jsx (Vitest + jsdom)
docs/            ARCHITECTURE.md, DATA_SOURCES.md, ROADMAP.md
```

## Design rules enforced in code

1. **Missing is not zero.** A signal that is not measured drops out of the weighted score and lowers evidence coverage. Tested.
2. **Point in time.** Every engine function takes a cutoff week and reads only data up to it. A test scrambles all later data and checks nothing changes.
3. **Flags are not verdicts.** Integrity output asks a human to look. Paid promotion is recognised as normal marketing and is not penalised as misconduct. Held artists are never ranked.
4. **Restricted sources are blocked.** Spotify and TikTok are marked `blocked` in the ledger, and a test checks no scoring platform depends on a blocked provider.
5. **Artistry is human.** Machine audio descriptors are shown beside the rubric and never feed it. Signing-level verdicts need two reviewers, and disagreement is shown.
6. **No filler.** If nobody clears the bar, the signing slots stay empty.

## Plugging in real data

`buildUniverse()` returns artist objects. To go live, return the same shape from your adapters (see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#artist-object)). The engine, charts and sections need no change. The optional `adapters.lookupIdentity(query)` prop replaces the browser-side MusicBrainz search so you can route it through your server.

## Known simplifications

- Catalogue depth, country mix and repeat listening are latest-week snapshots, so earlier points in the Trail view are slightly flattered.
- Scoring runs in the browser. That is fine for a demo and will not scale to thousands of artists; move `src/engine` to a server job.
- The peer cohort is the demo universe. Production needs stage-band cohorts (audience size, catalogue age, market).
- Ad accounts are not connected. Paid-campaign calls are inferred from growth shape and need confirmation.
- Avatars are generated initials. No real faces or photographs are used.
