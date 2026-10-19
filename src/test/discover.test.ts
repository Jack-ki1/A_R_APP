import { describe, expect, it } from "vitest";
import type { Artist } from "@/lib/artists";
import { makeArtist } from "@/test/fixtures";
import {
  countDiscoverTabs,
  DISCOVER_TABS,
  EMPTY_DISCOVER_FILTERS,
  filterArtists,
  hasObservedGrowth,
  needsFirstObservation,
  type DiscoverFilters,
} from "@/lib/discover";

const filters = (overrides: Partial<DiscoverFilters> = {}): DiscoverFilters => ({
  ...EMPTY_DISCOVER_FILTERS,
  ...overrides,
});
const names = (rows: Artist[]) => rows.map((row) => row.name);

describe("Discover filtering of unmeasured artists", () => {
  const unscored = makeArtist({ name: "Newcomer" });
  const zeroGrowth = makeArtist({ name: "Flatline", growth_30d: 0, expected_growth_30d: 5 });
  const growing = makeArtist({ name: "Rising", growth_30d: 42, expected_growth_30d: 5 });
  const demo = makeArtist({ name: "Fixture", is_demo: true });
  const flagged = makeArtist({ name: "Flagged", integrity: "suspicious", growth_30d: 12 });
  const cohort = [unscored, zeroGrowth, growing, demo, flagged];

  it("keeps a real artist with NULL growth and NULL score in All tracked by default", () => {
    const rows = filterArtists(cohort, filters());
    expect(names(rows)).toContain("Newcomer");
    expect(names(rows)).not.toContain("Fixture");
    expect(needsFirstObservation(unscored)).toBe(true);
    expect(hasObservedGrowth(unscored)).toBe(false);
  });

  it("never coerces unknown growth to 0% when a threshold is active", () => {
    const withThreshold = filters({ growthFilterEnabled: true, minGrowth: 0 });
    const rows = filterArtists(cohort, withThreshold);
    expect(names(rows)).not.toContain("Newcomer");
    expect(names(rows)).toContain("Flatline");
    expect(names(rows)).toContain("Rising");
  });

  it("treats measured zero growth as measured, not as missing", () => {
    expect(hasObservedGrowth(zeroGrowth)).toBe(true);
    expect(needsFirstObservation(zeroGrowth)).toBe(false);
    expect(names(filterArtists(cohort, filters({ tab: "growth_qualified" })))).toContain(
      "Flatline",
    );
    expect(names(filterArtists(cohort, filters({ tab: "growth_qualified" })))).not.toContain(
      "Newcomer",
    );
  });

  it("applies an active momentum threshold only to artists with a score", () => {
    const off = filterArtists(cohort, filters({ momentumFilterEnabled: false, minMomentum: 50 }));
    expect(names(off)).toContain("Newcomer");
    const on = filterArtists(
      cohort,
      filters({ momentumFilterEnabled: true, minMomentum: 50, tab: "all" }),
    );
    expect(names(on)).not.toContain("Newcomer");
    const scored = makeArtist({ name: "Scored", scores: { momentum: 80 } });
    expect(
      names(filterArtists([scored], filters({ momentumFilterEnabled: true, minMomentum: 50 }))),
    ).toContain("Scored");
    const lowScore = makeArtist({ name: "Low", scores: { momentum: 10 } });
    expect(
      names(filterArtists([lowScore], filters({ momentumFilterEnabled: true, minMomentum: 50 }))),
    ).not.toContain("Low");
  });

  it("never lists demo fixtures in operational views", () => {
    for (const tab of DISCOVER_TABS) {
      expect(names(filterArtists(cohort, filters({ tab: tab.id })))).not.toContain("Fixture");
    }
  });

  it("separates integrity review, needs-observation and action-required cohorts", () => {
    expect(names(filterArtists(cohort, filters({ tab: "under_review" })))).toEqual(["Flagged"]);
    expect(names(filterArtists(cohort, filters({ tab: "needs_observation" })))).toEqual([
      "Newcomer",
    ]);
    expect(names(filterArtists(cohort, filters({ tab: "action_required" })))).toEqual([
      "Newcomer",
      "Flagged",
    ]);
    expect(filterArtists(cohort, filters({ integrity: "unknown" })).map((a) => a.name)).toEqual([
      "Newcomer",
      "Flatline",
      "Rising",
    ]);
  });

  it("credits imported observations without inventing growth", () => {
    const imported = makeArtist({ name: "Imported" });
    const context = { observedArtistIds: [imported.id] };
    expect(needsFirstObservation(imported, context)).toBe(false);
    expect(hasObservedGrowth(imported)).toBe(false);
    expect(
      names(filterArtists([imported], filters({ tab: "needs_observation" }), context)),
    ).toEqual([]);
    expect(names(filterArtists([imported], filters({ tab: "growth_qualified" }), context))).toEqual(
      [],
    );
    expect(names(filterArtists([imported], filters({ tab: "all" }), context))).toEqual([
      "Imported",
    ]);
  });

  it("keeps tab counts consistent with the filtered rows", () => {
    const context = { observedArtistIds: [] as string[] };
    const counts = countDiscoverTabs(cohort, filters(), context);
    expect(counts.all).toBe(4);
    for (const tab of DISCOVER_TABS) {
      expect(filterArtists(cohort, filters({ tab: tab.id }), context)).toHaveLength(counts[tab.id]);
    }
    expect(counts.all).toBeGreaterThanOrEqual(counts.needs_observation);
    expect(counts.all).toBeGreaterThanOrEqual(counts.growth_qualified);
    expect(counts.all).toBeGreaterThanOrEqual(counts.under_review);
    expect(counts.all).toBeGreaterThanOrEqual(counts.action_required);
  });
});
