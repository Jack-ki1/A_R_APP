import { AS_OF, LAST } from "./constants";
import { FEATURES, artisticValue } from "./engine";
import { mean, median, sum } from "./math";
import { fmtPct, fmtSigned } from "../ui/util";

/* ───────── Portfolio helpers (derived only from scored data, never invented) ───────── */

export function totalAudience(a, T = LAST) { return sum(Object.values(a.series).map((s) => s.aud[T])); }

export function marketMovers(artists, scores) {
  const by = {};
  for (const a of artists) {
    const s = a.series && scores.byId.get(a.id);
    if (!s) continue;
    if (!by[a.city]) by[a.city] = { city: a.city, country: a.country, items: [] };
    by[a.city].items.push({ a, s });
  }
  return Object.values(by).map((g0) => {
    const g = { ...g0, items: g0.items.filter((x) => !x.s.integrity.held) }; // held artists never inflate a market's growth
    if (!g.items.length) return null;
    const n = g.items.length;
    const len = Math.min(...g.items.map((x) => x.s.B.length));
    const series = Array.from({ length: 12 }, (_, k) => mean(g.items.map((x) => x.s.B[len - 12 + k])));
    return { city: g.city, country: g.country, n, growth: median(g.items.map((x) => x.s.growth4)), series, flagged: g0.items.length - g.items.length };
  }).filter(Boolean).sort((x, y) => y.growth - x.growth);
}

export function integritySplit(artists, scores) {
  const out = { clear: 0, paid: 0, review: 0, synthetic: 0 };
  for (const a of artists) { const s = a.series && scores.byId.get(a.id); if (s) out[s.integrity.status] += 1; }
  return out;
}

export function signalsFeed(artists, scores) {
  const feed = [];
  for (const a of artists) {
    const s = a.series && scores.byId.get(a.id);
    if (!s) continue;
    const first = (sev) => s.integrity.signals.find((x) => (sev ? x.sev === sev : true));
    if (s.integrity.status === "synthetic") feed.push({ pri: 0, artistId: a.id, tone: "risk", tag: "Synthetic risk", icon: "shield", title: `${a.name}: catalogue may be machine-made`, text: first("high").text });
    else if (s.integrity.status === "review") feed.push({ pri: 0, artistId: a.id, tone: "risk", tag: "Integrity alert", icon: "flag", title: `${a.name}: unusual growth pattern`, text: first("high").text });
    else if (s.integrity.status === "paid") feed.push({ pri: 1, artistId: a.id, tone: "info", tag: "Campaign window", icon: "bolt", title: `${a.name}: likely paid push`, text: first("info").text });
    else if (s.integrity.markers.some((m) => m.kind === "surge")) feed.push({ pri: 2, artistId: a.id, tone: "lime", tag: "Breakout signal", icon: "trend", title: `${a.name}: broad-based surge`, text: (first("info") || s.integrity.signals[0] || { text: "Several platforms rose together." }).text });
  }
  const mv = marketMovers(artists, scores)[0];
  if (mv) feed.push({ pri: 3, artistId: null, tone: "go", tag: "Market", icon: "pin", title: `${mv.city} leads on growth`, text: `Median four-week audience growth of ${(Math.exp(mv.growth) * 100 - 100).toFixed(1)}% across ${mv.n} tracked artist${mv.n > 1 ? "s" : ""}.` });
  return feed.sort((x, y) => x.pri - y.pri);
}

/* Underpriced potential: how far the evidence-based rank sits above the visibility rank. A ranking gap, not a probability. */
export function underpriced(artists, scores) {
  const rows = artists.filter((a) => a.series).map((a) => ({ a, s: scores.byId.get(a.id), aud: totalAudience(a) })).filter((r) => r.s && r.s.rank != null);
  if (!rows.length) return [];
  const pctRank = (vals, v) => (100 * vals.filter((x) => x < v).length) / Math.max(1, vals.length - 1);
  const idxs = rows.map((r) => r.s.idx), auds = rows.map((r) => r.aud);
  for (const r of rows) {
    r.gap = pctRank(idxs, r.s.idx) - pctRank(auds, r.aud);
    r.action = r.gap >= 25 && r.s.stability >= 0.5 && r.s.evidence >= 0.8 ? "Investigate" : r.gap > 0 ? "Monitor" : "Watch";
  }
  return rows.sort((x, y) => y.gap - x.gap);
}

