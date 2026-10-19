// Pure analytics helpers (tested in src/test/analytics.test.ts)

/** Ratio of percentage growth rates; this is not a ratio of audience factors. */
export function growthRateRatio(
  actualPct: number | null,
  expectedPct: number | null,
): number | null {
  if (
    actualPct == null ||
    expectedPct == null ||
    !Number.isFinite(actualPct) ||
    !Number.isFinite(expectedPct) ||
    expectedPct <= 0
  )
    return null;
  return Math.round((actualPct / expectedPct) * 10) / 10;
}

/** Ratio of final-to-initial audience factors for two percentage changes. */
export function growthFactorRatio(
  actualPct: number | null,
  expectedPct: number | null,
): number | null {
  if (
    actualPct == null ||
    expectedPct == null ||
    !Number.isFinite(actualPct) ||
    !Number.isFinite(expectedPct) ||
    actualPct <= -100 ||
    expectedPct <= -100
  )
    return null;
  return Math.round(((1 + actualPct / 100) / (1 + expectedPct / 100)) * 100) / 100;
}

export function percentChange(previous: number | null, current: number | null): number | null {
  if (
    previous == null ||
    current == null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current) ||
    previous <= 0
  )
    return null;
  return ((current - previous) / previous) * 100;
}

/** Backwards-compatible name for the ratio of percentage growth rates. */
export const growthMultiplier = growthRateRatio;

export type ComparableSnapshot = {
  source: string;
  cohort_scheme: string;
  denominator_type: string;
  window_days: number;
  total: number;
  coverage: number | null;
  quality_status: string;
  rights_status: string;
};

export function snapshotComparabilityIssue(
  prior: ComparableSnapshot,
  current: ComparableSnapshot,
): string | null {
  if (!prior.source || prior.source !== current.source) return "Snapshots use different sources.";
  if (
    !prior.cohort_scheme ||
    prior.cohort_scheme === "legacy_unknown" ||
    prior.cohort_scheme !== current.cohort_scheme
  )
    return "Cohort definitions are missing or incompatible.";
  if (prior.denominator_type === "unknown" || prior.denominator_type !== current.denominator_type)
    return "Audience denominator definitions are missing or incompatible.";
  if (prior.window_days !== current.window_days) return "Snapshot windows have different lengths.";
  if (prior.quality_status !== "accepted" || current.quality_status !== "accepted")
    return "One or both snapshots have not passed quality review.";
  if (
    !["operator_documented", "licensed"].includes(prior.rights_status) ||
    prior.rights_status !== current.rights_status
  )
    return "Rights status is missing or inconsistent.";
  if (
    prior.coverage == null ||
    current.coverage == null ||
    prior.coverage < 0.8 ||
    current.coverage < 0.8
  )
    return "Snapshot coverage is below the 80% comparison threshold or unavailable.";
  if (prior.total <= 0 || current.total <= 0) return "Snapshot denominators are unavailable.";
  return null;
}

export function latestComparableSnapshotPair<
  T extends ComparableSnapshot & { reference_date: string },
>(snapshots: T[]): [T, T] | null {
  const ordered = [...snapshots].sort((a, b) => b.reference_date.localeCompare(a.reference_date));
  for (let currentIndex = 0; currentIndex < ordered.length; currentIndex += 1) {
    const current = ordered[currentIndex]!;
    for (let priorIndex = currentIndex + 1; priorIndex < ordered.length; priorIndex += 1) {
      const prior = ordered[priorIndex]!;
      if (snapshotComparabilityIssue(prior, current) === null) return [prior, current];
    }
  }
  return null;
}

export function segmentBreakdownIssue(
  prior: Record<string, number> | undefined,
  current: Record<string, number> | undefined,
): string | null {
  if (!prior || !current || !Object.keys(prior).length || !Object.keys(current).length)
    return "This dimension is not supplied in both snapshots.";
  const priorKeys = Object.keys(prior).sort();
  const currentKeys = Object.keys(current).sort();
  if (
    priorKeys.length !== currentKeys.length ||
    priorKeys.some((key, index) => key !== currentKeys[index])
  )
    return "Segment categories differ between snapshots.";
  for (const shares of [prior, current]) {
    const values = Object.values(shares);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100))
      return "Segment shares contain invalid values.";
    if (Math.abs(values.reduce((sum, value) => sum + value, 0) - 100) > 1)
      return "Segment shares do not reconcile to 100%.";
  }
  return null;
}

export interface SegmentShift {
  segment: string;
  priorShare: number;
  currentShare: number;
  ppChange: number;
  priorAbs: number;
  currentAbs: number;
  absChange: number;
}

/** Compare two aggregate snapshots: share change (pp) and absolute change are independent. */
export function compareSegments(
  prior: Record<string, number>,
  prevTotal: number,
  current: Record<string, number>,
  curTotal: number,
): SegmentShift[] {
  const keys = Array.from(new Set([...Object.keys(prior), ...Object.keys(current)]));
  return keys.map((segment) => {
    const p = prior[segment] ?? 0;
    const c = current[segment] ?? 0;
    const priorAbs = Math.round((p / 100) * prevTotal);
    const currentAbs = Math.round((c / 100) * curTotal);
    return {
      segment,
      priorShare: p,
      currentShare: c,
      ppChange: Math.round((c - p) * 10) / 10,
      priorAbs,
      currentAbs,
      absChange: currentAbs - priorAbs,
    };
  });
}

/** Small-cell suppression: segments with fewer than `min` people are hidden. */
export function isSuppressed(sharePct: number, total: number, min = 50): boolean {
  return (sharePct / 100) * total < min;
}

/** Only artists outside integrity review are ranked as "clean" candidates. */
export function isEligibleClean(integrity: string): boolean {
  return integrity === "organic" || integrity === "paid_promo";
}
