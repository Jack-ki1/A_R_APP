import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { artistsQuery, snapshotsQuery } from "@/lib/artists";
import { Panel, Portrait } from "@/components/br-ui";
import { AudienceCompare, morphNarrative } from "@/components/audience-compare";
import { cn } from "@/lib/utils";
import { latestComparableSnapshotPair } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/audience")({
  head: () => ({
    meta: [
      { title: "Audience Morphing — Breakout Radar" },
      { name: "description", content: "How artist audiences are changing over time." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(snapshotsQuery),
    ]),
  component: AudiencePage,
});

function AudiencePage() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: snaps } = useSuspenseQuery(snapshotsQuery);
  const [sel, setSel] = useState(artists[0]?.id);
  const pick = (id?: string) => snaps.filter((s) => s.artist_id === id);
  const mine = pick(sel);
  const pair = latestComparableSnapshotPair(mine);
  const artist = artists.find((a) => a.id === sel);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audience Cohort Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Compare only authorized snapshots with matching source, cohort definition, denominator,
            period length, quality and rights status. Aggregate changes do not track individual
            people.
          </p>
          <Link to="/ugc" className="mt-2 inline-block text-sm text-primary hover:underline">
            Fan content (UGC) status →
          </Link>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Choose artist">
        {artists.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === sel}
            onClick={() => setSel(a.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
              a.id === sel ? "border-lime bg-lime/10 text-lime" : "hover:bg-accent",
            )}
          >
            <Portrait seed={a.portrait_seed} name={a.name} isDemo={a.is_demo} className="size-6" />{" "}
            {a.name}
          </button>
        ))}
      </div>
      {artist && pair ? (
        <>
          <Panel
            title={`Comparable audience change — ${artist.name}`}
            sub={`${pair[0].reference_date} → ${pair[1].reference_date} · ${pair[1].source} · ${pair[1].cohort_scheme}`}
            action={
              <Link
                to="/artists/$id"
                params={{ id: artist.id }}
                className="text-xs text-lime hover:underline"
              >
                Open profile →
              </Link>
            }
          >
            <p className="text-sm">{morphNarrative(pair[0], pair[1])}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Observed aggregate change only. It does not show that the same people moved between
              markets or cohorts.
            </p>
          </Panel>
          <AudienceCompare prior={pair[0]} current={pair[1]} />
        </>
      ) : (
        <Panel title={artist ? `Audience data — ${artist.name}` : "Audience data"}>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No comparable authorized snapshot pair is available. Two snapshots alone are not enough:
            source, cohort taxonomy, denominator, window length, quality, rights and coverage must
            also match.
          </p>
        </Panel>
      )}
    </div>
  );
}
