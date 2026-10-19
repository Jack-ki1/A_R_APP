// Pure Discover filtering rules (tested in src/test/discover.test.ts).
// Rule: unknown values are never coerced to 0. Missing momentum/growth only excludes an
// artist when the operator has ACTIVELY enabled that numeric threshold.

import type { Artist } from "@/lib/artists";
import { sc } from "@/lib/modules";

export type DiscoverTabId =
  "all" | "needs_observation" | "growth_qualified" | "under_review" | "action_required";

export const DISCOVER_TABS: { id: DiscoverTabId; label: string; hint: string }[] = [
  { id: "all", label: "All tracked", hint: "Every monitored artist, measured or not." },
  {
    id: "needs_observation",
    label: "Needs first observation",
    hint: "Identity saved but no source observation recorded yet.",
  },
  {
    id: "growth_qualified",
    label: "Growth-qualified",
    hint: "Has an observed 30-day growth value; unknown values are excluded, not zeroed.",
  },
  { id: "under_review", label: "Under review", hint: "Open growth-integrity review." },
  {
    id: "action_required",
    label: "Action required",
    hint: "Missing first observation or under integrity review.",
  },
];

export type DiscoverFilters = {
  tab: DiscoverTabId;
  country: string;
  genre: string;
  integrity: string;
  momentumFilterEnabled: boolean;
  minMomentum: number;
  growthFilterEnabled: boolean;
  minGrowth: number;
};

export const EMPTY_DISCOVER_FILTERS: DiscoverFilters = {
  tab: "all",
  country: "",
  genre: "",
  integrity: "",
  momentumFilterEnabled: false,
  minMomentum: 0,
  growthFilterEnabled: false,
  minGrowth: 0,
};

/** Optional evidence context from metric_observations; null means "not loaded yet". */
export type DiscoverContext = { observedArtistIds?: readonly string[] | null };

export const hasObservedGrowth = (a: Artist): boolean =>
  a.growth_30d != null && Number.isFinite(a.growth_30d);

export const hasMomentumScore = (a: Artist): boolean => {
  const momentum = sc(a).momentum;
  return momentum != null && Number.isFinite(momentum);
};

/** True when no observation is known from either imported evidence or an observed growth field. */
export function needsFirstObservation(a: Artist, context?: DiscoverContext): boolean {
  if (hasObservedGrowth(a)) return false;
  const ids = context?.observedArtistIds;
  if (ids) return !ids.includes(a.id);
  return true;
}

export function isInUnderReview(a: Artist): boolean {
  return a.integrity === "suspicious";
}

export function requiresAction(a: Artist, context?: DiscoverContext): boolean {
  return needsFirstObservation(a, context) || isInUnderReview(a);
}

function passesBaseFilters(a: Artist, f: DiscoverFilters): boolean {
  if (a.is_demo) return false;
  if (f.country && a.country !== f.country) return false;
  if (f.genre && a.genre !== f.genre) return false;
  if (f.integrity && a.integrity !== f.integrity) return false;
  return true;
}

function passesThresholds(a: Artist, f: DiscoverFilters): boolean {
  if (f.momentumFilterEnabled) {
    const momentum = sc(a).momentum;
    if (momentum == null || !Number.isFinite(momentum) || momentum < f.minMomentum) return false;
  }
  if (f.growthFilterEnabled) {
    if (!hasObservedGrowth(a) || a.growth_30d! < f.minGrowth) return false;
  }
  return true;
}

export function matchesTab(a: Artist, f: DiscoverFilters, context?: DiscoverContext): boolean {
  switch (f.tab) {
    case "all":
      return true;
    case "needs_observation":
      return needsFirstObservation(a, context);
    case "growth_qualified":
      return hasObservedGrowth(a);
    case "under_review":
      return isInUnderReview(a);
    case "action_required":
      return requiresAction(a, context);
  }
}

export function filterArtists(
  artists: readonly Artist[],
  f: DiscoverFilters,
  context?: DiscoverContext,
): Artist[] {
  return artists.filter(
    (a) => passesBaseFilters(a, f) && passesThresholds(a, f) && matchesTab(a, f, context),
  );
}

/** Tab counts use the same base filters and thresholds, ignoring the active tab. */
export function countDiscoverTabs(
  artists: readonly Artist[],
  f: DiscoverFilters,
  context?: DiscoverContext,
): Record<DiscoverTabId, number> {
  const counts = {
    all: 0,
    needs_observation: 0,
    growth_qualified: 0,
    under_review: 0,
    action_required: 0,
  };
  for (const a of artists) {
    if (!passesBaseFilters(a, f) || !passesThresholds(a, f)) continue;
    counts.all += 1;
    if (needsFirstObservation(a, context)) counts.needs_observation += 1;
    if (hasObservedGrowth(a)) counts.growth_qualified += 1;
    if (isInUnderReview(a)) counts.under_review += 1;
    if (requiresAction(a, context)) counts.action_required += 1;
  }
  return counts;
}
