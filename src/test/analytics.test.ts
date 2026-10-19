import { describe, it, expect } from "vitest";
import {
  growthFactorRatio,
  growthMultiplier,
  growthRateRatio,
  latestComparableSnapshotPair,
  percentChange,
  compareSegments,
  isSuppressed,
  isEligibleClean,
  snapshotComparabilityIssue,
  segmentBreakdownIssue,
} from "@/lib/analytics";

describe("analytics", () => {
  it("multiplier 186 vs 42 is 4.4", () => expect(growthMultiplier(186, 42)).toBe(4.4));
  it("distinguishes growth-rate and growth-factor ratios", () => {
    expect(growthRateRatio(186, 42)).toBe(4.4);
    expect(growthFactorRatio(186, 42)).toBe(2.01);
  });
  it("no multiplier when expected is 0", () => expect(growthMultiplier(10, 0)).toBeNull());
  it("handles missing and invalid growth inputs", () => {
    expect(growthRateRatio(null, 10)).toBeNull();
    expect(growthFactorRatio(-100, 20)).toBeNull();
    expect(percentChange(0, 10)).toBeNull();
    expect(percentChange(10, 5)).toBe(-50);
  });
  it("share pp and absolute change are independent", () => {
    const s = compareSegments({ a: 50 }, 1000, { a: 40 }, 2000)[0]!;
    expect(s.ppChange).toBe(-10);
    expect(s.absChange).toBe(300);
  });
  it("suppresses groups under 50 people", () => {
    expect(isSuppressed(1, 1000)).toBe(true);
    expect(isSuppressed(10, 1000)).toBe(false);
  });
  it("suspicious artists are not clean candidates", () => {
    expect(isEligibleClean("suspicious")).toBe(false);
    expect(isEligibleClean("organic")).toBe(true);
  });
  it("requires consistent provenance before comparing audience snapshots", () => {
    const base = {
      source: "authorized_export",
      cohort_scheme: "age_market_v1",
      denominator_type: "unique_audience",
      window_days: 30,
      total: 1000,
      coverage: 0.95,
      quality_status: "accepted",
      rights_status: "operator_documented",
    };
    expect(snapshotComparabilityIssue(base, base)).toBeNull();
    expect(snapshotComparabilityIssue(base, { ...base, source: "different" })).toContain("sources");
    expect(
      snapshotComparabilityIssue(base, { ...base, cohort_scheme: "legacy_unknown" }),
    ).toContain("Cohort");
    expect(snapshotComparabilityIssue(base, { ...base, coverage: 0.2 })).toContain("coverage");
  });
  it("selects latest compatible snapshots, skipping a newer incompatible snapshot", () => {
    const base = {
      source: "authorized_export",
      cohort_scheme: "market_v1",
      denominator_type: "unique_audience",
      window_days: 30,
      total: 1000,
      coverage: 0.9,
      quality_status: "accepted",
      rights_status: "licensed",
    };
    const old = { ...base, reference_date: "2026-01-01" };
    const middle = { ...base, reference_date: "2026-02-01" };
    const newestIncompatible = { ...base, source: "other", reference_date: "2026-03-01" };
    expect(latestComparableSnapshotPair([old, middle, newestIncompatible])).toEqual([old, middle]);
  });
  it("does not turn missing or non-summing segments into zero-valued cohorts", () => {
    expect(segmentBreakdownIssue(undefined, { Nairobi: 100 })).toContain("not supplied");
    expect(segmentBreakdownIssue({ Nairobi: 60, Kampala: 40 }, { Nairobi: 100 })).toContain(
      "categories differ",
    );
    expect(segmentBreakdownIssue({ Nairobi: 50 }, { Nairobi: 50 })).toContain("reconcile");
    expect(segmentBreakdownIssue({ Nairobi: 100 }, { Nairobi: 100 })).toBeNull();
  });
});
