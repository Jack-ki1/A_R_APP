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
