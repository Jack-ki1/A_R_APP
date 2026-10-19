import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import portraitsA from "@/assets/portraits-a.jpg";
import portraitsB from "@/assets/portraits-b.jpg";

export type Artist = Database["public"]["Tables"]["artists"]["Row"];
export type Snapshot = Database["public"]["Tables"]["audience_snapshots"]["Row"];
export type MetricObservation = Database["public"]["Tables"]["metric_observations"]["Row"];
export type DataSource = Database["public"]["Tables"]["data_sources"]["Row"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];

export type Scores = Partial<
  Record<
    | "momentum"
    | "fan_depth"
    | "ugc_impact"
    | "audience_evolution"
    | "catalogue"
    | "artistic"
    | "market_expansion"
    | "organic"
    | "data_confidence"
    | "priority",
    number | null
  >
>;
export type SeriesPoint = { m: string; a: number; e: number };
export type ArtistEvent = { d: string; type: string; label: string };
export type Evidence = {
  facts?: string[];
  hypotheses?: string[];
  limitations?: string[];
  actions?: string[];
};

export const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "identified", label: "Identified" },
  { id: "watchlist", label: "Watchlist" },
  { id: "investigation", label: "Investigation" },
  { id: "artistic_review", label: "Artistic Review" },
  { id: "contact", label: "Contact" },
  { id: "live_audition", label: "Live Audition" },
  { id: "development", label: "Development" },
  { id: "negotiation", label: "Negotiation" },
  { id: "signed", label: "Signed" },
  { id: "passed", label: "Passed" },
];
export const stageLabel = (s: PipelineStage) => STAGES.find((x) => x.id === s)?.label ?? s;

export const INTEGRITY_LABEL: Record<string, string> = {
  organic: "Organic",
  paid_promo: "Paid promo (disclosed)",
  unknown: "Unknown",
  suspicious: "Needs review",
  confirmed_invalid: "Confirmed invalid",
};

export function portraitStyle(seed: number) {
  const i = (seed - 1) % 8;
  const sheet = i < 4 ? portraitsA : portraitsB;
  const pos = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"][i % 4];
  return { backgroundImage: `url(${sheet})`, backgroundSize: "200% 200%", backgroundPosition: pos };
}

export const artistsQuery = queryOptions({
  queryKey: ["artists"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("is_demo", false)
      .order("growth_30d", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data;
  },
});

export const artistQuery = (id: string) =>
  queryOptions({
    queryKey: ["artist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id)
        .eq("is_demo", false)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const metricObservationsQuery = (artistId: string) =>
  queryOptions({
    queryKey: ["metric_observations", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("metric_observations")
        .select("*")
        .eq("artist_id", artistId)
        .order("end_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const dataSourcesQuery = queryOptions({
  queryKey: ["data_sources"],
  queryFn: async () => {
    const { data, error } = await supabase.from("data_sources").select("*");
    if (error) throw error;
    return data;
  },
});

export const snapshotsQuery = queryOptions({
  queryKey: ["snapshots"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audience_snapshots")
      .select("*")
      .order("reference_date");
    if (error) throw error;
    return data;
  },
});

export const notesQuery = (artistId: string) =>
  queryOptions({
    queryKey: ["notes", artistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_notes")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const auditQuery = queryOptions({
  queryKey: ["audit"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw error;
    return data;
  },
});

export const myRolesQuery = queryOptions({
  queryKey: ["my-roles"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return { email: "", roles: [] as string[] };
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    return { email: u.user.email ?? "", roles: (data ?? []).map((r) => r.role as string) };
  },
});

/** Row cap for client-side evidence scans; totals come from the exact server-side count. */
const EVIDENCE_ROW_LIMIT = 1000;

export type EvidenceSummary = {
  observationCount: number;
  snapshotCount: number;
  latestObservationEnd: string | null;
  latestSnapshotDate: string | null;
  observedArtistIds: string[];
  artistsWithTwoSnapshots: number;
  truncated: boolean;
};

/**
 * Accepted, source-linked evidence only. An error here must render as an error state —
 * never as a zero — because a zero means "measured, and nothing is there".
 */
export const evidenceSummaryQuery = queryOptions({
  queryKey: ["evidence-summary"],
  queryFn: async (): Promise<EvidenceSummary> => {
    const [observations, snapshots] = await Promise.all([
      supabase
        .from("metric_observations")
        .select("artist_id, end_at", { count: "exact" })
        .eq("quality_status", "accepted")
        .order("end_at", { ascending: false })
        .limit(EVIDENCE_ROW_LIMIT),
      supabase
        .from("audience_snapshots")
        .select("artist_id, reference_date", { count: "exact" })
        .eq("quality_status", "accepted")
        .order("reference_date", { ascending: false })
        .limit(EVIDENCE_ROW_LIMIT),
    ]);
    if (observations.error) throw observations.error;
    if (snapshots.error) throw snapshots.error;
    const observationRows = observations.data ?? [];
    const snapshotRows = snapshots.data ?? [];
    const snapshotCounts = new Map<string, number>();
    for (const row of snapshotRows)
      snapshotCounts.set(row.artist_id, (snapshotCounts.get(row.artist_id) ?? 0) + 1);
    return {
      observationCount: observations.count ?? observationRows.length,
      snapshotCount: snapshots.count ?? snapshotRows.length,
      latestObservationEnd: observationRows[0]?.end_at ?? null,
      latestSnapshotDate: snapshotRows[0]?.reference_date ?? null,
      observedArtistIds: [...new Set(observationRows.map((row) => row.artist_id))],
      artistsWithTwoSnapshots: [...snapshotCounts.values()].filter((count) => count >= 2).length,
      truncated:
        (observations.count ?? observationRows.length) > observationRows.length ||
        (snapshots.count ?? snapshotRows.length) > snapshotRows.length,
    };
  },
  staleTime: 30_000,
});

export const fmt = (n: number | null) =>
  n == null ? "—" : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;