export function pipelineCounts({ live, watch, reviews, recs, decisions }) {
  const reviewed = live.filter((a) => artisticValue(reviews[a.id]).reviewers > 0 && (watch.includes(a.id))).length;
  return [
    { k: "disc", label: "Discovered", n: live.length },
    { k: "short", label: "Shortlisted", n: live.filter((a) => watch.includes(a.id)).length },
    { k: "rev", label: "Artistically reviewed", n: reviewed },
    { k: "rec", label: "Recommended", n: recs.count },
    { k: "dec", label: "Decision logged", n: new Set(decisions.filter((d) => d.week === AS_OF).map((d) => d.artistId)).size },
  ];
}

/* Grounded explainer. Every sentence is built from scored numbers. An LLM may phrase these later, but only from these facts. */
export function explainCompare(A, B) {
  const va = Object.fromEntries(A.sc.contributions.map((c) => [c.key, c])), vb = Object.fromEntries(B.sc.contributions.map((c) => [c.key, c]));
  const diffs = FEATURES.filter((f) => va[f.key] && vb[f.key]).map((f) => ({ label: f.label, d: va[f.key].value - vb[f.key].value })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d)).slice(0, 3);
  const lines = [`${A.a.name} has breakout index ${A.sc.idx.toFixed(0)} against ${B.a.name}'s ${B.sc.idx.toFixed(0)}.`];
  for (const d of diffs) lines.push(`${d.label}: ${d.d >= 0 ? A.a.name : B.a.name} leads by ${Math.abs(d.d).toFixed(1)} points.`);
  if (A.art.value != null && B.art.value != null) lines.push(`Artistic value: ${A.art.value.toFixed(0)} against ${B.art.value.toFixed(0)}.`);
  else lines.push("At least one of them has no artistic review yet, so artistry cannot be compared.");
  lines.push(`Evidence coverage: ${fmtPct(A.sc.evidence)} against ${fmtPct(B.sc.evidence)}.`);
  return lines;
}
export function explainChanges(a, sc) {
  const g4 = (Math.exp(sc.growth4) - 1) * 100, acc = sc.raw.accel * 100;
  const lines = [`Blended audience moved ${fmtSigned(g4)}% in four weeks, ${fmtSigned(sc.growthVsPeers * 100)} points against the peer median.`, `Acceleration versus the prior four weeks: ${fmtSigned(acc)} points.`];
  const shift = a.geo.map(([k, v], i) => ({ k, d: v - a.geoPrev[i][1] })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
  lines.push(`Biggest audience-mix shift: ${shift.k} ${fmtSigned(shift.d * 100, 0)} points.`);
  const eN = median(a.engagement.slice(LAST - 3)), eP = median(a.engagement.slice(LAST - 7, LAST - 3));
  lines.push(`Engagement per 1,000 views: ${eN.toFixed(0)} now, ${eP.toFixed(0)} before.`);
  if (sc.integrity.signals.length) lines.push(`Integrity: ${sc.integrity.label}.`);
  return lines;
}
export function explainLookalikes(sc, nameOf) { return sc.comps.map((c) => `${nameOf(c.id)}: similarity ${c.sim.toFixed(2)} on the feature profile.`).concat(["These are peers in this demo universe. In production, compare with historical artists at the same career stage."]); }
export function explainMissing(row) { return row.list.map((x) => x); }


export function scoreChips(sc, art) {
  const f = (k) => (sc && sc.scores[k] != null ? sc.scores[k] : null);
  const fan = [f("engagement"), f("repeat")].filter((v) => v != null);
  return [
    { k: "Momentum", v: sc && sc.idx != null ? sc.idx : null, color: "var(--s1)" },
    { k: "Fandom", v: fan.length ? mean(fan) : null, color: "var(--s2)" },
    { k: "Music quality", v: art && art.value != null ? art.value : null, color: "var(--s3)" },
    { k: "Market", v: f("geo"), color: "var(--s4)" },
    { k: "Live", v: art && art.perDim && art.perDim.live != null ? ((art.perDim.live - 1) / 4) * 100 : null, color: "var(--ok)" },
  ];
}
