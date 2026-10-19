import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Snapshot } from "@/lib/artists";
import {
  compareSegments,
  isSuppressed,
  segmentBreakdownIssue,
  snapshotComparabilityIssue,
} from "@/lib/analytics";
import { Panel } from "@/components/br-ui";
import { cn } from "@/lib/utils";

const COLORS = ["var(--lime)", "var(--cyan)", "var(--violet)", "var(--amber)", "var(--chart-5)"];
const DIMS: [string, string][] = [
  ["age", "Age bracket"],
  ["city", "Market"],
  ["new_vs_returning", "New vs returning"],
  ["platform", "Platform"],
];

type Segs = Record<string, Record<string, number>>;

function Donut({ data, label }: { data: Record<string, number>; label: string }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  const top = rows[0];
  return (
    <div className="relative h-36 w-36">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={rows} dataKey="value" innerRadius={44} outerRadius={64} stroke="none">
            {rows.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-lg font-bold num">{top?.value}%</div>
          <div className="text-[10px] text-muted-foreground">
            {top?.name} · {label}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AudienceCompare({ prior, current }: { prior: Snapshot; current: Snapshot }) {
  const ps = prior.segments as Segs;
  const cs = current.segments as Segs;
  const priorCounts = prior.segment_counts as Segs;
  const currentCounts = current.segment_counts as Segs;
  const issue = snapshotComparabilityIssue(prior, current);
  if (issue)
    return (
      <Panel title="Comparison unavailable">
        <p className="text-sm text-muted-foreground">{issue}</p>
      </Panel>
    );
  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-cyan/30 bg-cyan/5 p-3 text-xs text-muted-foreground">
        {prior.reference_date} ({prior.window_days}d, {prior.total.toLocaleString()} denominator) →{" "}
        <b className="text-foreground">{current.reference_date}</b> ({current.window_days}d,{" "}
        {current.total.toLocaleString()} denominator). Source: {current.source}; cohort scheme:{" "}
        {current.cohort_scheme}; coverage: {Math.round((current.coverage ?? 0) * 100)}%. Share-point
        and absolute count changes are aggregate differences; they do not show individual movement.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {DIMS.map(([key, label]) => {
          const segmentIssue = segmentBreakdownIssue(ps[key], cs[key]);
          if (segmentIssue)
            return (
              <Panel key={key} title={label}>
                <p className="text-sm text-muted-foreground">{segmentIssue}</p>
              </Panel>
            );
          const rows = compareSegments(ps[key]!, prior.total, cs[key]!, current.total);
          return (
            <Panel key={key} title={label}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-center">
                  <Donut data={ps[key] ?? {}} label="prior" />
                  <div className="text-[10px] text-muted-foreground">Prior</div>
                </div>
                <div className="text-center">
                  <Donut data={cs[key] ?? {}} label="latest" />
                  <div className="text-[10px] text-muted-foreground">Latest</div>
                </div>
                <table className="min-w-52 flex-1 text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="text-left font-normal">Segment</th>
                      <th className="text-right font-normal">Share</th>
                      <th className="text-right font-normal">Δ pp</th>
                      <th className="text-right font-normal">Δ people</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const priorCount = priorCounts[key]?.[r.segment];
                      const currentCount = currentCounts[key]?.[r.segment];
                      const hidden =
                        (currentCount != null
                          ? currentCount < 50
                          : isSuppressed(r.currentShare, current.total)) ||
                        (priorCount != null
                          ? priorCount < 50
                          : isSuppressed(r.priorShare, prior.total));
                      const observedCountChange =
                        priorCount != null && currentCount != null
                          ? currentCount - priorCount
                          : null;
                      return (
                        <tr key={r.segment} className="border-t border-border/50">
                          <td className="py-1.5">{r.segment}</td>
                          <td className="text-right num">
                            {hidden ? "<50" : `${r.currentShare}%`}
                          </td>
                          <td
                            className={cn(
                              "text-right num",
                              r.ppChange > 0 ? "text-lime" : r.ppChange < 0 ? "text-amber" : "",
                            )}
                          >
                            {hidden ? "—" : `${r.ppChange > 0 ? "+" : ""}${r.ppChange}`}
                          </td>
                          <td
                            className={cn(
                              "text-right num",
                              observedCountChange != null && observedCountChange >= 0
                                ? "text-lime"
                                : "text-amber",
                            )}
                          >
                            {hidden || observedCountChange == null
                              ? "—"
                              : `${observedCountChange >= 0 ? "+" : ""}${observedCountChange.toLocaleString()}`}
                          </td>
                        </tr>
                      );
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-muted-foreground">
                          No supported segments in both snapshots.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function morphNarrative(prior: Snapshot, current: Snapshot): string {
  const ageIssue = segmentBreakdownIssue(
    (prior.segments as Segs)["age"],
    (current.segments as Segs)["age"],
  );
  if (ageIssue) return ageIssue;
  const rows = compareSegments(
    (prior.segments as Segs)["age"] ?? {},
    prior.total,
    (current.segments as Segs)["age"] ?? {},
    current.total,
  );
  const gain = [...rows].sort((a, b) => b.ppChange - a.ppChange)[0];
  const loss = [...rows].sort((a, b) => a.ppChange - b.ppChange)[0];
  if (!gain || !loss) return "Insufficient segment data.";
  const cross = compareSegments(
    (prior.segments as Segs)["city"] ?? {},
    prior.total,
    (current.segments as Segs)["city"] ?? {},
    current.total,
  ).find((r) => r.segment === "Cross-border");
  return `Largest share gain: ${gain.segment} (${gain.ppChange > 0 ? "+" : ""}${gain.ppChange} pp). Largest share loss: ${loss.segment} (${loss.ppChange} pp). Cross-border share ${cross ? `${cross.priorShare}% → ${cross.currentShare}%` : "n/a"}.`;
}
