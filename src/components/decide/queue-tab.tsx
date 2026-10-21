import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery, stageLabel, fmt } from "@/lib/artists";
import { Panel, Portrait, IntegrityChip, ScoreRing } from "@/components/br-ui";

export function QueueTab() {
  const { data: artists = [] } = useQuery(artistsQuery);

  const decisionQueue = artists
    .filter((a) => a.pipeline_stage !== "signed" && a.pipeline_stage !== "passed")
    .sort((a, b) => {
      const pB = (b.scores as Record<string, number>)["priority"] ?? 0;
      const pA = (a.scores as Record<string, number>)["priority"] ?? 0;
      return pB - pA;
    });

  return (
    <div className="space-y-6">
      <Panel
        title="A&R Decision & Review Queue"
        sub="Prioritized candidates awaiting investigative follow-up, live audition scheduling, or contract progression."
      >
        <p className="text-sm text-muted-foreground">
          Ordered by priority and evidence readiness. Filtered to exclude finalized signings and
          archived passes.
        </p>
      </Panel>

      <div className="overflow-x-auto rounded-xl border bg-panel">
        <table className="w-full text-xs">
          <thead className="border-b text-left text-muted-foreground uppercase tracking-wider">
            <tr>
              <th className="p-3">Artist</th>
              <th className="p-3">Territory</th>
              <th className="p-3">Stage</th>
              <th className="p-3 text-right">Audience</th>
              <th className="p-3 text-right">30d Growth</th>
              <th className="p-3 text-center">Priority</th>
              <th className="p-3">Integrity</th>
              <th className="p-3">Next Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {decisionQueue.map((a) => {
              const priority = (a.scores as Record<string, number>)["priority"];
              return (
                <tr key={a.id} className="hover:bg-accent/40 transition">
                  <td className="p-3">
                    <Link
                      to="/artists/$id"
                      params={{ id: a.id }}
                      className="flex items-center gap-2.5 font-medium text-foreground hover:text-lime"
                    >
                      <Portrait
                        seed={a.portrait_seed}
                        name={a.name}
                        isDemo={a.is_demo}
                        className="size-7"
                      />
                      <span>{a.name}</span>
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">{a.country}</td>
                  <td className="p-3">
                    <span className="rounded bg-muted px-2 py-0.5 font-medium">
                      {stageLabel(a.pipeline_stage)}
                    </span>
                  </td>
                  <td className="p-3 text-right num font-medium">{fmt(a.audience_current)}</td>
                  <td className="p-3 text-right num font-semibold text-lime">
                    {a.growth_30d != null ? `+${a.growth_30d}%` : "—"}
                  </td>
                  <td className="p-3 text-center">
                    {priority != null ? (
                      <div className="flex justify-center">
                        <ScoreRing value={priority} size={28} />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3">
                    <IntegrityChip value={a.integrity} />
                  </td>
                  <td className="p-3 text-muted-foreground max-w-48 truncate">
                    {a.next_action ?? "Review profile"}
                  </td>
                </tr>
              );
            })}
            {decisionQueue.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  No candidates currently in the active review queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
