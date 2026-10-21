import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, IntegrityChip, Portrait } from "@/components/br-ui";

export function IntegrityTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { data: cases = [] } = useQuery(tableQuery("integrity_cases"));

  const suspiciousArtists = artists.filter((a) => a.integrity === "suspicious");
  const openCases = cases.filter((c) => !c.is_demo && c.status === "open");

  return (
    <div className="space-y-6">
      <Panel
        title="Growth Integrity Surveillance"
        sub="Detection of sudden volume spikes, suspicious engagement-to-view ratios, and concentrated anomaly signals."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Anomalous patterns trigger advisory investigation flags. They represent statistical
            divergences from baseline cohorts — never automated fraud accusations.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="rounded-lg border bg-panel p-3">
              <div className="text-2xl font-bold text-amber">{suspiciousArtists.length}</div>
              <div className="text-xs text-muted-foreground">Artists under advisory review</div>
            </div>
            <div className="rounded-lg border bg-panel p-3">
              <div className="text-2xl font-bold text-foreground">{openCases.length}</div>
              <div className="text-xs text-muted-foreground">Open investigation cases</div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Advisory Anomaly Flags"
          sub="Flagged candidates requiring provenance verification before clean ranking."
        >
          {suspiciousArtists.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open anomaly flags detected.</p>
          ) : (
            <ul className="space-y-3">
              {suspiciousArtists.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <Portrait
                      seed={a.portrait_seed}
                      name={a.name}
                      isDemo={a.is_demo}
                      className="size-8"
                    />
                    <div>
                      <Link
                        to="/artists/$id"
                        params={{ id: a.id }}
                        className="font-medium hover:text-lime"
                      >
                        {a.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {a.genre} · {a.country}
                      </div>
                    </div>
                  </div>
                  <IntegrityChip value={a.integrity} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Formal Integrity Cases"
          sub="Cases ready for A&R disposition."
          action={
            <Link
              to="/decide"
              search={{ tab: "cases", artistId: undefined }}
              className="text-xs font-medium text-primary hover:underline"
            >
              Go to Decide cases →
            </Link>
          }
        >
          {openCases.length === 0 ? (
            <p className="text-xs text-muted-foreground">No open formal cases.</p>
          ) : (
            <ul className="space-y-3">
              {openCases.map((c) => {
                const artist = artists.find((a) => a.id === c.artist_id);
                return (
                  <li key={c.id} className="rounded-lg border p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">
                        {artist?.name ?? "Artist"}
                      </span>
                      <span className="rounded bg-amber/10 px-2 py-0.5 text-amber">Open case</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.reason}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
