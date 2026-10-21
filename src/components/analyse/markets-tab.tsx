import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";

const MARKETS = [
  { code: "KE", name: "Kenya", region: "East Africa", status: "Primary core" },
  { code: "UG", name: "Uganda", region: "East Africa", status: "Active scouting" },
  { code: "TZ", name: "Tanzania", region: "East Africa", status: "Active scouting" },
  { code: "NG", name: "Nigeria", region: "West Africa", status: "Benchmark market" },
  { code: "GH", name: "Ghana", region: "West Africa", status: "Emerging radar" },
  { code: "ZA", name: "South Africa", region: "Southern Africa", status: "Cross-regional" },
];

export function MarketsTab() {
  const { data: artists = [] } = useQuery(artistsQuery);

  const marketCounts = MARKETS.map((m) => {
    const matching = artists.filter((a) => a.country?.toLowerCase() === m.name.toLowerCase());
    return {
      ...m,
      count: matching.length,
      artists: matching,
    };
  });

  return (
    <div className="space-y-6">
      <Panel
        title="Territory & Cross-Market Intelligence"
        sub="Regional footprint and market expansion across core African music hubs."
      >
        <p className="text-sm text-muted-foreground">
          Market expansion hypotheses (such as touring demand or digital conversion across
          territories) are grounded in localized data observations. We avoid global extrapolation.
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {marketCounts.map((m) => (
          <div key={m.code} className="panel space-y-3 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.region}
                </span>
                <h3 className="text-lg font-bold text-foreground">{m.name}</h3>
              </div>
              <span className="rounded-full bg-lime/10 px-2.5 py-1 text-xs font-bold text-lime">
                {m.count} {m.count === 1 ? "artist" : "artists"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Focus: <span className="text-foreground">{m.status}</span>
            </div>
            {m.artists.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {m.artists.slice(0, 4).map((a) => (
                  <li key={a.id} className="truncate text-foreground">
                    • {a.name} <span className="text-muted-foreground">({a.genre})</span>
                  </li>
                ))}
                {m.artists.length > 4 && (
                  <li className="text-[11px] text-muted-foreground">
                    +{m.artists.length - 4} more
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No monitored artists registered yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
