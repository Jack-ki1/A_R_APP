import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";
import { cn } from "@/lib/utils";

export function CatalogueTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [selectedId, setSelectedId] = useState(artists[0]?.id);

  const activeId = selectedId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeId);

  return (
    <div className="space-y-6">
      <Panel
        title="Catalogue Depth & Release Conversion"
        sub="Distinguishing one-song viral spikes from sustained catalogue depth and repeated listener engagement."
      >
        <p className="text-sm text-muted-foreground">
          A breakout artist demonstrates catalogue conversion: new listeners of a viral track go on
          to stream prior releases or follow-up singles. Single-track dependency is isolated as a
          risk factor.
        </p>
      </Panel>

      <div
        className="flex gap-2 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Select artist for catalogue analysis"
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

      {artist && (
        <div className="grid gap-6 md:grid-cols-2">
          <Panel title={`${artist.name} — Catalogue Analysis`} sub="Track-level health indicators">
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Lead Single Velocity</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {artist.growth_30d != null ? `+${artist.growth_30d}% (30d)` : "Awaiting data"}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Catalogue Breadth</dt>
                <dd className="mt-1 font-semibold text-foreground">
                  {(artist.scores as Record<string, number>)["catalogue"] != null
                    ? `${(artist.scores as Record<string, number>)["catalogue"]}/100`
                    : "Unscored"}
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Repeat Stream Ratio</dt>
                <dd className="mt-1 font-semibold text-foreground">Awaiting export</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Catalogue Concentration</dt>
                <dd className="mt-1 font-semibold text-muted-foreground">Pending provider link</dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="A&R Catalogue Recommendation"
            sub="Strategic advice based on release structure"
          >
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                When an artist experiences rapid breakout on a single title, recommend immediate
                scheduling of a follow-up body of work (EP / acoustic companion) to test audience
                retention.
              </p>
              <div className="rounded-lg border bg-panel p-3 text-xs">
                <span className="font-semibold text-foreground">Next Action:</span>{" "}
                {artist.next_action ?? "Review release roadmap"}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
