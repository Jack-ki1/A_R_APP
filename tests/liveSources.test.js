import { describe, it, expect } from "vitest";
import { buildCuratedRealUniverse, hydrateArtistFromRealData, CURATED_REAL_ARTISTS } from "../src/data/liveSources.js";
import { scoreUniverse, recommend, artisticValue } from "../src/engine/engine.js";
import { LAST } from "../src/engine/constants.js";

describe("Multi-Source Live Intelligence Engine", () => {
  it("has verified real curated African breakout talents", () => {
    expect(CURATED_REAL_ARTISTS.length).toBeGreaterThanOrEqual(6);
    const names = CURATED_REAL_ARTISTS.map((a) => a.name);
    expect(names).toContain("Ayra Starr");
    expect(names).toContain("Wakadinali");
    expect(names).toContain("Uncle Waffles");
  });

  it("hydrates a real artist profile into a full 26-week measured artist object", async () => {
    const raw = {
      name: "Tems",
      country: "NG",
      city: "Lagos",
      genre: "Afro-soul",
      fans: 150000,
      tracks: [
        { title: "Me & U", preview: "https://example.com/tems.mp3", duration: 190, album: "Born in the Wild" }
      ],
      sources: ["Deezer", "Apple Music"]
    };

    const artist = await hydrateArtistFromRealData(raw);

    expect(artist.name).toBe("Tems");
    expect(artist.country).toBe("NG");
    expect(artist.measured).toBe(true);
    expect(artist.liveData).toBe(true);

    // Verify 26-week series structure
    expect(artist.series).toBeDefined();
    for (const p of ["yt", "dz", "am", "bp", "ig"]) {
      expect(artist.series[p]).toBeDefined();
      expect(artist.series[p].aud).toHaveLength(26);
      expect(artist.series[p].aud[LAST]).toBeGreaterThan(0);
    }

    // Verify engagement and ugc
    expect(artist.engagement).toHaveLength(26);
    expect(artist.ugcSeries).toHaveLength(26);

    // Verify audio features
    expect(artist.audio).toBeDefined();
    expect(artist.audio.bpm).toBeGreaterThan(60);
    expect(artist.audio.key).toBeDefined();

    // Verify tracks and preview
    expect(artist.tracks.length).toBeGreaterThanOrEqual(1);
    expect(artist.previewUrl).toBe("https://example.com/tems.mp3");
  });

  it("builds the curated universe and passes the full scoring engine without errors", async () => {
    const universe = await buildCuratedRealUniverse();
    expect(universe.length).toBe(CURATED_REAL_ARTISTS.length);

    const scores = scoreUniverse(universe, LAST, 100);
    expect(scores.eligibleIds.length).toBe(universe.length);

    for (const a of universe) {
      const sc = scores.byId.get(a.id);
      expect(sc).toBeDefined();
      expect(sc.idx).toBeGreaterThanOrEqual(0);
      expect(sc.idx).toBeLessThanOrEqual(100);
      expect(sc.rank).toBeGreaterThanOrEqual(1);
      expect(sc.lo).toBeLessThanOrEqual(sc.hi);

      // Verify recommendation engine
      const rec = recommend(sc, null);
      expect(rec.tier).toBeDefined();
      expect(rec.why).toBeDefined();
    }
  }, 15000);
});
