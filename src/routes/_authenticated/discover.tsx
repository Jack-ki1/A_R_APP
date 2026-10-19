import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, evidenceSummaryQuery, fmt, INTEGRITY_LABEL } from "@/lib/artists";
import { tableQuery, sc } from "@/lib/modules";
import {
  countDiscoverTabs,
  DISCOVER_TABS,
  EMPTY_DISCOVER_FILTERS,
  filterArtists,
  type DiscoverFilters,
  type DiscoverTabId,
} from "@/lib/discover";
import { Panel, Portrait, DemoBadge, ScoreRing, IntegrityChip } from "@/components/br-ui";
import { ArtistIntakeSearch } from "@/components/artist-intake";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({
    meta: [
      { title: "Discover — Breakout Radar" },
      { name: "description", content: "Find artists, filter the cohort and save searches." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(tableQuery("saved_searches")),
    ]),
  component: Discover,
});

const sel = "h-9 rounded-lg border bg-panel px-2 text-sm";

function Discover() {
  const { data } = useSuspenseQuery(artistsQuery);
  const { data: saved } = useSuspenseQuery(tableQuery("saved_searches"));
  const evidence = useQuery(evidenceSummaryQuery);
  const qc = useQueryClient();
  const [f, setF] = useState<DiscoverFilters>(EMPTY_DISCOVER_FILTERS);
  const [name, setName] = useState("");
  const uniq = (k: "country" | "genre") => [...new Set(data.map((a) => a[k]))].sort();
  const context = useMemo(
    () => ({ observedArtistIds: evidence.isSuccess ? evidence.data.observedArtistIds : null }),
    [evidence.isSuccess, evidence.data],
  );
  const counts = useMemo(() => countDiscoverTabs(data, f, context), [data, f, context]);
  const rows = useMemo(() => filterArtists(data, f, context), [data, f, context]);
  const setTab = (tab: DiscoverTabId) => setF((current) => ({ ...current, tab }));

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("saved_searches")
        .insert({ name: name.trim(), filters: f });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      toast.success("Search saved");
      qc.invalidateQueries({ queryKey: ["saved_searches"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved_searches"] }),
  });

  return (
    <div className="space-y-4">
      <Panel
        title="Find an artist"
        sub="Search MusicBrainz for a verified identity, then confirm and add it to the radar. Identity metadata only — no popularity or growth is invented."
      >
        <ArtistIntakeSearch />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <Panel title="Discover" sub={`${rows.length} of ${data.length} artists match`}>
          <div
            className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2"
            role="group"
            aria-label="Cohort views"
          >
            {DISCOVER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                title={tab.hint}
                aria-pressed={f.tab === tab.id}
                onClick={() => setTab(tab.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  f.tab === tab.id
                    ? "bg-lime/15 text-lime"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {tab.label} <span className="num opacity-70">{counts[tab.id]}</span>
              </button>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-end gap-3 text-xs">
            <label className="grid gap-1">
              Country
              <select
                className={sel}
                value={f.country}
                onChange={(e) => setF({ ...f, country: e.target.value })}
              >
                <option value="">Any</option>
                {uniq("country").map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Genre
              <select
                className={sel}
                value={f.genre}
                onChange={(e) => setF({ ...f, genre: e.target.value })}
              >
                <option value="">Any</option>
                {uniq("genre").map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              Integrity
              <select
                className={sel}
                value={f.integrity}
                onChange={(e) => setF({ ...f, integrity: e.target.value })}
              >
                <option value="">Any</option>
                {Object.entries(INTEGRITY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Apply momentum threshold"
                  checked={f.momentumFilterEnabled}
                  onChange={(e) => setF({ ...f, momentumFilterEnabled: e.target.checked })}
                  className="accent-lime"
                />
                Min momentum: {f.momentumFilterEnabled ? f.minMomentum : "off"}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={f.minMomentum}
                disabled={!f.momentumFilterEnabled}
                aria-label="Minimum momentum score"
                onChange={(e) => setF({ ...f, minMomentum: +e.target.value })}
              />
            </label>
            <label className="grid gap-1">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label="Apply 30-day growth threshold"
                  checked={f.growthFilterEnabled}
                  onChange={(e) => setF({ ...f, growthFilterEnabled: e.target.checked })}
                  className="accent-lime"
                />
                Min 30d growth: {f.growthFilterEnabled ? `${f.minGrowth}%` : "off"}
              </span>
              <input
                type="range"
                min={0}
                max={200}
                step={10}
                value={f.minGrowth}
                disabled={!f.growthFilterEnabled}
                aria-label="Minimum 30-day growth percentage"
                onChange={(e) => setF({ ...f, minGrowth: +e.target.value })}
              />
            </label>
            <Button variant="ghost" size="sm" onClick={() => setF(EMPTY_DISCOVER_FILTERS)}>
              Reset
            </Button>
            <p className="w-full text-[11px] text-muted-foreground">
              Unknown momentum or growth never hides an artist. Turn on a threshold only when you
              actively want to exclude unmeasured values.
            </p>
          </div>

          <div className="divide-y">
            {rows.map((a) => (
              <Link
                key={a.id}
                to="/artists/$id"
                params={{ id: a.id }}
                className="flex items-center gap-3 py-2.5 hover:text-lime"
              >
                <Portrait
                  seed={a.portrait_seed}
                  name={a.name}
                  isDemo={a.is_demo}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {a.name}
                    {a.is_demo && <DemoBadge />}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.genre} · {a.city}, {a.country}
                  </div>
                </div>
                <IntegrityChip value={a.integrity} />
                <span className="w-24 text-right text-xs num">
                  {fmt(a.audience_current)} ·{" "}
                  <span className="text-lime">
                    {a.growth_30d == null ? "—" : `+${a.growth_30d}%`}
                  </span>
                </span>
                {sc(a).momentum == null ? (
                  <span
                    className="w-16 text-right text-xs text-muted-foreground"
                    title="No momentum score yet — not enough evidence, not a zero"
                  >
                    —
                  </span>
                ) : (
                  <ScoreRing value={sc(a).momentum} size={34} />
                )}
              </Link>
            ))}
            {!rows.length && data.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>No artists are monitored yet.</p>
                <p className="mt-1 text-xs">
                  Use the search above to find and confirm a verified MusicBrainz identity — it will
                  appear here straight away, even before any metrics exist.
                </p>
              </div>
            )}
            {!rows.length && data.length > 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No artists match this view and these filters. Artists with unknown metrics are only
                hidden when a numeric threshold is switched on.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Saved searches">
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) save.mutate();
            }}
          >
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name this search"
              aria-label="Search name"
            />
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Save
            </Button>
          </form>
          <ul className="space-y-1">
            {saved.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent"
              >
                <button
                  className="flex-1 text-left"
                  onClick={() =>
                    setF({ ...EMPTY_DISCOVER_FILTERS, ...(s.filters as Partial<DiscoverFilters>) })
                  }
                >
                  {s.name}
                </button>
                <button aria-label={`Delete ${s.name}`} onClick={() => del.mutate(s.id)}>
                  <Trash2 className="size-3.5 text-muted-foreground" />
                </button>
              </li>
            ))}
            {!saved.length && (
              <li className="text-xs text-muted-foreground">No saved searches yet.</li>
            )}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
