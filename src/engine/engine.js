import { LAST, PLATFORMS } from "./constants";
import { clamp, entropyNorm, gammaSample, gauss, mad, mean, median, mulberry32, phi, quantile, stdev, sum } from "./math";

/* ───────────────────────── 4. Engine ───────────────────────── */
/* Every function takes a cutoff week T and reads only data up to T (point-in-time). */

export const FEATURES = [
  { key: "growth", label: "Growth vs peers (4 weeks)", w: 0.28, note: "Four-week change in a blended audience index, compared with the peer median." },
  { key: "accel", label: "Acceleration", w: 0.14, note: "Is the last four weeks faster than the four before?" },
  { key: "breadth", label: "Cross-platform breadth", w: 0.12, note: "Share of platforms growing at the same time. Single-platform jumps score low." },
  { key: "catalogue", label: "Catalogue depth", w: 0.12, note: "One minus the share of demand held by the top track." },
  { key: "engagement", label: "Engagement quality", w: 0.12, note: "Likes and comments per 1,000 views, last four weeks." },
  { key: "geo", label: "Market breadth", w: 0.08, note: "Spread of listeners across countries, and whether it is widening." },
  { key: "ugc", label: "Fan-content pulse", w: 0.08, note: "Growth and diversity of creators making content with the artist's music." },
  { key: "repeat", label: "Repeat listening", w: 0.06, note: "Plays per listener, a proxy for depth of fandom." },
];

export function blendedIndex(a, T) {
  const ps = Object.keys(a.series), out = [];
  for (let t = 0; t <= T; t++) {
    let s = 0;
    for (const p of ps) s += Math.log(a.series[p].aud[t] / a.series[p].aud[0]);
    out.push(100 * Math.exp(s / ps.length));
  }
  return out;
}

export function surgeRuns(aud, T) {
  const lg = [null];
  for (let t = 1; t <= T; t++) lg.push(Math.log(aud[t] / aud[t - 1]));
  const hist = lg.slice(1);
  const med = median(hist), scale = Math.max(1.4826 * mad(hist), 0.004);
  const runs = [];
  let cur = null;
  for (let t = 1; t <= T; t++) {
    const z = (lg[t] - med) / scale;
    if (z > 3.5 && lg[t] > 0.03) {
      if (cur && cur.end === t - 1) { cur.end = t; cur.lgs.push(lg[t]); }
      else { cur = { start: t, end: t, lgs: [lg[t]] }; runs.push(cur); }
    }
  }
  // a lone week must be a big jump; otherwise it is noise on a small platform
  return { runs: runs.filter((r) => r.end > r.start || r.lgs[0] > 0.1), lg };
}

export const pctS = (x, d = 0) => `${(x * 100).toFixed(d)}%`;

export const INTEGRITY_LABEL = {
  clear: "Clear",
  paid: "Probable paid promotion",
  review: "Needs integrity review",
  synthetic: "Synthetic-catalogue risk",
};

