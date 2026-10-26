import { describe, it, expect } from "vitest";
import { buildUniverse, SEED_REVIEWS, REVIEWERS } from "../src/data/universe.js";
import { PROVIDERS } from "../src/data/providers.js";
import { PLATFORMS, LAST } from "../src/engine/constants.js";
import {
  scoreUniverse, screen, artisticValue, recommend, checklist, rubricValue, RUBRIC, TIERS, FEATURES, EVIDENCE_BAR,
} from "../src/engine/engine.js";
import { marketMovers, underpriced, integritySplit, signalsFeed, pipelineCounts, explainCompare } from "../src/engine/insights.js";

const U = buildUniverse();
const byName = (n) => U.find((a) => a.name === n);
const all = scoreUniverse(U, LAST, 300);
const S = (n) => all.byId.get(byName(n).id);

describe("data and governance", () => {
  it("builds 14 simulated artists with deterministic series", () => {
    expect(U).toHaveLength(14);
    expect(buildUniverse()[0].series.yt.aud).toEqual(U[0].series.yt.aud);
  });
  it("feature weights sum to one", () => {
    expect(FEATURES.reduce((s, f) => s + f.w, 0)).toBeCloseTo(1, 10);
    expect(RUBRIC.reduce((s, d) => s + d.w, 0)).toBeCloseTo(1, 10);
  });
  it("no platform that feeds scoring comes from a blocked provider", () => {
    for (const p of Object.values(PLATFORMS)) {
      const prov = PROVIDERS.find((x) => x.id === p.provider);
      expect(prov, p.label).toBeTruthy();
      expect(prov.ml, p.label).not.toBe("blocked");
    }
  });
  it("Spotify and TikTok are blocked from scoring", () => {
    expect(PROVIDERS.find((p) => p.id === "spotify").ml).toBe("blocked");
    expect(PROVIDERS.find((p) => p.id === "tiktok").ml).toBe("blocked");
  });
});

describe("scoring", () => {
  it("never ranks held artists, and ranks the rest 1..n without gaps", () => {
    const held = all.byId.get(byName("Faida").id);
    expect(held.integrity.held).toBe(true);
    expect(held.rank).toBeNull();
    const ranks = [...all.byId.values()].map((s) => s.rank).filter((r) => r != null).sort((a, b) => a - b);
    expect(ranks).toEqual(ranks.map((_, i) => i + 1));
  });
  it("keeps every index inside 0..100 and lo <= idx <= hi for ranked artists", () => {
    for (const s of all.byId.values()) {
      expect(s.idx).toBeGreaterThanOrEqual(0); expect(s.idx).toBeLessThanOrEqual(100);
      if (s.rank != null) { expect(s.lo).toBeLessThanOrEqual(s.hi); expect(s.stability).toBeGreaterThanOrEqual(0); expect(s.stability).toBeLessThanOrEqual(1); }
    }
  });
  it("is reproducible: same seed, same range", () => {
    const again = scoreUniverse(U, LAST, 300);
    const a = all.byId.get(U[0].id), b = again.byId.get(U[0].id);
    expect(b.lo).toBe(a.lo); expect(b.hi).toBe(a.hi); expect(b.stability).toBe(a.stability);
  });
  it("treats missing signals as missing, not zero: Kilele has no fan-content score and lower evidence", () => {
    const k = S("Kilele");
    expect(k.scores.ugc).toBeNull();
    expect(k.evidence).toBeLessThan(EVIDENCE_BAR);
    expect(k.contributions.find((c) => c.key === "ugc")).toBeUndefined();
  });
  it("shrinks toward 50 when evidence is thin", () => {
    const k = S("Kilele");
    const raw = FEATURES.filter((f) => k.scores[f.key] != null);
    const wsum = raw.reduce((s, f) => s + f.w, 0);
    const rawScore = raw.reduce((s, f) => s + f.w * k.scores[f.key], 0) / wsum;
    expect(Math.abs(k.idx - 50)).toBeLessThan(Math.abs(rawScore - 50) + 1e-9);
  });
  it("is point-in-time: changing data after the cutoff does not change the score", () => {
    const T = 20;
    const base = scoreUniverse(U, T, 0);
    const mutated = U.map((a) => {
      const series = {};
      for (const p of Object.keys(a.series)) {
        const aud = a.series[p].aud.map((v, t) => (t > T ? v * 37 + 5 : v));
        series[p] = { aud, act: a.series[p].act };
      }
      return { ...a, series, engagement: a.engagement.map((v, t) => (t > T ? 999 : v)), ugcSeries: a.ugcSeries ? a.ugcSeries.map((v, t) => (t > T ? 9999 : v)) : null };
    });
    const after = scoreUniverse(mutated, T, 0);
    for (const a of U) {
      expect(after.byId.get(a.id).idx).toBeCloseTo(base.byId.get(a.id).idx, 9);
      expect(after.byId.get(a.id).integrity.status).toBe(base.byId.get(a.id).integrity.status);
    }
  });
});

describe("integrity screen", () => {
  it("flags the spike with weak retention and a geography shift for review", () => {
    const r = screen(byName("Faida"), LAST, {});
    expect(r.status).toBe("review"); expect(r.held).toBe(true);
  });
  it("reads a time-boxed campaign as probable paid promotion, which is not held", () => {
    const r = S("Lwanga Beats").integrity;
    expect(r.status).toBe("paid"); expect(r.held).toBe(false);
  });
  it("holds a machine-generated catalogue", () => {
    expect(S("Savanna Loop").integrity.status).toBe("synthetic");
  });
  it("does not flag a broad-based surge", () => {
    expect(S("Kito Mwende").integrity.status).toBe("clear");
  });
  it("does not call an ongoing campaign paid before it has ended", () => {
    const early = scoreUniverse(U, 21, 0).byId.get(byName("Lwanga Beats").id);
    expect(early.integrity.status).not.toBe("paid");
  });
});

