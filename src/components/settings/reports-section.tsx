import { useSuspenseQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { artistsQuery, STAGES } from "@/lib/artists";
import { observationsQuery } from "@/lib/reports";
import { Panel } from "@/components/br-ui";
import { Button } from "@/components/ui/button";

export function ReportsSection() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: observations } = useSuspenseQuery(observationsQuery);
  const byId = new Map(artists.map((artist) => [artist.id, artist]));
  const exportCsv = () => {
    const head = [
      "artist",
      "metric",
      "value",
      "unit",
      "source_id",
      "start_at",
      "end_at",
      "observed_at",
      "territory",
      "rights_status",
      "quality_status",
    ];
    const lines = observations
      .filter((item) => byId.has(item.artist_id))
      .map((item) => {
        const artist = byId.get(item.artist_id)!;
        return [
          artist.name,
          item.platform_metric_name,
          item.value_decimal,
          item.unit,
          item.source_id,
          item.start_at,
          item.end_at,
          item.observed_at,
          item.territory ?? "",
          item.rights_status_snapshot,
          item.quality_status,
        ]
          .map((value) => {
            const safe = String(value).replace(/"/g, '""');
            return `"${/^[=+\-@\t\r]/.test(safe) ? `'${safe}` : safe}"`;
          })
          .join(",");
      });
    const url = URL.createObjectURL(
      new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }),
    );
    Object.assign(document.createElement("a"), {
      href: url,
      download: "breakout-radar-sourced-observations.csv",
    }).click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4 print:text-black">
      <Panel
        title="Evidence report"
        sub="Operational reports include imported observations with source IDs, observation windows, and rights status. No synthetic priority ranking is shown."
        action={
          <div className="flex gap-2 print:hidden">
            <Button size="sm" variant="outline" disabled={!observations.length} onClick={exportCsv}>
              <Download className="size-4" />
              CSV
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          Accepted observations: <b className="num">{observations.length}</b> · monitored artists:{" "}
          <b className="num">{artists.length}</b>
        </p>
        {!observations.length ? (
          <p className="mt-5 rounded-lg border p-4 text-sm text-muted-foreground">
            No source-linked metric observations are available. Import authorized, provenance-backed
            data to produce an evidence report.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th>Artist</th>
                  <th>Observation</th>
                  <th>Value</th>
                  <th>Source ID</th>
                  <th>Window</th>
                  <th>Observed</th>
                  <th>Rights</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {observations
                  .filter((item) => byId.has(item.artist_id))
                  .map((item) => (
                    <tr key={item.id}>
                      <td className="py-2">{byId.get(item.artist_id)?.name}</td>
                      <td>{item.platform_metric_name}</td>
                      <td className="num">
                        {item.value_decimal} {item.unit}
                      </td>
                      <td className="font-mono text-xs">{item.source_id.slice(0, 8)}</td>
                      <td>
                        {item.start_at} – {item.end_at}
                      </td>
                      <td>{new Date(item.observed_at).toLocaleDateString()}</td>
                      <td>{item.rights_status_snapshot}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel
        title="Pipeline overview"
        sub="Counts are workflow state, not evidence of commercial performance."
      >
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
          {STAGES.map((stage) => (
            <div key={stage.id} className="rounded-lg border p-2">
              <div className="text-xs text-muted-foreground">{stage.label}</div>
              <b className="num">
                {artists.filter((artist) => artist.pipeline_stage === stage.id).length}
              </b>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