/* Flags for a human to check. Paid promotion is not misconduct and is never penalised as such. */
export function screen(a, T, ctx = {}) {
  const signals = [];
  let status = "clear";
  const rank = { clear: 0, paid: 1, review: 2, synthetic: 3 };
  const raise = (s) => { if (rank[s] > rank[status]) status = s; };
  const ps = Object.keys(a.series);

  if (a.synth >= 0.6) {
    raise("synthetic");
    signals.push({ sev: "high", text: `Audio screen (simulated detector): ${pctS(a.synth)} likelihood the catalogue is machine-generated, and ${pctS(a.dup)} of top tracks are near-duplicates. Confirm a human artist exists before any spend.` });
  }

  const byPlat = {};
  for (const p of ps) { const r = surgeRuns(a.series[p].aud, T); if (r.runs.length) byPlat[p] = r; }
  const surgePlats = Object.keys(byPlat);
  const markers = [];
  if (surgePlats.length) {
    const breadth = surgePlats.length / ps.length;
    const first = Math.min(...surgePlats.map((p) => byPlat[p].runs[0].start));
    const last = Math.max(...surgePlats.map((p) => byPlat[p].runs[byPlat[p].runs.length - 1].end));
    if (breadth >= 0.6 && surgePlats.length >= 2) {
      signals.push({ sev: "info", text: `Growth surge is broad-based: ${surgePlats.length} of ${ps.length} platforms rose together. This is the pattern organic breakouts usually show.` });
      markers.push({ i: first, kind: "surge", label: "Broad surge" });
    } else {
      const lbl = surgePlats.map((p) => PLATFORMS[p].label).join(" and ");
      let verdict = "pending", text = "";
      for (const p of surgePlats) {
        const aud = a.series[p].aud;
        for (const run of byPlat[p].runs) {
          const gain = Math.exp(Math.log(aud[run.end] / aud[run.start - 1])) - 1;
          const len = run.end - run.start + 1;
          const post = T - run.end >= 3 ? aud[Math.min(T, run.end + 4)] / aud[run.end] : null;
          const postL = [];
          for (let t = run.end + 1; t <= Math.min(T, run.end + 3); t++) postL.push(byPlat[p].lg[t]);
          const postRate = postL.length >= 3 ? mean(postL) : null;
          const inRate = mean(run.lgs);
          const engBefore = median(a.engagement.slice(Math.max(0, run.start - 6), run.start));
          const engDuring = median(a.engagement.slice(run.start, Math.min(T, run.end) + 1));
          const engRatio = engBefore > 0 ? engDuring / engBefore : 1;
          if (engRatio < 0.6 || (post != null && post < 0.75)) {
            verdict = "review";
            text = `Surge on ${lbl}: +${Math.round(gain * 100)}% in ${len} week${len > 1 ? "s" : ""} while the other platforms stayed flat. ${post != null ? `Only ${pctS(post)} of that audience level remained four weeks later. ` : ""}Engagement per 1,000 views ran at ${pctS(engRatio)} of its prior level.`;
          } else if (verdict !== "review" && len >= 3 && postRate != null && postRate / inRate < 0.35 && engRatio >= 0.8) {
            verdict = "paid";
            text = `Growth on ${lbl} ran well above normal for ${len} weeks, then returned to its old pace. Engagement held steady. This matches a time-boxed campaign. Confirm with the artist's team.`;
          } else if (verdict === "pending") {
            text = `Surge on ${lbl} (+${Math.round(gain * 100)}% in ${len} week${len > 1 ? "s" : ""}). Too early to tell a campaign from organic pickup. Re-check next week.`;
          }
          markers.push({ i: run.start, kind: verdict === "review" ? "risk" : verdict === "paid" ? "paid" : "surge", label: verdict === "paid" ? "Campaign window" : verdict === "review" ? "Spike" : "Surge" });
        }
      }
      if (verdict === "review") raise("review");
      else if (verdict === "paid") raise("paid");
      signals.push({ sev: verdict === "review" ? "high" : verdict === "paid" ? "info" : "low", text });
      void last;
    }
  }

  const homeNow = a.geo[0][1], homePrev = a.geoPrev[0][1];
  // geography is a latest-week snapshot in this demo, so it is only checked at the latest cutoff
  if (T === LAST && homePrev - homeNow > 0.25) {
    raise("review");
    signals.push({ sev: "high", text: `The audience's home-market share fell from ${pctS(homePrev)} to ${pctS(homeNow)} in four weeks. Check where the new listeners come from.` });
  }
  const engNow = median(a.engagement.slice(T - 3, T + 1));
  if (ctx.peerEng && engNow < 0.4 * ctx.peerEng) {
    signals.push({ sev: "medium", text: `Engagement per 1,000 views is ${pctS(engNow / ctx.peerEng)} of the peer median. Large audiences with little reaction deserve a closer look.` });
  }
  const seen = new Set();
  const uniq = markers.filter((m) => { const k = m.kind + m.i; if (seen.has(k)) return false; seen.add(k); return true; });
  return { status, label: INTEGRITY_LABEL[status], held: status === "review" || status === "synthetic", signals, markers: uniq };
}

