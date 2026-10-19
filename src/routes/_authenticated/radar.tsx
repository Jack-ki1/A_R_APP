import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Database,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Download,
  ArrowRight,
} from "lucide-react";
import {
  artistsQuery,
  auditQuery,
  evidenceSummaryQuery,
  fmt,
  stageLabel,
  type Artist,
} from "@/lib/artists";
import { growthMultiplier, isEligibleClean } from "@/lib/analytics";
import { Panel, Portrait, ScoreRing, IntegrityChip, Kpi, StatusBadge } from "@/components/br-ui";
import { FirstRunChecklist, NeedsEvidenceCard } from "@/components/first-run";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/_authenticated/radar")({
  head: () => ({
    meta: [
      { title: "Command Centre — Breakout Radar" },
      { name: "description", content: "Today's breakouts and A&R signals." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: RadarPage,
});

const COUNTRIES = ["All", "Kenya", "Uganda", "Tanzania", "Nigeria", "Ghana", "South Africa"];

function exportCsv(rows: Artist[]) {
  const head = [
    "canonical_id",
    "name",
    "country",
    "genre",
    "stage",
    "growth_30d",
    "expected_growth_30d",
    "priority",
    "integrity",
    "confidence",
    "is_demo",
  ];
  const cell = (value: unknown) => {
    let text = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const lines = rows.map((a) =>
    [
      a.canonical_id,
      a.name,
      a.country,
      a.genre,
      a.stage,
      a.growth_30d,
      a.expected_growth_30d,
      (a.scores as Record<string, number>)["priority"],
      a.integrity,
      a.evidence_confidence,
      a.is_demo,
    ]
      .map(cell)
      .join(","),
  );
  const blob = new Blob([[head.map(cell).join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const el = document.createElement("a");
  el.href = url;
  el.download = "breakout-radar-observed-candidates.csv";
  el.click();
  URL.revokeObjectURL(url);
}

function RadarPage() {
  const artistsResult = useQuery(artistsQuery);
  const artists = useMemo(() => artistsResult.data ?? [], [artistsResult.data]);
  const artistsError = artistsResult.isError;
  const auditQueryResult = useQuery(auditQuery);
  const audit = auditQueryResult.data;
  const auditError = auditQueryResult.isError;
  const evidence = useQuery(evidenceSummaryQuery);
  const summary = evidence.data;
  const [country, setCountry] = useState("All");
  const [cleanOnly, setCleanOnly] = useState(true);

  const ranked = useMemo(
    () =>
      artists
        .filter((a) => country === "All" || a.country === country)
        .filter((a) => !cleanOnly || isEligibleClean(a.integrity))
        .sort(
          (a, b) =>
            ((b.scores as Record<string, number>)["priority"] ?? 0) -
            ((a.scores as Record<string, number>)["priority"] ?? 0),
        ),
    [artists, country, cleanOnly],
  );
  const review = artists.filter((a) => a.integrity === "suspicious");
  const awaitingVerification = useMemo(
    () =>
      cleanOnly
        ? artists
            .filter((a) => country === "All" || a.country === country)
            .filter((a) => !isEligibleClean(a.integrity))
        : [],
    [artists, country, cleanOnly],
  );
  const baselineReady = artists.some((a) => a.growth_30d != null && a.expected_growth_30d != null);
  const breakoutCount = baselineReady
    ? artists.filter(
        (a) =>
          a.growth_30d != null && (growthMultiplier(a.growth_30d, a.expected_growth_30d) ?? 0) >= 3,
      ).length
    : null;
  const observedArtistCount = summary
    ? summary.truncated
      ? `≥${summary.observedArtistIds.length}`
      : summary.observedArtistIds.length
    : "—";

  return (
    <div className="space-y-6">
      <section className="dark relative overflow-hidden rounded-2xl border text-foreground">
        <img
          src={hero}
          alt="Artist performing on stage"
          className="absolute inset-0 h-full w-full object-cover object-right"
          width={1600}
          height={640}
        />
        <div className="hero-fade absolute inset-0" />
        <div className="relative max-w-xl p-8">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Confidential · Internal A&R · Evidence-led
          </div>
          <h1 className="text-4xl font-bold leading-tight">
            Find Tomorrow’s Stars <span className="text-lime">Today.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Evidence-based discovery of emerging African artists. Scores are relative indicators,
            not probabilities.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/discover">
                <Search /> Find an artist
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pipeline">
                Open pipeline <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi
          icon={<Users className="size-4" />}
          value={artists.length}
          label="Artists monitored"
          tone="violet"
        />
        <Kpi
          icon={<Database className="size-4" />}
          value={evidence.isError ? "—" : observedArtistCount}
          label="Candidates with usable observations"
          tone="lime"
        />
        <Kpi
          icon={<AlertTriangle className="size-4" />}
          value={review.length}
          label="Integrity reviews open"
          tone="amber"
        />
        <Kpi
          icon={<ShieldCheck className="size-4" />}
          value={
            artists.filter(
              (a) => a.artistic_status === "Review due" || a.artistic_status === "In review",
            ).length
          }
          label="Artistic reviews due"
          tone="violet"
        />
        <Kpi
          icon={<Sparkles className="size-4" />}
          value={breakoutCount ?? "—"}
          label={
            breakoutCount == null
              ? "Breakouts (no growth baseline yet)"
              : "Breakouts (≥3× peer expected)"
          }
        />
        <Kpi
          icon={<Activity className="size-4" />}
          value={evidence.isError ? "—" : (summary?.artistsWithTwoSnapshots ?? "—")}
          label="Artists with 2+ audience snapshots"
          tone="cyan"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel
          title={artists.length === 0 ? "Start your first scouting report" : "Candidate ranking"}
          sub={
            artists.length === 0
              ? "No artists monitored yet — add a verified identity to begin"
              : cleanOnly
                ? "Integrity-validated candidates only · unknown integrity is not validated clean, so those artists wait in the assessment queue"
                : "All candidates, including artists awaiting integrity verification"
          }
          action={
            artists.length === 0 ? undefined : (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Territory"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-8 rounded-md border bg-panel-raised px-2 text-xs"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <label
                  className="flex items-center gap-1.5 text-xs"
                  title="Organic or disclosed paid promo only"
                >
                  <input
                    type="checkbox"
                    checked={cleanOnly}
                    onChange={(e) => setCleanOnly(e.target.checked)}
                    className="accent-lime"
                  />{" "}
                  Clean cohort
                </label>
                <Button size="sm" variant="outline" onClick={() => exportCsv(ranked)}>
                  <Download /> CSV
                </Button>
              </div>
            )
          }
        >
          {artistsError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
            >
              Could not load the artists table. This is an error state, not an empty workspace —
              verify Supabase connectivity and role grants.{" "}
              {artistsResult.error instanceof Error ? artistsResult.error.message : ""}
            </p>
          ) : artists.length === 0 ? (
            <FirstRunChecklist />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th scope="col" className="py-2 pr-2">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Artist
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Genre
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Audience
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Growth 30d
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      vs expected
                    </th>
                    <th scope="col" className="py-2 pr-3 text-center">
                      Priority
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Integrity
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right">
                      Confidence
                    </th>
                    <th scope="col" className="py-2">
                      Next action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((a, i) => {
                    const priority = (a.scores as Record<string, number>)["priority"];
                    return (
                      <tr key={a.id} className="border-b border-border/50 hover:bg-accent/40">
                        <td className="py-3 pr-2 text-muted-foreground num">{i + 1}</td>
                        <td className="py-3 pr-3">
                          <Link
                            to="/artists/$id"
                            params={{ id: a.id }}
                            className="flex items-center gap-3 font-medium hover:text-lime"
                          >
                            <Portrait
                              seed={a.portrait_seed}
                              name={a.name}
                              isDemo={a.is_demo}
                              className="size-9"
                            />
                            <span>
                              <span className="block">{a.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {a.city}, {a.country}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="py-3 pr-3 text-xs">{a.genre}</td>
                        <td className="py-3 pr-3 text-right num">{fmt(a.audience_current)}</td>
                        <td className="py-3 pr-3 text-right font-semibold text-lime num">
                          {a.growth_30d == null ? "—" : `+${a.growth_30d}%`}
                        </td>
                        <td className="py-3 pr-3 text-right num">
                          {growthMultiplier(a.growth_30d, a.expected_growth_30d) == null
                            ? "—"
                            : `${growthMultiplier(a.growth_30d, a.expected_growth_30d)}×`}
                        </td>
                        <td className="py-3 pr-3 text-center">
                          {priority == null ? (
                            <span
                              className="text-xs text-muted-foreground"
                              title="No scored evidence recorded for this artist"
                            >
                              —
                            </span>
                          ) : (
                            <div className="flex justify-center">
                              <ScoreRing value={priority} size={34} />
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <IntegrityChip value={a.integrity} />
                        </td>
                        <td className="py-3 pr-3 text-right num">
                          {a.evidence_confidence == null ? "—" : `${a.evidence_confidence}%`}
                        </td>
                        <td
                          className="max-w-40 truncate py-3 text-xs text-muted-foreground"
                          title={a.next_action ?? ""}
                        >
                          {a.next_action ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {ranked.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                        No candidates match this territory, cohort and filter combination. Adjust
                        the filters — artists are never dropped for having unknown metrics.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {artists.length > 0 && awaitingVerification.length > 0 && (
            <section
              className="mt-4 rounded-xl border border-amber/40 bg-amber/5 p-4"
              aria-label="Awaiting integrity verification"
            >
              <p className="text-sm font-medium text-amber">
                {awaitingVerification.length} artist
                {awaitingVerification.length === 1 ? "" : "s"} awaiting integrity verification
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hidden from the clean cohort only. Unknown integrity is not validated clean, and it
                is not a fraud finding — verify or investigate to include them in ranking.
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {awaitingVerification.map((a) => (
                  <li key={a.id}>
                    <Link
                      to="/artists/$id"
                      params={{ id: a.id }}
                      className="font-medium hover:text-lime"
                    >
                      {a.name}
                    </Link>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {stageLabel(a.pipeline_stage)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </Panel>

        <div className="space-y-6">
          {artists.length > 0 && summary && summary.observationCount === 0 && (
            <NeedsEvidenceCard artistCount={artists.length} observationCount={0} />
          )}
          <Panel
            title="Source health & data coverage"
            sub="Connection state and freshness for every evidence channel."
          >
            {evidence.isPending && (
              <p role="status" className="text-xs text-muted-foreground">
                Checking evidence tables…
              </p>
            )}
            {evidence.isError && (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive"
              >
                Could not load metric observations or audience snapshots. This is an error state,
                not a measured zero — verify Supabase connectivity, migrations 0004–0005 and role
                grants. {evidence.error instanceof Error ? evidence.error.message : ""}
              </p>
            )}
            {summary && (
              <ul className="space-y-3 text-xs">
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">MusicBrainz identity</span>
                    <StatusBadge tone="live">Live metadata</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    On demand · identity and release metadata only, never audience size.
                  </p>
                </li>
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Metric observations</span>
                    <StatusBadge tone={summary.observationCount > 0 ? "imported" : "off"}>
                      {summary.observationCount > 0
                        ? "Imported observations"
                        : "No observations yet"}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {summary.observationCount > 0
                      ? `${summary.observationCount} accepted rows · latest window ends ${
                          summary.latestObservationEnd ?? "—"
                        }`
                      : "No rights-cleared export has been imported for any artist."}
                  </p>
                </li>
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Audience snapshots</span>
                    <StatusBadge tone={summary.snapshotCount > 0 ? "imported" : "off"}>
                      {summary.snapshotCount > 0 ? "Imported snapshots" : "No snapshots yet"}
                    </StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    {summary.snapshotCount > 0
                      ? `${summary.snapshotCount} accepted rows · latest reference ${
                          summary.latestSnapshotDate ?? "—"
                        }`
                      : "Cohort comparisons need two compatible snapshots from one source."}
                  </p>
                </li>
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">UGC / social</span>
                    <StatusBadge tone="off">Not connected</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    No approved UGC provider contract is configured.
                  </p>
                </li>
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">ListenBrainz pulse</span>
                    <StatusBadge tone="live">Live lookup</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    Opt-in global community sample · not African market demand.
                  </p>
                </li>
                <li>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">Forecast & backtest</span>
                    <StatusBadge tone="unvalidated">Unvalidated model</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-muted-foreground">
                    No trained model exists; probabilities are deliberately unavailable.
                  </p>
                </li>
                {summary.truncated && (
                  <li className="text-muted-foreground">
                    Row counts scanned the most recent 1,000 records per table, so totals marked ≥
                    are lower bounds.
                  </li>
                )}
              </ul>
            )}
          </Panel>
          <Panel title="Under integrity review" sub="Advisory signals — not accusations">
            <ul className="space-y-3">
              {review.map((a) => (
                <li key={a.id}>
                  <Link
                    to="/artists/$id"
                    params={{ id: a.id }}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                  >
                    <Portrait
                      seed={a.portrait_seed}
                      name={a.name}
                      isDemo={a.is_demo}
                      className="size-8"
                    />
                    <div className="min-w-0 text-sm">
                      <div className="font-medium">{a.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{a.next_action}</div>
                    </div>
                  </Link>
                </li>
              ))}
              {review.length === 0 && (
                <li className="text-xs text-muted-foreground">No open cases.</li>
              )}
            </ul>
          </Panel>
          <Panel title="Recent pipeline activity">
            <ul className="space-y-2 text-xs">
              {auditError && (
                <li className="text-destructive">
                  Activity history is unavailable (permission or network error), not empty.
                </li>
              )}
              {(audit ?? []).map((e) => {
                const d = e.detail as { artist?: string; from?: string; to?: string } | null;
                return (
                  <li key={e.id} className="border-l-2 border-lime/60 pl-3">
                    <span className="font-medium">{d?.artist}</span> moved to{" "}
                    {stageLabel((d?.to ?? "identified") as never)}
                    <div className="text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </div>
                  </li>
                );
              })}
              {auditQueryResult.isSuccess && auditQueryResult.data.length === 0 && (
                <li className="text-muted-foreground">
                  No moves yet — move a card on the pipeline board.
                </li>
              )}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
