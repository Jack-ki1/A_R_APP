import { describe, expect, it } from "vitest";
import {
  AUDIENCE_CSV_HEADERS,
  METRIC_CSV_HEADERS,
  parseAudienceCsv,
  parseMetricCsv,
} from "@/lib/metric-import";

const mbid = "84c2e4a0-5f6d-4b72-8e54-18f48d4a8c90";
const row = `${mbid},youtube_studio,listeners,monthly_unique_v1,2026-09-01,2026-09-30,2026-10-01T10:00:00Z,KE,people,1200`;

describe("authorized metric CSV parser", () => {
  it("accepts a valid row while retaining supplied provenance fields", () => {
    expect(parseMetricCsv(`${METRIC_CSV_HEADERS.join(",")}\n${row}`)).toEqual([
      {
        mbid,
        source: "youtube_studio",
        metric_name: "listeners",
        definition_version: "monthly_unique_v1",
        start_at: "2026-09-01",
        end_at: "2026-09-30",
        observed_at: "2026-10-01T10:00:00Z",
        territory: "KE",
        unit: "people",
        value: "1200",
      },
    ]);
  });
  it("rejects incorrect headers, malformed IDs and inverted windows", () => {
    expect(() => parseMetricCsv("name,value\nartist,1")).toThrow("CSV headers");
    expect(() =>
      parseMetricCsv(`${METRIC_CSV_HEADERS.join(",")}\n${row.replace(mbid, "not-an-id")}`),
    ).toThrow("Row 2");
    expect(() =>
      parseMetricCsv(
        `${METRIC_CSV_HEADERS.join(",")}\n${row.replace("2026-09-01,2026-09-30", "2026-09-30,2026-09-01")}`,
      ),
    ).toThrow("ends before");
  });
  it("requires a single permitted metrics source per import batch", () => {
    const second = row.replace("youtube_studio", "spotify_for_artists");
    expect(() => parseMetricCsv(`${METRIC_CSV_HEADERS.join(",")}\n${row}\n${second}`)).toThrow(
      "one source",
    );
    expect(() =>
      parseMetricCsv(
        `${METRIC_CSV_HEADERS.join(",")}\n${row.replace("youtube_studio", "musicbrainz")}`,
      ),
    ).toThrow("not authorized");
  });
});

describe("authorized audience cohort CSV parser", () => {
  const rows = [
    `${mbid},licensed_export,2026-09-30,30,market_v1,unique_audience,100,0.95,market,Nairobi,60,60`,
    `${mbid},licensed_export,2026-09-30,30,market_v1,unique_audience,100,0.95,market,Kampala,40,40`,
  ];
  it("groups cohort rows into one sourced snapshot with share and count maps", () => {
    const [snapshot] = parseAudienceCsv(`${AUDIENCE_CSV_HEADERS.join(",")}\n${rows.join("\n")}`);
    expect(snapshot?.segments).toEqual({ market: { Nairobi: 60, Kampala: 40 } });
    expect(snapshot?.segment_counts).toEqual({ market: { Nairobi: 60, Kampala: 40 } });
  });
  it("rejects segment shares or counts that do not reconcile", () => {
    expect(() =>
      parseAudienceCsv(
        `${AUDIENCE_CSV_HEADERS.join(",")}\n${rows[0]}\n${rows[1]!.replace(/,40,40$/, ",30,30")}`,
      ),
    ).toThrow("reconcile");
  });
});
