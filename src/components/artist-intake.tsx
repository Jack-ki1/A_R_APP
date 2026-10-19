import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Search } from "lucide-react";
import { searchMusicBrainz, type MusicBrainzArtist } from "@/lib/musicbrainz.functions";
import { addMusicBrainzCandidate } from "@/lib/source.functions";
import { dataSourcesQuery } from "@/lib/artists";

/**
 * Shared MusicBrainz identity search + candidate intake.
 * Used by Data sources and Discover so "Find artists" always leads to a working search.
 * Intake writes identity metadata only — no popularity, growth or score is created.
 */
export function ArtistIntakeSearch() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const registry = useQuery(dataSourcesQuery);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicBrainzArtist[] | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
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

  async function addCandidate(artist: MusicBrainzArtist) {
    setAdding(artist.id);
    setStatus("");
    try {
      const result = await addMusicBrainzCandidate({
        data: { mbid: artist.id, confirmIdentity: true },
      });
      setStatus(
        `${artist.name} added. Identity only — no audience metrics, growth or score exist yet.`,
      );
      toast.success(`${artist.name} added to the radar`);
      await queryClient.invalidateQueries({ queryKey: ["artists"] });
      await queryClient.invalidateQueries({ queryKey: ["artist", result.artistId] });
      await queryClient.invalidateQueries({ queryKey: ["data_sources"] });
      await navigate({ to: "/artists/$id", params: { id: result.artistId } });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Candidate intake failed.";
      setStatus(message);
      toast.error(message);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div>
      {registry.isError && (
        <p
          role="status"
          className="mb-3 rounded-md border border-amber/40 bg-amber/5 p-3 text-xs text-amber"
        >
          Source registry unavailable. Apply and verify migration 0004 in staging before enabling
          artist intake. This is an error state, not an empty workspace.
        </p>
      )}
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
        imported or saved automatically. MusicBrainz supplies identity metadata only — never
        listener counts or growth. Respect MusicBrainz rate limits.
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
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">MBID {artist.id}</p>
              </div>
              <a
                href={artist.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Verify identity <ExternalLink className="size-3" />
              </a>
              <button
                type="button"
                disabled={adding === artist.id || registry.isError}
                onClick={() => void addCandidate(artist)}
                className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {adding === artist.id ? "Adding…" : "Confirm identity & Add to Radar"}
              </button>
            </article>
          ))}
          <p className="text-xs text-muted-foreground">
            Catalog match score is a text-match relevance value, not an artist performance score.
          </p>
        </div>
      )}
      {status && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  );
}
