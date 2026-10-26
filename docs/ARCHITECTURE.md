# Architecture

## Data flow

```
sources (APIs, licensed feeds, artist exports)
        │   adapters return the artist object
        ▼
  data/universe.js ──► engine/engine.js  (features → integrity screen → score → Monte Carlo → artistic value → recommend)
                              │
                              ▼
                     engine/insights.js  (market movers, signals, underpriced potential, pipeline, explainer)
                              │
                              ▼
                 sections/*.jsx + ui/charts.jsx
```

The engine is plain JavaScript with no DOM or React. It can run in a server job, a worker, or a test.

## Artist object

```js
{
  id, name, country, city, genre, language, hidden,
  series: { yt: { aud: number[], act: number[] | null }, dz: {...}, am: {...}, bp: {...}, ig: {...} },
  // weekly values, index 0 is the oldest week, last index is the review week. A platform that is not tracked is absent, not zero.
  engagement: number[],        // likes + comments per 1,000 views, weekly
  ugcSeries: number[] | null,  // creators making content, weekly. null means no authorised feed.
  topShare, repeat,            // catalogue concentration and plays per listener (snapshots)
  geo: [[code, share], ...],   // latest listener share by country; first entry is the home market
  geoPrev: [[code, share], ...],  // same, four weeks earlier
  audio: { key, mode, keyStrength, bpm, lufs, pitchDev, vocalRange, hook, lyricDiv },
  synth, dup,                  // synthetic-audio likelihood and near-duplicate share from a detector
  measured: true
}
```

An artist with `series: null` (for example one added as a bare identity match) shows as "identity verified, measurements pending" and receives no score.
Artists ingested via the **Multi-Source Live Scout** (`src/data/liveSources.js`) are hydrated with real metrics from Deezer, Apple Music / iTunes, Wikimedia Pageviews and MusicBrainz, producing a complete 26-week series with real master audio previews.

## Scoring

For each feature `f` and artist `i`, with cohort median `m_f` and scale `s_f = max(1.4826·MAD, 0.6·sd, ε)`:

```
z_if   = clamp((x_if − m_f) / s_f, −2.5, 2.5)
score  = 100 · Φ(z_if)                     // 0..100, 50 is the peer median
raw_i  = Σ w_f·score_if / Σ w_f            // over features that exist for artist i
cov_i  = Σ w_f(available) · (0.4 + 0.6·platforms/5) · min(1, weeks/12)
index  = 50 + cov_i · (raw_i − 50)         // shrinks toward 50 when evidence is thin
```

Rank stability redraws the weights from a Dirichlet centred on the prior weights (concentration 60), adds feature noise that grows as coverage falls, re-ranks, and repeats 300 times. The 5th and 95th percentiles give the range. The share of runs that keep an artist in the top 3 is shown as "Stays top 3". It is a stability measure, not a probability of success.

| Feature | Weight |
|---|---|
| Growth vs peers (4 weeks) | 0.28 |
| Acceleration | 0.14 |
| Cross-platform breadth | 0.12 |
| Catalogue depth | 0.12 |
| Engagement quality | 0.12 |
| Market breadth | 0.08 |
| Fan-content pulse | 0.08 |
| Repeat listening | 0.06 |

## Integrity screen

Per platform, weekly log growth is compared with the artist's own history using median and MAD. A run counts as a surge when `z > 3.5` and growth is above 3% a week; a lone week must exceed 10%.

- Surge on at least 60% of platforms: informational, "broad-based".
- Narrower surge with engagement below 60% of its prior level, or less than 75% of the audience left four weeks later: **needs review**.
- Narrower surge of three or more weeks that reverts to the old pace with steady engagement: **probable paid promotion**.
- Home-market share down more than 25 points in four weeks (latest week only): **needs review**.
- Synthetic-audio likelihood of 0.6 or more: **synthetic-catalogue risk**.

Held statuses are `review` and `synthetic`. Held artists get no rank.

## Recommendation rules

In order: held means **Hold**; no complete review means **Needs artistic review**; evidence below 0.6 means **Provisional**; otherwise the quadrant decides.

```
momentum = index, or 50 + 0.6·(index − 50) when a paid push explains part of it
pick     = 0.5·momentum + 0.5·artistic value
bars     = momentum 55, artistry 65
```

| Momentum | Artistry | Verdict |
|---|---|---|
| high | high | Pursue now (two reviewers) or Pursue after a second review |
| low | high | Develop first |
| high | low | Watch: momentum without artistry |
| low | low | Pass for now |

Slots fill from the top of the Pursue tiers up to the chosen capacity and no further.

## Accessibility

Real tables with captions, labelled form fields, radio groups for the rubric, keyboard-operable chart points, `aria-live` on the sweep log and the explainer, visible focus rings, and `prefers-reduced-motion` support.
