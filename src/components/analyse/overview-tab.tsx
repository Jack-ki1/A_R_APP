import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { artistsQuery, metricObservationsQuery, fmt, type SeriesPoint } from "@/lib/artists";
import { growthMultiplier } from "@/lib/analytics";
import { Panel, Portrait, IntegrityChip } from "@/components/br-ui";
import { cn } from "@/lib/utils";

export function OverviewTab({ initialArtistId }: { initialArtistId?: string | undefined }) {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [selectedId, setSelectedId] = useState(initialArtistId ?? artists[0]?.id);

  const activeId = selectedId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeId);
  const series = (artist?.series ?? []) as SeriesPoint[];
  const observationsQuery = useQuery(metricObservationsQuery(activeId ?? ""));
  const observations = observationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Select artist for analysis"
      >
        {artists.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === activeId}
            onClick={() => setSelectedId(a.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              a.id === activeId ? "border-lime bg-lime/10 text-lime" : "hover:bg-accent",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      {artist ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <Panel
              title={`${artist.name} — Growth Trajectory`}
              sub="Observed vs expected audience expansion over monthly intervals."
              action={
                <Link
                  to="/artists/$id"
                  params={{ id: artist.id }}
                  className="text-xs text-primary hover:underline"
                >
                  Full artist profile →
                </Link>
              }
            >
              {series.length > 0 ? (
                <div className="h-72">
                  <ResponsiveContainer>
                    <AreaChart data={series}>
                      <defs>
                        <linearGradient id="ana_grad" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="var(--lime)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--lime)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="m" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={fmt} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="a"
                        name="Actual Audience"
                        stroke="var(--lime)"
                        strokeWidth={2}
                        fill="url(#ana_grad)"
                      />
                      <Line
                        type="monotone"
                        dataKey="e"
                        name="Expected (Peer Baseline)"
                        stroke="var(--violet)"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No longitudinal series points available yet for this artist.
                </p>
              )}
            </Panel>

            <Panel
              title="Sourced Metric Observations"
              sub="Immutable observations with source, territory, and rights status."
            >
              {observations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b text-left text-muted-foreground">
                      <tr>
                        <th className="py-2">Metric</th>
                        <th>Value</th>
                        <th>Territory</th>
                        <th>Window</th>
                        <th>Rights</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {observations.map((obs) => (
                        <tr key={obs.id}>
                          <td className="py-2 font-medium">{obs.platform_metric_name}</td>
                          <td className="num font-semibold">{fmt(obs.value_decimal)}</td>
                          <td>{obs.territory ?? "Global"}</td>
                          <td className="text-muted-foreground">
                            {obs.start_at && obs.end_at
                              ? `${obs.start_at.slice(0, 10)} to ${obs.end_at.slice(0, 10)}`
                              : "—"}
                          </td>
                          <td>
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                              {obs.rights_status_snapshot ?? "authorized"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="py-4 text-xs text-muted-foreground">
                  No imported observation rows recorded yet. Import authorized exports in Settings.
                </p>
              )}
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel title="Candidate Snapshot" sub="Key momentum metrics">
              <div className="flex items-center gap-3 pb-3">
                <Portrait
                  seed={artist.portrait_seed}
                  name={artist.name}
                  isDemo={artist.is_demo}
                  className="size-12 rounded-xl"
                />
                <div>
                  <h3 className="font-semibold text-foreground">{artist.name}</h3>
                  <div className="text-xs text-muted-foreground">
                    {artist.genre} · {artist.country}
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border p-2.5">
                  <dt className="text-muted-foreground">Audience</dt>
                  <dd className="num mt-0.5 font-bold text-foreground">
                    {fmt(artist.audience_current)}
                  </dd>
                </div>
                <div className="rounded-lg border p-2.5">
                  <dt className="text-muted-foreground">Growth 30d</dt>
                  <dd className="num mt-0.5 font-bold text-lime">
                    {artist.growth_30d != null ? `+${artist.growth_30d}%` : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border p-2.5">
                  <dt className="text-muted-foreground">vs Expected</dt>
                  <dd className="num mt-0.5 font-bold text-foreground">
                    {growthMultiplier(artist.growth_30d, artist.expected_growth_30d) != null
                      ? `${growthMultiplier(artist.growth_30d, artist.expected_growth_30d)}×`
                      : "—"}
                  </dd>
                </div>
                <div className="rounded-lg border p-2.5">
                  <dt className="text-muted-foreground">Integrity</dt>
                  <dd className="mt-0.5">
                    <IntegrityChip value={artist.integrity} />
                  </dd>
                </div>
              </dl>
              <div className="mt-4 rounded-lg bg-panel p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Evidence standard:</span> Growth
                percentages require identical definitions and time windows. Missing values remain
                explicitly unrecorded.
              </div>
            </Panel>
          </div>
        </div>
      ) : (
        <Panel title="No artist selected" sub="Select or onboard an artist to inspect trajectory.">
          <p className="text-sm text-muted-foreground">
            No artists are currently tracked in this workspace.
          </p>
        </Panel>
      )}
    </div>
  );
}
