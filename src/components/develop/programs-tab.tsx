import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel, Portrait } from "@/components/br-ui";
import { cn } from "@/lib/utils";

const PROGRAM_PILLARS = [
  {
    title: "1. Repertoire & Songwriting",
    desc: "Co-writing camps with regional producers, vocal arrangements, demo tracking, and release cadence.",
    milestone: "EP pre-production finished",
  },
  {
    title: "2. Visual Identity & Brand Direction",
    desc: "Creative direction, styling, cover photography, press biography, and social tone-of-voice playbook.",
    milestone: "Brand assets and style guide locked",
  },
  {
    title: "3. Live Performance Craft",
    desc: "Set arrangement with live instrumentation, stage presence coaching, and local residency shows.",
    milestone: "30-minute festival-ready live set audited",
  },
  {
    title: "4. Audience & Community Cultivation",
    desc: "Super-fan WhatsApp / Telegram channel, grassroots campus activations, and UGC sound-launch strategy.",
    milestone: "1,000 verified core community members",
  },
  {
    title: "5. Cross-Territory Market Expansion",
    desc: "Strategic collaborations with artists in secondary focus territories (e.g., Kampala or Dar es Salaam).",
    milestone: "First regional cross-border feature released",
  },
];

export function ProgramsTab({ initialArtistId }: { initialArtistId?: string | undefined }) {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [selectedId, setSelectedId] = useState(initialArtistId ?? artists[0]?.id);

  const activeId = selectedId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeId);

  return (
    <div className="space-y-6">
      <Panel
        title="Artist Development Programs"
        sub="Systematic artist development framework: structuring repertoire, creative brand identity, live performance craft, and regional expansion."
      >
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Select artist for development program"
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
        <div className="space-y-6">
          <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Portrait
                seed={artist.portrait_seed}
                name={artist.name}
                isDemo={artist.is_demo}
                className="size-12 rounded-xl"
              />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {artist.name} Development Blueprint
                </h3>
                <div className="text-xs text-muted-foreground">
                  Current Pipeline Stage:{" "}
                  <strong className="text-foreground">{artist.pipeline_stage}</strong> · Focus
                  Territory: {artist.country}
                </div>
              </div>
            </div>
            <Link
              to="/artists/$id"
              params={{ id: artist.id }}
              className="text-xs text-primary hover:underline"
            >
              View full artist profile →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROGRAM_PILLARS.map((pillar, i) => (
              <div key={i} className="panel space-y-2.5 p-4 text-xs">
                <div className="font-bold text-foreground">{pillar.title}</div>
                <p className="text-muted-foreground leading-relaxed">{pillar.desc}</p>
                <div className="rounded-lg border bg-panel-raised p-2 text-[11px]">
                  <span className="font-semibold text-lime">Target Milestone:</span>{" "}
                  {pillar.milestone}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Panel title="No artist selected">
          <p className="text-xs text-muted-foreground">
            Select an artist to view their development blueprint.
          </p>
        </Panel>
      )}
    </div>
  );
}
