import { z } from "zod";

export const METRIC_CSV_HEADERS = [
  "mbid",
  "source",
  "metric_name",
  "definition_version",
  "start_at",
  "end_at",
  "observed_at",
  "territory",
  "unit",
  "value",
] as const;

const MetricRow = z.object({
  mbid: z.string().uuid(),
  source: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9][a-z0-9._-]*$/i),
  metric_name: z.string().trim().min(1).max(100),
  definition_version: z.string().trim().max(80),
  start_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  observed_at: z.string().datetime({ offset: true }),
  territory: z.string().max(100),
  unit: z.string().trim().min(1).max(40),
  value: z.string().regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/),
});

export type MetricImportRow = z.infer<typeof MetricRow>;

export const AUDIENCE_CSV_HEADERS = [
  "mbid",
  "source",
  "reference_date",
  "window_days",
  "cohort_scheme",
  "denominator_type",
  "total",
  "coverage",
  "dimension",
  "segment_key",
  "segment_share_pct",
  "segment_count",
] as const;

export type AudienceImportSnapshot = {
  mbid: string;
  source: string;
  reference_date: string;
  window_days: number;
  cohort_scheme: string;
  denominator_type: string;
  total: number;
  coverage: number;
  segments: Record<string, Record<string, number>>;
  segment_counts: Record<string, Record<string, number>>;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field.length === 0) quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((item) => item.some((cell) => cell.trim() !== ""));
}

export function parseMetricCsv(text: string): MetricImportRow[] {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw new Error("CSV must be 1 MB or smaller.");
  const [header, ...data] = parseCsv(text);
  if (
    !header ||
    header.length !== METRIC_CSV_HEADERS.length ||
    header.some((name, index) => name.trim() !== METRIC_CSV_HEADERS[index])
  ) {
    throw new Error(`CSV headers must be: ${METRIC_CSV_HEADERS.join(", ")}.`);
  }
  if (data.length === 0 || data.length > 5000)
    throw new Error("CSV must contain between 1 and 5,000 data rows.");
  const rows = data.map((cells, index) => {
    if (cells.length !== METRIC_CSV_HEADERS.length)
      throw new Error(
        `Row ${index + 2} has ${cells.length} fields; expected ${METRIC_CSV_HEADERS.length}.`,
      );
    const parsed = MetricRow.safeParse(
      Object.fromEntries(METRIC_CSV_HEADERS.map((key, i) => [key, cells[i]!.trim()])),
    );
    if (!parsed.success)
      throw new Error(
        `Row ${index + 2} is invalid: ${parsed.error.issues[0]?.message ?? "check field values"}.`,
      );
    if (parsed.data.end_at < parsed.data.start_at)
      throw new Error(`Row ${index + 2} ends before its observation period starts.`);
    return parsed.data;
  });
  if (new Set(rows.map((row) => row.source.toLocaleLowerCase())).size !== 1)
    throw new Error("A metric CSV can contain data from only one source at a time.");
  if (["musicbrainz", "listenbrainz"].includes(rows[0]!.source.toLocaleLowerCase()))
    throw new Error(
      "MusicBrainz and ListenBrainz are not authorized artist-level metric sources here.",
    );
  return rows;
}

export function parseAudienceCsv(text: string): AudienceImportSnapshot[] {
  if (new TextEncoder().encode(text).length > 1_000_000)
    throw new Error("CSV must be 1 MB or smaller.");
  const [header, ...data] = parseCsv(text);
  if (
    !header ||
    header.length !== AUDIENCE_CSV_HEADERS.length ||
    header.some((name, index) => name.trim() !== AUDIENCE_CSV_HEADERS[index])
  ) {
    throw new Error(`CSV headers must be: ${AUDIENCE_CSV_HEADERS.join(", ")}.`);
  }
  if (!data.length || data.length > 20000)
    throw new Error("CSV must contain between 1 and 20,000 cohort rows.");
  const groups = new Map<string, AudienceImportSnapshot>();
  const seen = new Set<string>();
  data.forEach((cells, index) => {
    if (cells.length !== AUDIENCE_CSV_HEADERS.length)
      throw new Error(`Row ${index + 2} has the wrong number of fields.`);
    const values = Object.fromEntries(
      AUDIENCE_CSV_HEADERS.map((key, i) => [key, cells[i]!.trim()]),
    );
    const mbid = z.string().uuid().safeParse(values["mbid"]);
    const date = z.string().date().safeParse(values["reference_date"]);
    const windowDays = Number(values["window_days"]);
    const total = Number(values["total"]);
    const coverage = Number(values["coverage"]);
    const share = Number(values["segment_share_pct"]);
    const count = Number(values["segment_count"]);
    if (
      !mbid.success ||
      !date.success ||
      !values["source"] ||
      !values["cohort_scheme"] ||
      values["cohort_scheme"] === "legacy_unknown" ||
      !values["denominator_type"] ||
      values["denominator_type"] === "unknown" ||
      !values["dimension"] ||
      !values["segment_key"] ||
      !Number.isInteger(windowDays) ||
      windowDays <= 0 ||
      !Number.isInteger(total) ||
      total <= 0 ||
      !Number.isFinite(coverage) ||
      coverage < 0.8 ||
      coverage > 1 ||
      !Number.isFinite(share) ||
      share < 0 ||
      share > 100 ||
      !Number.isInteger(count) ||
      count < 0
    ) {
      throw new Error(`Row ${index + 2} has invalid identity, window, coverage or segment values.`);
    }
    const key = [
      mbid.data,
      values["source"],
      date.data,
      windowDays,
      values["cohort_scheme"],
      values["denominator_type"],
    ].join("|");
    let snapshot = groups.get(key);
    if (!snapshot) {
      snapshot = {
        mbid: mbid.data,
        source: values["source"]!,
        reference_date: date.data,
        window_days: windowDays,
        cohort_scheme: values["cohort_scheme"]!,
        denominator_type: values["denominator_type"]!,
        total,
        coverage,
        segments: {},
        segment_counts: {},
      };
      groups.set(key, snapshot);
    }
    if (snapshot.total !== total || snapshot.coverage !== coverage)
      throw new Error(
        `Rows for one snapshot disagree on denominator or coverage (row ${index + 2}).`,
      );
    const dim = values["dimension"]!;
    const seg = values["segment_key"]!;
    const dedupe = `${key}|${dim}|${seg}`;
    if (seen.has(dedupe)) throw new Error(`Duplicate segment in row ${index + 2}.`);
    seen.add(dedupe);
    (snapshot.segments[dim] ??= {})[seg] = share;
    (snapshot.segment_counts[dim] ??= {})[seg] = count;
  });
  for (const snapshot of groups.values()) {
    for (const dimension of Object.keys(snapshot.segments)) {
      const shares = Object.values(snapshot.segments[dimension]!);
      const counts = Object.values(snapshot.segment_counts[dimension]!);
      if (
        Math.abs(shares.reduce((sum, value) => sum + value, 0) - 100) > 1 ||
        counts.reduce((sum, value) => sum + value, 0) !== snapshot.total
      ) {
        throw new Error(
          `${snapshot.reference_date} ${dimension} shares/counts must reconcile to 100% and the stated denominator.`,
        );
      }
    }
  }
  if (groups.size > 1000) throw new Error("CSV may contain no more than 1,000 snapshots.");
  return [...groups.values()];
}