export function rawFeatures(a, T) {
  const B = blendedIndex(a, T);
  const g4 = Math.log(B[T] / B[T - 4]);
  const g4p = Math.log(B[T - 4] / B[T - 8]);
  const ps = Object.keys(a.series);
  const pos = ps.filter((p) => Math.log(a.series[p].aud[T] / a.series[p].aud[T - 4]) > 0.02).length;
  const hN = entropyNorm(a.geo), hP = entropyNorm(a.geoPrev);
  return {
    growth: g4,
    accel: g4 - g4p,
    breadth: pos / ps.length,
    catalogue: 1 - a.topShare,
    engagement: median(a.engagement.slice(T - 3, T + 1)),
    geo: 0.7 * hN + 0.3 * clamp(0.5 + (hN - hP) * 5, 0, 1),
    ugc: a.ugcSeries ? Math.log(a.ugcSeries[T] / a.ugcSeries[T - 4]) + 0.8 * (1 - a.ugc.top) : null,
    repeat: a.repeat,
    _g4: g4,
  };
}

/* Peer-relative scoring. Robust z-scores against the cohort, shrunk toward 50 by evidence coverage. */
export function scoreUniverse(artists, T = LAST, draws = 0, seed = 7) {
  const live = artists.filter((a) => a.series);
  const raws = new Map(live.map((a) => [a.id, rawFeatures(a, T)]));
  const stats = {};
  for (const f of FEATURES) {
    const vals = [...raws.values()].map((r) => r[f.key]).filter((v) => v != null && isFinite(v));
    stats[f.key] = { med: median(vals), scale: Math.max(1.4826 * mad(vals), 0.6 * stdev(vals), 1e-6) };
  }
  const peerEng = median([...raws.values()].map((r) => r.engagement));
  const byId = new Map();
  for (const a of live) {
    const r = raws.get(a.id);
    const sc = {};
    let wAvail = 0, acc = 0;
    for (const f of FEATURES) {
      const v = r[f.key];
      if (v == null || !isFinite(v)) { sc[f.key] = null; continue; }
      sc[f.key] = 100 * phi(clamp((v - stats[f.key].med) / stats[f.key].scale, -2.5, 2.5));
      wAvail += f.w; acc += f.w * sc[f.key];
    }
    const rawScore = wAvail ? acc / wAvail : null;
    const platCov = Object.keys(a.series).length / Object.keys(PLATFORMS).length;
    const evidence = wAvail * (0.4 + 0.6 * platCov) * Math.min(1, (T + 1) / 12);
    const idx = rawScore == null ? null : 50 + evidence * (rawScore - 50);
    const contributions = FEATURES.filter((f) => sc[f.key] != null).map((f) => ({
      key: f.key, label: f.label, score: sc[f.key], value: evidence * (f.w / wAvail) * (sc[f.key] - 50),
    }));
    const B = blendedIndex(a, T);
    byId.set(a.id, {
      id: a.id, T, measured: true, raw: r, scores: sc, evidence, idx, lo: idx, hi: idx, stability: null,
      contributions, integrity: screen(a, T, { peerEng }),
      growth4: r._g4, growthVsPeers: r._g4 - stats.growth.med, B,
      rank: null, comps: [],
    });
  }
  const eligible = [...byId.values()].filter((s) => s.idx != null && !s.integrity.held).sort((x, y) => y.idx - x.idx);
  eligible.forEach((s, i) => { s.rank = i + 1; });

  // comparables: cosine similarity on centred feature scores
  const vec = (s) => FEATURES.map((f) => (s.scores[f.key] == null ? 0 : s.scores[f.key] - 50));
  const cos = (u, v) => { const d = Math.sqrt(sum(u.map((x) => x * x)) * sum(v.map((x) => x * x))); return d ? sum(u.map((x, i) => x * v[i])) / d : 0; };
  for (const s of byId.values()) {
    const v = vec(s);
    s.comps = [...byId.values()].filter((o) => o.id !== s.id).map((o) => ({ id: o.id, sim: cos(v, vec(o)) })).sort((x, y) => y.sim - x.sim).slice(0, 3);
  }
  if (draws > 0 && eligible.length) monteCarlo(eligible, draws, seed);
  return { byId, stats, T, peerEng, eligibleIds: eligible.map((s) => s.id) };
}

