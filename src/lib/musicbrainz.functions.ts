import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SearchInput = z.object({ query: z.string().trim().min(2).max(80) });

export type MusicBrainzArtist = {
  id: string;
  name: string;
  disambiguation: string;
  country: string | null;
  type: string | null;
  score: number | null;
  tags: string[];
  url: string;
};

export type ListenBrainzArtist = { name: string; listens: number | null; mbid: string | null };

let musicBrainzLastRequestAt = 0;
let musicBrainzQueue: Promise<void> = Promise.resolve();
const musicBrainzCache = new Map<string, { expires: number; artists: MusicBrainzArtist[] }>();

export async function waitForMusicBrainzSlot() {
  const previous = musicBrainzQueue;
  let release!: () => void;
  musicBrainzQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = Math.max(0, 1100 - (Date.now() - musicBrainzLastRequestAt));
  if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
  musicBrainzLastRequestAt = Date.now();
  release();
}

let listenBrainzCache: {
  expires: number;
  artists: ListenBrainzArtist[];
  updatedAt: number | null;
} | null = null;

/** Community-contributed aggregate listening signal; it is not market representative. */
export const getListenBrainzPulse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    if (listenBrainzCache && listenBrainzCache.expires > Date.now()) return listenBrainzCache;
    const response = await fetch(
      "https://api.listenbrainz.org/1/stats/sitewide/artists?range=week&count=12",
      {
        headers: { "User-Agent": "BreakoutRadar/1.0 (internal A&R research tool)" },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) throw new Error("ListenBrainz is temporarily unavailable.");
    const body = (await response.json()) as {
      payload?: {
        artists?: Array<{
          artist_name?: string;
          listen_count?: number;
          artist_mbid?: string | null;
        }>;
        last_updated?: number;
      };
    };
    const result = {
      expires: Date.now() + 15 * 60 * 1000,
      updatedAt: typeof body.payload?.last_updated === "number" ? body.payload.last_updated : null,
      artists: (body.payload?.artists ?? []).map((artist) => ({
        name: String(artist.artist_name ?? "Unknown artist"),
        listens:
          typeof artist.listen_count === "number" && Number.isFinite(artist.listen_count)
            ? artist.listen_count
            : null,
        mbid: artist.artist_mbid ?? null,
      })),
    };
    listenBrainzCache = result;
    return result;
  });

// Metadata discovery only. MusicBrainz has no audience, stream, or trend metrics.
export const searchMusicBrainz = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(SearchInput)
  .handler(async ({ data, context }): Promise<MusicBrainzArtist[]> => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    const cached = musicBrainzCache.get(data.query.toLocaleLowerCase());
    if (cached && cached.expires > Date.now()) return cached.artists;
    await waitForMusicBrainzSlot();
    const url = new URL("https://musicbrainz.org/ws/2/artist/");
    url.searchParams.set("query", data.query);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("limit", "12");
    const response = await fetch(url, {
      headers: { "User-Agent": "BreakoutRadar/1.0 (internal A&R research tool)" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 503 || response.status === 429) {
      throw new Error("MusicBrainz is rate limiting requests. Wait a moment and try again.");
    }
    if (!response.ok)
      throw new Error("MusicBrainz could not complete the search. Try again shortly.");
    const payload = (await response.json()) as { artists?: Array<Record<string, unknown>> };
    const artists = (payload.artists ?? [])
      .map((item) => {
        const area = item["area"] as { name?: string } | undefined;
        const tags = (item["tags"] as Array<{ name?: string }> | undefined) ?? [];
        const id = String(item["id"] ?? "");
        return {
          id,
          name: String(item["name"] ?? "Unknown artist"),
          disambiguation: String(item["disambiguation"] ?? ""),
          country: typeof area?.name === "string" ? area.name : null,
          type: typeof item["type"] === "string" ? item["type"] : null,
          score: typeof item["score"] === "number" ? item["score"] : null,
          tags: tags
            .slice(0, 4)
            .map((tag) => String(tag.name ?? ""))
            .filter(Boolean),
          url: `https://musicbrainz.org/artist/${encodeURIComponent(id)}`,
        };
      })
      .filter((artist) => artist.id);
    musicBrainzCache.set(data.query.toLocaleLowerCase(), {
      artists,
      expires: Date.now() + 5 * 60 * 1000,
    });
    return artists;
  });