describe("artistic value and recommendations", () => {
  it("scores only complete reviews and reports disagreement", () => {
    const partial = { amina: { scores: { song: 5 }, notes: "" } };
    expect(artisticValue(partial).reviewers).toBe(0);
    const kito = artisticValue(SEED_REVIEWS[byName("Kito Mwende").id]);
    expect(kito.reviewers).toBe(2);
    expect(kito.agreement.label).toBe("High");
    expect(kito.value).toBeGreaterThan(60);
  });
  it("rubric value runs from 0 to 100", () => {
    const lo = Object.fromEntries(RUBRIC.map((d) => [d.key, 1])), hi = Object.fromEntries(RUBRIC.map((d) => [d.key, 5]));
    expect(rubricValue(lo)).toBe(0); expect(rubricValue(hi)).toBeCloseTo(100, 9);
  });
  it("needs a review before any recommendation", () => {
    expect(recommend(S("Pwani Static"), artisticValue({})).tier).toBe("needs-review");
  });
  it("holds on integrity even when reviewers loved the music", () => {
    const glowing = { amina: { scores: Object.fromEntries(RUBRIC.map((d) => [d.key, 5])), notes: "" } };
    expect(recommend(S("Faida"), artisticValue(glowing)).tier).toBe("hold");
  });
  it("sends strong music with an early audience to development, and needs two reviewers to pursue", () => {
    const ineza = recommend(S("Ineza Rugira"), artisticValue(SEED_REVIEWS[byName("Ineza Rugira").id]));
    expect(ineza.tier).toBe("develop");
    const kito = recommend(S("Kito Mwende"), artisticValue(SEED_REVIEWS[byName("Kito Mwende").id]));
    expect(kito.tier).toBe("pursue");
    const one = { amina: SEED_REVIEWS[byName("Kito Mwende").id].amina };
    expect(recommend(S("Kito Mwende"), artisticValue(one)).tier).toBe("pursue-2nd");
  });
  it("discounts momentum when a paid push explains part of it", () => {
    const s = S("Lwanga Beats");
    const rec = recommend(s, artisticValue(SEED_REVIEWS[byName("Lwanga Beats").id]));
    expect(rec.paid).toBe(true);
    expect(rec.momentum).toBeCloseTo(50 + 0.6 * (s.idx - 50), 9);
  });
  it("gives every tier a label and tone", () => {
    for (const t of Object.values(TIERS)) { expect(t.label).toBeTruthy(); expect(t.tone).toBeTruthy(); }
  });
  it("always lists the ownership and identity check before signing", () => {
    const s = S("Kito Mwende");
    const rec = recommend(s, artisticValue(SEED_REVIEWS[byName("Kito Mwende").id]));
    expect(checklist(s, artisticValue(SEED_REVIEWS[byName("Kito Mwende").id]), rec).join(" ")).toMatch(/ownership|owns/i);
  });
});

describe("derived views", () => {
  const live = U;
  it("market movers leave held artists out", () => {
    const m = marketMovers(live, all);
    expect(m.find((x) => x.city === "Nakuru")).toBeUndefined(); // only Faida lives there, and Faida is held
    expect(m.length).toBeGreaterThan(5);
    for (const x of m) expect(x.series).toHaveLength(12);
  });
  it("integrity split adds up", () => {
    const sp = integritySplit(live, all);
    expect(sp.clear + sp.paid + sp.review + sp.synthetic).toBe(live.length);
    expect(sp.review).toBe(1); expect(sp.synthetic).toBe(1); expect(sp.paid).toBe(1);
  });
  it("underpriced gap is bounded and actions follow the rule", () => {
    for (const r of underpriced(live, all)) {
      expect(r.gap).toBeGreaterThanOrEqual(-100); expect(r.gap).toBeLessThanOrEqual(100);
      if (r.action === "Investigate") { expect(r.gap).toBeGreaterThanOrEqual(25); expect(r.s.evidence).toBeGreaterThanOrEqual(0.8); }
    }
  });
  it("signals feed puts integrity alerts before market notes", () => {
    const f = signalsFeed(live, all);
    expect(f[0].pri).toBe(0);
    expect(f.some((x) => x.tag === "Market")).toBe(true);
  });
  it("pipeline counts never grow down the funnel", () => {
    const rows = [{ a: byName("Kito Mwende") }];
    const c = pipelineCounts({ live, watch: [byName("Kito Mwende").id], reviews: SEED_REVIEWS, recs: { count: 1, rows }, decisions: [] });
    expect(c.map((x) => x.n)).toEqual([14, 1, 1, 1, 0]);
  });
  it("explainer cites only numbers that exist on screen", () => {
    const A = { a: byName("Kito Mwende"), sc: S("Kito Mwende"), art: artisticValue(SEED_REVIEWS[byName("Kito Mwende").id]) };
    const B = { a: byName("Nuru Chande"), sc: S("Nuru Chande"), art: artisticValue(SEED_REVIEWS[byName("Nuru Chande").id]) };
    const lines = explainCompare(A, B);
    expect(lines[0]).toContain(A.sc.idx.toFixed(0));
    expect(lines.join(" ")).not.toMatch(/NaN|undefined/);
  });
  it("reviewers are the three named roles", () => { expect(REVIEWERS.map((r) => r.id)).toEqual(["amina", "daniel", "grace"]); });
});
