import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ExternalLink, Search } from "lucide-react";
import {
  getListenBrainzPulse,
  searchMusicBrainz,
  type MusicBrainzArtist,
} from "@/lib/musicbrainz.functions";
import { SOURCES } from "@/lib/modules";
import { Panel } from "@/components/br-ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — Breakout Radar" },
      { name: "description", content: "Live metadata discovery and connected data coverage." },
    ],
  }),
  loader: async () => {
    try {
      return { pulse: await getListenBrainzPulse(), pulseError: "" };
    } catch {
      return { pulse: null, pulseError: "ListenBrainz community data is temporarily unavailable." };
    }
  },
  component: Sources,
});

function Sources() {
  const { pulse, pulseError } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicBrainzArtist[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResults(null);
    try {
      setResults(await searchMusicBrainz({ data: { query } }));
    } catch {
      setError("The metadata search is temporarily unavailable. Please wait before retrying.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Panel
        title="ListenBrainz community pulse"
        sub="A live, open-data signal from opted-in ListenBrainz users. This reflects that community's listening, not African market share, total audience, or artist-level monthly listeners."
      >
        {pulseError && (
          <p role="status" className="text-sm text-muted-foreground">
            {pulseError}
          </p>
        )}
        {pulse && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Top community artists · week range · counts are listens recorded by ListenBrainz
              </span>
              <span>
                Updated{" "}
                {pulse.updatedAt
                  ? new Date(pulse.updatedAt * 1000).toLocaleString()
                  : "time not provided"}
              </span>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pulse.artists.map((artist, index) => (
                <li
                  key={`${artist.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-2"
                >
                  <span className="truncate">
                    <span className="mr-2 text-xs text-muted-foreground">{index + 1}</span>
                    {artist.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {artist.listens.toLocaleString()} listens
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Use this only to spark manual research. The dataset has no African territory filter,
              is community-selected, and should not be treated as a representative audience or
              validated breakout ranking. Data is fetched live and cached in-process for 15 minutes.
            </p>
          </>
        )}
      </Panel>
      <Panel
        title="Open metadata discovery"
        sub="Search the live MusicBrainz catalog to resolve artist names and identity candidates. This is descriptive metadata, not evidence of popularity or growth."
      >
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="mb-query">
            Artist name
          </label>
          <input
            id="mb-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={80}
            required
            placeholder="Artist or group name"
            className="h-10 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <button
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Search className="size-4" />
            {busy ? "Searching…" : "Search MusicBrainz"}
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Searches are sent through the server with an application identifier. Results are not
          imported or saved automatically. Respect MusicBrainz rate limits.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {results && (
          <div className="mt-5 space-y-2" aria-live="polite">
            {results.length === 0 && (
              <p className="py-5 text-sm text-muted-foreground">No matching artists found.</p>
            )}
            {results.map((artist) => (
              <article
                key={artist.id}
                className="flex flex-col gap-2 rounded-lg border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-medium">
                    {artist.name}
                    {artist.disambiguation && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {artist.disambiguation}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {[artist.type, artist.country, ...artist.tags].filter(Boolean).join(" · ") ||
                      "No type or tags provided"}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    MBID {artist.id}
                  </p>
                </div>
                <a
                  href={artist.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Verify identity <ExternalLink className="size-3" />
                </a>
              </article>
            ))}
            <p className="text-xs text-muted-foreground">
              Catalog match score is a text-match relevance value, not an artist performance score.
            </p>
          </div>
        )}
      </Panel>
      <Panel
        title="Data coverage"
        sub="Live provider connections are deliberately distinguished from demo fixtures and unavailable integrations."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Source</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <td className="py-2.5 font-medium">{s.name}</td>
                  <td>{s.kind}</td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        s.status === "Live lookup"
                          ? "border-primary/40 text-primary"
                          : s.status === "Synthetic demo data"
                            ? "border-amber/40 text-amber"
                            : "text-muted-foreground",
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="num text-muted-foreground">{s.fresh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="What public APIs can support"
        sub="Provider access is not the same as audience analytics access."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            MusicBrainz supplies open catalog metadata and identity references. It does not supply
            listener counts, audience demographics, or trend history.
          </li>
          <li>
            ListenBrainz supplies open, opt-in community listening aggregates. Its sample is
            self-selected and global; it is not a reliable measure of African market demand.
          </li>
          <li>
            YouTube Data API can support video/channel discovery with a Google API key. Its default
            quota includes 100 search requests/day, so search needs caching; it is not a complete
            historical UGC feed.
          </li>
          <li>
            TikTok Research Tools require approved, eligible non-commercial research access. The
            Commercial Content API is separate and currently documents EU-region data; neither is
            general African music UGC analytics.
          </li>
          <li>
            Spotify Web API access is subject to current developer rules and does not provide the
            licensed cross-platform audience history this product needs. Do not derive listenership
            metrics or train models from Spotify data without explicit rights approval.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
