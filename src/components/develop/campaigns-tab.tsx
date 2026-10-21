import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";
import { cn } from "@/lib/utils";

const EXPERIMENTS = [
  {
    type: "Single Pre-Release Sound Drop",
    channel: "TikTok / IG Reels audio hook",
    hypothesis:
      "Early audio leak of 15s chorus drives user-generated sound creations before DSP release.",
    metric: "UGC sound posts & pre-saves",
  },
  {
    type: "Acoustic Campus Live Pop-Up",
    channel: "University student union grassroots event",
    hypothesis: "Intimate stripped-back performance drives immediate Spotify follow conversion.",
    metric: "Audience follower spike in 48h",
  },
  {
    type: "Cross-Border Regional Feature",
    channel: "Collaborative single with Ugandan artist",
    hypothesis: "Shared release unlocks Kampala regional streaming playlist placement.",
    metric: "Regional audience share in Uganda",
  },
];

export function CampaignsTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [selectedId, setSelectedId] = useState(artists[0]?.id);

  const activeId = selectedId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeId);

  return (
    <div className="space-y-6">
      <Panel
        title="Release & Brand Campaigns"
        sub="Hypothesis-driven campaign roadmaps with predefined baseline metrics, target audiences, and measurable milestones."
      >
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Select artist for campaigns"
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

      {artist && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {EXPERIMENTS.map((exp, idx) => (
              <div key={idx} className="panel space-y-3 p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{exp.type}</span>
                  <span className="rounded bg-lime/10 px-2 py-0.5 text-[10px] text-lime">
                    Active plan
                  </span>
                </div>
                <div className="text-muted-foreground">
                  Channel: <strong className="text-foreground">{exp.channel}</strong>
                </div>
                <p className="text-muted-foreground">{exp.hypothesis}</p>
                <div className="border-t pt-2 text-[11px] text-muted-foreground">
                  Success metric: <strong className="text-foreground">{exp.metric}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