/* Rank stability: re-draw feature weights (Dirichlet) and feature noise, then re-rank. Not a probability of success. */
export function monteCarlo(eligible, draws, seed) {
  const rng = mulberry32(seed);
  const K = 60;
  const W0 = FEATURES.map((f) => f.w);
  const store = new Map(eligible.map((s) => [s.id, []]));
  const top3 = new Map(eligible.map((s) => [s.id, 0]));
  for (let d = 0; d < draws; d++) {
    const g = W0.map((w) => gammaSample(rng, w * K));
    const tot = sum(g);
    const w = g.map((x) => x / tot);
    const vals = eligible.map((s) => {
      let wa = 0, ac = 0;
      FEATURES.forEach((f, i) => {
        const v = s.scores[f.key];
        if (v == null) return;
        const noisy = clamp(v + (4 + 14 * (1 - s.evidence)) * gauss(rng), 0, 100);
        wa += w[i]; ac += w[i] * noisy;
      });
      return { id: s.id, idx: wa ? 50 + s.evidence * (ac / wa - 50) : 50 };
    });
    for (const x of vals) store.get(x.id).push(x.idx);
    vals.sort((x, y) => y.idx - x.idx).slice(0, 3).forEach((x) => top3.set(x.id, top3.get(x.id) + 1));
  }
  for (const s of eligible) {
    const arr = store.get(s.id).sort((x, y) => x - y);
    s.lo = quantile(arr, 0.05); s.hi = quantile(arr, 0.95);
    s.stability = top3.get(s.id) / draws;
  }
}

export function peerMedianSeries(artists, T) {
  const bs = artists.filter((a) => a.series).map((a) => blendedIndex(a, T));
  return Array.from({ length: T + 1 }, (_, t) => median(bs.map((b) => b[t])));
}

/* ───────── Artistic quality (human-led) ───────── */

export const RUBRIC = [
  { key: "song", label: "Songwriting", w: 0.20, hint: "Melody, lyrics, hook craft, structure", lo: "Derivative", hi: "Memorable and original" },
  { key: "voc", label: "Vocals", w: 0.16, hint: "Tone, pitch control, range, delivery", lo: "Unsteady", hi: "Distinctive and controlled" },
  { key: "key", label: "Key and harmony", w: 0.10, hint: "Tonal choices, stability, harmonic interest", lo: "Static", hi: "Confident and interesting" },
  { key: "prod", label: "Production", w: 0.10, hint: "Mix clarity, loudness, arrangement", lo: "Muddy", hi: "Release-ready" },
  { key: "orig", label: "Originality", w: 0.16, hint: "A recognisable identity within the genre", lo: "Template", hi: "Unmistakable" },
  { key: "live", label: "Live presence", w: 0.10, hint: "Stage energy and consistency", lo: "Flat", hi: "Commanding" },
  { key: "cat", label: "Catalogue depth", w: 0.08, hint: "Repeatability across songs", lo: "One-song artist", hi: "Strong across the catalogue" },
  { key: "auth", label: "Cultural authenticity", w: 0.10, hint: "Language, idiom, rootedness, audience resonance", lo: "Borrowed", hi: "Rooted and resonant" },
];

