import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { artistsQuery } from "@/lib/artists";
import { Panel } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchYouTube } from "@/lib/provider-connections.functions";

export function UgcTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const [query, setQuery] = useState(artists[0]?.name ?? "");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<Array<{
    videoId: string;
    title: string;
    channelTitle: string;
    publishedAt: string;
  }> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSearchedQuery(query.trim());
    try {
      const res = await searchYouTube({ data: { query: query.trim() } });
      setResults(res.items);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "YouTube search failed or provider key not configured.",
      );
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="UGC Monitoring & Video Evidence"
        sub="Authorized user-generated content signals, sound usage, and video discovery."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Connect licensed or artist-authorized sources before reporting reach or velocity. Demo
            fixtures and unverified social counts are strictly excluded.
          </p>
          <div className="rounded-lg border bg-panel p-3 text-xs">
            <span className="font-semibold text-foreground">Rights notice:</span> YouTube search
            uses the connected operator API key. Direct TikTok/Instagram UGC firehoses require
            commercial partner approval and are marked <strong>Not connected</strong>.
          </div>
        </div>

        <form onSubmit={handleSearch} className="mt-4 flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube videos, sounds, or artist mentions..."
            className="min-w-64 flex-1"
          />
          <Button type="submit" disabled={loading || !query.trim()}>
            {loading ? "Searching..." : "Search YouTube Evidence"}
          </Button>
        </form>

        {errorMsg && (
          <div className="mt-3 rounded-md border border-amber/30 bg-amber/5 p-3 text-xs text-amber">
            {errorMsg}
          </div>
        )}

        {results && (
          <div className="mt-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Results for &quot;{searchedQuery}&quot; ({results.length})
            </h4>
            <div className="divide-y rounded-lg border">
              {results.map((v) => (
                <div
                  key={v.videoId}
                  className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <a
                      href={`https://www.youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground hover:text-lime hover:underline"
                    >
                      {v.title}
                    </a>
                    <div className="text-xs text-muted-foreground">
                      Channel: {v.channelTitle} · Published:{" "}
                      {new Date(v.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                    Public video evidence
                  </span>
                </div>
              ))}
              {results.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No public videos found matching this query.
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel
        title="UGC Data Source Coverage"
        sub="Status of connected fan-content and creator telemetry providers."
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">YouTube Data API</dt>
            <dd className="font-medium text-lime">Configured (Operator Key)</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">TikTok Sound / UGC</dt>
            <dd className="font-medium text-muted-foreground">Not connected (Partner required)</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">Instagram Reels</dt>
            <dd className="font-medium text-muted-foreground">
              Not connected (App review required)
            </dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
