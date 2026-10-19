import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Artist, Scores, SeriesPoint } from "@/lib/artists";

export const tableQuery = <
  T extends "saved_searches" | "integrity_cases" | "artistic_reviews" | "alerts" | "dev_tasks",
>(
  t: T,
) =>
  queryOptions({
    queryKey: [t],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(t)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const sc = (a: Artist) => (a.scores ?? {}) as Scores;
export const series = (a: Artist) => (a.series ?? []) as SeriesPoint[];

/** Hand-authored heuristics; no training or validation evidence exists. */
export const HEURISTIC_INDEX_CONFIGS = [
  {
    id: "br-index-v1",
    name: "Breakout Index v1",
    validationStatus: "not_validated",
    weights: {
      momentum: 0.3,
      fan_depth: 0.2,
      ugc_impact: 0.2,
      organic: 0.15,
      market_expansion: 0.15,
    },
  },
  {
    id: "br-index-v2",
    name: "Breakout Index v2 (candidate)",
    validationStatus: "not_validated",
    weights: {
      momentum: 0.25,
      fan_depth: 0.25,
      ugc_impact: 0.15,
      organic: 0.2,
      audience_evolution: 0.15,
    },
  },
] as const;

export function computeIndex(a: Artist, weights: Record<string, number>, minimumCoverage = 0.8) {
  const s = sc(a) as Record<string, number | null | undefined>;
  let tot = 0,
    observedWeight = 0,
    totalWeight = 0;
  const usedFeatures: string[] = [];
  const missingFeatures: string[] = [];
  for (const [k, v] of Object.entries(weights)) {
    if (v <= 0 || !Number.isFinite(v)) continue;
    totalWeight += v;
    const x = s[k];
    if (x != null && Number.isFinite(x)) {
      tot += x * v;
      observedWeight += v;
      usedFeatures.push(k);
    } else missingFeatures.push(k);
  }
  const coverage = totalWeight > 0 ? observedWeight / totalWeight : 0;
  const sufficient = coverage >= minimumCoverage && observedWeight > 0;
  return {
    value: sufficient ? Math.round(tot / observedWeight) : null,
    coverage,
    status: sufficient ? ("sufficient" as const) : ("insufficient_evidence" as const),
    usedFeatures,
    missingFeatures,
  };
}

export const MODELS = HEURISTIC_INDEX_CONFIGS;
export function modelScore(a: Artist, weights: Record<string, number>) {
  return computeIndex(a, weights).value;
}

/** Backtest: predict from first `cut` months, compare with actual final growth. */
export function backtest(a: Artist, cut: number) {
  const pts = series(a);
  if (pts.length <= cut || cut < 2) return null;
  const first = pts[0]!.a,
    last = pts[cut - 1]!.a,
    actual = pts[pts.length - 1]!.a;
  if (![first, last, actual].every((value) => Number.isFinite(value) && value > 0)) return null;
  const rate = (last / first) ** (1 / (cut - 1));
  const predicted = Math.round(last * rate ** (pts.length - cut));
  if (!Number.isFinite(predicted)) return null;
  return { predicted, actual, errorPct: Math.round(((predicted - actual) / actual) * 100) };
}

export const SOURCES = [
  { name: "MusicBrainz", kind: "Open music metadata", status: "Live lookup", fresh: "On demand" },
  {
    name: "ListenBrainz",
    kind: "Community listening aggregate",
    status: "Live lookup",
    fresh: "15 min cache",
  },
  { name: "YouTube Data API", kind: "Video discovery", status: "Not connected", fresh: "—" },
  { name: "Spotify", kind: "Artist-authorized / licensed", status: "Not connected", fresh: "—" },
  { name: "TikTok UGC", kind: "UGC intelligence", status: "Not connected", fresh: "—" },
  { name: "Audience snapshots", kind: "Demographics", status: "Synthetic demo data", fresh: "—" },
  {
    name: "Growth, alerts & scores",
    kind: "A&R analytics",
    status: "Synthetic demo data",
    fresh: "—",
  },
  { name: "Live & ticketing", kind: "Live demand", status: "Not connected", fresh: "—" },
  { name: "Artist-provided analytics", kind: "First-party", status: "Not connected", fresh: "—" },
];