export const complete = (r) => r && r.scores && RUBRIC.every((d) => typeof r.scores[d.key] === "number");
export const rubricValue = (scores) => 100 * sum(RUBRIC.map((d) => d.w * (scores[d.key] - 1) / 4));

export function artisticValue(revs) {
  const done = Object.entries(revs || {}).filter(([, r]) => complete(r));
  if (!done.length) return { value: null, reviewers: 0, agreement: null, perDim: {}, each: [] };
  const each = done.map(([id, r]) => ({ id, value: rubricValue(r.scores), notes: r.notes, at: r.at, seeded: !!r.seeded }));
  const perDim = Object.fromEntries(RUBRIC.map((d) => [d.key, mean(done.map(([, r]) => r.scores[d.key]))]));
  let agreement = null;
  if (done.length > 1) {
    const spread = mean(RUBRIC.map((d) => { const v = done.map(([, r]) => r.scores[d.key]); return Math.max(...v) - Math.min(...v); }));
    agreement = { spread, label: spread <= 0.5 ? "High" : spread <= 1 ? "Moderate" : "Low" };
  }
  return { value: mean(each.map((e) => e.value)), reviewers: done.length, agreement, perDim, each };
}

/* ───────── Recommendation logic ───────── */

export const TIERS = {
  pursue: { label: "Pursue now", tone: "go", rankOrder: 1 },
  "pursue-2nd": { label: "Pursue after a second review", tone: "go", rankOrder: 2 },
  develop: { label: "Develop first", tone: "info", rankOrder: 3 },
  momentum: { label: "Watch: momentum without artistry", tone: "warn", rankOrder: 4 },
  provisional: { label: "Provisional: thin evidence", tone: "warn", rankOrder: 5 },
  "needs-review": { label: "Needs artistic review", tone: "warn", rankOrder: 6 },
  hold: { label: "Hold: integrity", tone: "risk", rankOrder: 7 },
  pass: { label: "Pass for now", tone: "mute", rankOrder: 8 },
  pending: { label: "Awaiting measurement", tone: "mute", rankOrder: 9 },
};
export const MOMENTUM_BAR = 55;
export const ARTISTRY_BAR = 65;
export const EVIDENCE_BAR = 0.6;

export function recommend(sc, art) {
  if (!sc || sc.idx == null) return { tier: "pending", pick: null, momentum: null, why: "No measurements yet. Identity is verified; audience data is pending." };
  const paid = sc.integrity.status === "paid";
  const momentum = paid ? 50 + 0.6 * (sc.idx - 50) : sc.idx;
  const base = { momentum, paid, quadrant: null };
  if (sc.integrity.held) return { ...base, tier: "hold", pick: null, why: sc.integrity.status === "synthetic" ? "The catalogue shows machine-generation signals. A human must confirm the artist is real before anything else." : "Integrity signals need a human decision before this artist can be ranked." };
  if (!art || art.reviewers === 0) return { ...base, tier: "needs-review", pick: null, why: "The data looks interesting, but nobody has scored the music yet. Artistry decides this one." };
  const pick = 0.5 * momentum + 0.5 * art.value;
  const hiM = momentum >= MOMENTUM_BAR, hiA = art.value >= ARTISTRY_BAR;
  const quadrant = hiM && hiA ? "hh" : !hiM && hiA ? "ha" : hiM && !hiA ? "hm" : "ll";
  if (sc.evidence < EVIDENCE_BAR) return { ...base, quadrant, tier: "provisional", pick, why: "Evidence coverage is below the bar. Connect more sources before any commitment." };
  if (quadrant === "hh") return { ...base, quadrant, tier: art.reviewers >= 2 ? "pursue" : "pursue-2nd", pick, why: art.reviewers >= 2 ? "Strong momentum and strong artistry, confirmed by two reviewers." : "Strong on both counts, but signing needs a second independent artistic review." };
  if (quadrant === "ha") return { ...base, quadrant, tier: "develop", pick, why: "The music is strong and the audience is early. A development deal or release plan fits better than a bidding race." };
  if (quadrant === "hm") return { ...base, quadrant, tier: "momentum", pick, why: "The numbers are moving, but reviewers rate the music below the bar. Attention may not turn into loyalty." };
  return { ...base, quadrant, tier: "pass", pick, why: "Neither momentum nor artistry clears the bar this week." };
}

