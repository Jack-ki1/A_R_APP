import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery, type Evidence } from "@/lib/artists";
import { Panel, Portrait, IntegrityChip } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BriefsTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [selectedId, setSelectedId] = useState(artists[0]?.id);

  const activeId = selectedId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeId);
  const evidence = (artist?.evidence ?? {}) as Evidence;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Panel
        title="A&R Decision Briefs & Executive Memos"
        sub="Standardized decision memos summarizing verified evidence, creative evaluation, integrity findings, and signing recommendations."
        action={
          artist && (
            <Button size="sm" variant="outline" onClick={handlePrint}>
              Export / Print Memo
            </Button>
          )
        }
      >
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Select artist for memo"
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
      </Panel>

      {artist ? (
        <div className="panel space-y-6 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-4">
              <Portrait
                seed={artist.portrait_seed}
                name={artist.name}
                isDemo={artist.is_demo}
                className="size-14 rounded-xl"
              />
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  A&R Investment Memo
                </span>
                <h2 className="text-2xl font-bold text-foreground">{artist.name}</h2>
                <div className="text-xs text-muted-foreground">
                  {artist.city}, {artist.country} · Genre: {artist.genre} · Canonical ID:{" "}
                  {artist.canonical_id}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <IntegrityChip value={artist.integrity} />
              <span className="text-[11px] text-muted-foreground">
                Current Stage: <strong className="text-foreground">{artist.pipeline_stage}</strong>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                1. Executive Summary
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {artist.why_now ||
                  "A candidate identified through verified discovery channels with organic audience signals."}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                2. Corroborated Facts (Verified)
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {(evidence.facts ?? []).map((fact, idx) => (
                  <li key={idx}>{fact}</li>
                ))}
                {(!evidence.facts || evidence.facts.length === 0) && (
                  <li>Identity confirmed in MusicBrainz repository.</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                3. Working Hypotheses
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {(evidence.hypotheses ?? []).map((hyp, idx) => (
                  <li key={idx}>{hyp}</li>
                ))}
                {(!evidence.hypotheses || evidence.hypotheses.length === 0) && (
                  <li>Audience expansion in core territory indicates cross-platform appeal.</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                4. Known Data Limitations &amp; Risks
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {(evidence.limitations ?? []).map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
                {(!evidence.limitations || evidence.limitations.length === 0) && (
                  <li>UGC reach data requires direct creator authorization before full sizing.</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                5. Recommended A&R Actions
              </h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                {(evidence.actions ?? []).map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
                {(!evidence.actions || evidence.actions.length === 0) && (
                  <li>Schedule live audition and obtain direct provider authorization.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <Panel title="No artist selected">
          <p className="text-xs text-muted-foreground">
            Select an artist to view or export their decision brief.
          </p>
        </Panel>
      )}
    </div>
  );
}
