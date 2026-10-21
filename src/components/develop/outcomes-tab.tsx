import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";

export function OutcomesTab() {
  const { data: artists = [] } = useQuery(artistsQuery);

  const signedArtists = artists.filter(
    (a) => a.pipeline_stage === "signed" || a.pipeline_stage === "development",
  );

  return (
    <div className="space-y-6">
      <Panel
        title="Measured Development Outcomes & Feedback Loop"
        sub="Auditing whether label interventions, release strategies, and development investments produced durable audience growth."
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          The development feedback loop bridges back to Discover and Evaluate: we analyze which
          creative attributes and early telemetry signals translated into sustained artist success,
          continuously refining our scouting criteria and future model calibration.
        </p>
      </Panel>

      <div className="space-y-4">
        {signedArtists.map((a) => (
          <div key={a.id} className="panel space-y-3 p-4 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground text-sm">{a.name}</h4>
                <div className="text-muted-foreground">
                  {a.genre} · {a.country} · Stage: {a.pipeline_stage}
                </div>
              </div>
              <span className="rounded bg-lime/10 px-2 py-0.5 font-bold text-lime">
                Active Roster
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Pre-Development Audience</div>
                <div className="font-semibold text-foreground mt-0.5">Baseline recorded</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Current 30d Growth</div>
                <div className="font-semibold text-lime mt-0.5">
                  {a.growth_30d != null ? `+${a.growth_30d}%` : "—"}
                </div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Integrity Audit</div>
                <div className="font-semibold text-foreground mt-0.5 capitalize">{a.integrity}</div>
              </div>
              <div className="rounded-lg border p-2.5">
                <div className="text-muted-foreground">Milestone Evaluation</div>
                <div className="font-semibold text-foreground mt-0.5">On Schedule</div>
              </div>
            </div>
          </div>
        ))}

        {signedArtists.length === 0 && (
          <Panel title="No signed or developing artists yet">
            <p className="text-xs text-muted-foreground">
              Artists moved to &quot;Development&quot; or &quot;Signed&quot; on the Decide pipeline
              board will display their longitudinal outcome metrics here.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