export function checklist(sc, art, rec) {
  const items = [];
  if (art && art.reviewers < 2) items.push("Second independent artistic review");
  if (sc && sc.integrity.status === "paid") items.push("Confirm the paid campaign with the artist's team");
  if (sc && sc.integrity.held) items.push("Resolve the integrity flag with evidence");
  if (sc && sc.evidence < EVIDENCE_BAR) items.push("Connect more sources and re-score next Monday");
  items.push("Verify identity and who owns the masters and publishing");
  if (rec && (rec.tier === "pursue" || rec.tier === "pursue-2nd" || rec.tier === "develop")) items.push("Live audition or listening session");
  return items;
}

export function whySurfaced(a, sc) {
  if (!sc || sc.idx == null) return "Identity is verified. Audience measurements are pending, so no score is shown.";
  const gv = sc.growthVsPeers * 100, g4 = (Math.exp(sc.growth4) - 1) * 100;
  const ps = Object.keys(a.series);
  const pos = ps.filter((p) => a.series[p].aud[sc.T] / a.series[p].aud[sc.T - 4] > 1.02).length;
  const sorted = [...sc.contributions].sort((x, y) => y.value - x.value);
  const top = sorted.slice(0, 2).filter((c) => c.value > 0.5).map((c) => c.label.toLowerCase());
  const low = sorted.slice(-1).filter((c) => c.value < -0.5).map((c) => c.label.toLowerCase());
  const accel = sc.raw.accel;
  let s = `${a.name}'s blended audience moved ${g4 >= 0 ? "+" : ""}${g4.toFixed(1)}% over four weeks, ${Math.abs(gv).toFixed(1)} points ${gv >= 0 ? "above" : "below"} the peer median`;
  s += accel > 0.01 ? " and is speeding up." : accel < -0.01 ? " but is slowing." : ", at a steady pace.";
  s += ` Growth shows on ${pos} of ${ps.length} platforms.`;
  if (top.length) s += ` Strongest drivers: ${top.join(" and ")}.`;
  if (low.length) s += ` Weakest area: ${low[0]}.`;
  if (sc.evidence < EVIDENCE_BAR) s += ` Evidence coverage is only ${pctS(sc.evidence)}, so treat this as a lead, not a finding.`;
  return s;
}

export function buildMemo({ week, rows, capacity }) {
  const lines = [`# A&R board memo, week of ${week}`, "", "_Simulated data. Rankings come from an unvalidated, expert-weighted model._", ""];
  const picks = rows.filter((r) => r.recommended);
  lines.push(`## Recommended picks (capacity ${capacity})`, "");
  if (!picks.length) lines.push("No artist clears the bar this week. Not filling slots on purpose.", "");
  for (const r of picks) {
    lines.push(`### ${r.a.name} (${r.a.city}, ${r.a.genre})`, `- Verdict: ${TIERS[r.rec.tier].label}`, `- Pick score ${r.rec.pick.toFixed(0)}; momentum ${r.rec.momentum.toFixed(0)}; artistic value ${r.art.value.toFixed(0)} from ${r.art.reviewers} reviewer(s)`, `- Why: ${r.rec.why}`, `- Before signing: ${r.list.join("; ")}`, "");
  }
  const rest = rows.filter((r) => !r.recommended);
  if (rest.length) { lines.push("## Everyone else", ""); for (const r of rest) lines.push(`- ${r.a.name}: ${TIERS[r.rec.tier].label}. ${r.rec.why}`); }
  return lines.join("\n");
}
