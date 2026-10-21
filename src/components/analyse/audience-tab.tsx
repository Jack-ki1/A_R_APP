import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery, snapshotsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";
import { AudienceCompare, morphNarrative } from "@/components/audience-compare";
import { cn } from "@/lib/utils";
import { latestComparableSnapshotPair } from "@/lib/analytics";

export function AudienceTab({ selectedArtistId }: { selectedArtistId?: string | undefined }) {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { data: snaps = [] } = useQuery(snapshotsQuery);
  const [sel, setSel] = useState(selectedArtistId ?? artists[0]?.id);

  const activeArtistId = sel ?? artists[0]?.id;
  const mine = snaps.filter((s) => s.artist_id === activeArtistId);
  const pair = latestComparableSnapshotPair(mine);
  const artist = artists.find((a) => a.id === activeArtistId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Audience Cohort Comparison</h2>
          <p className="text-sm text-muted-foreground">
            Compare only authorized snapshots with matching source, cohort definition, denominator,
            period length, quality and rights status. Aggregate changes do not track individual
            people.
          </p>
        </div>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Choose artist for audience comparison"
      >
        {artists.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === activeArtistId}
            onClick={() => setSel(a.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              a.id === activeArtistId ? "border-lime bg-lime/10 text-lime" : "hover:bg-accent",
            )}
          >
            {a.name}
          </button>
        ))}
      </div>

      {pair ? (
        <AudienceCompare prior={pair[0]} current={pair[1]} />
      ) : (
        <Panel
          title={`No comparable snapshot pair for ${artist?.name ?? "selected artist"}`}
          sub="Requires at least two snapshots with matching source, cohort breakdown and territory."
        >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Snapshot count: {mine.length}. To compute audience evolution, import two compatible
              exports with the same metric semantic and cohort bins.
            </p>
            <div className="rounded-lg border bg-panel p-4 text-xs">
              <span className="font-semibold text-foreground">Rule of evidence:</span> Aggregate
              shifts reflect changes in audience makeup across measurement intervals; they must
              never be presented as individual listener migration or personal tracking.
            </div>
            <Link to="/settings" className="inline-block text-primary hover:underline">
              Go to Settings to import audience snapshots →
            </Link>
          </div>
        </Panel>
      )}

      {pair && (
        <Panel title="Interpretation Narrative" sub="Derived from verified snapshot differences">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {morphNarrative(pair[0], pair[1])}
          </p>
        </Panel>
      )}
    </div>
  );
}
