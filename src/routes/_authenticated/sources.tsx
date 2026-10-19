import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { getListenBrainzPulse } from "@/lib/musicbrainz.functions";
import { SOURCES } from "@/lib/modules";
import { Panel } from "@/components/br-ui";
import { ArtistIntakeSearch } from "@/components/artist-intake";
import { cn } from "@/lib/utils";
import { dataSourcesQuery, myRolesQuery } from "@/lib/artists";
import {
  importAuthorizedAudienceSnapshots,
  importAuthorizedMetricRows,
  setAudienceReviewCadence,
} from "@/lib/source.functions";
import {
  AUDIENCE_CSV_HEADERS,
  METRIC_CSV_HEADERS,
  parseAudienceCsv,
  parseMetricCsv,
} from "@/lib/metric-import";

export const Route = createFileRoute("/_authenticated/sources")({
  head: () => ({
    meta: [
      { title: "Data Sources — Breakout Radar" },
      { name: "description", content: "Live metadata discovery and connected data coverage." },
    ],
  }),
  loader: async () => {
    try {
      return { pulse: await getListenBrainzPulse(), pulseError: "" };
    } catch {
      return { pulse: null, pulseError: "ListenBrainz community data is temporarily unavailable." };
    }
  },
  component: Sources,
});

function Sources() {
  const { pulse, pulseError } = Route.useLoaderData();
  const queryClient = useQueryClient();
  const sourceRegistryQuery = useQuery(dataSourcesQuery);
  const sources = sourceRegistryQuery.data ?? [];
  const { data: membership } = useQuery(myRolesQuery);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [authorizationReference, setAuthorizationReference] = useState("");
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [audienceCsvFile, setAudienceCsvFile] = useState<File | null>(null);
  const [audienceImportMessage, setAudienceImportMessage] = useState("");
  const [audienceImportBusy, setAudienceImportBusy] = useState(false);
  const [cadenceMessage, setCadenceMessage] = useState("");
  const cadence =
    sources.find((source) => source.provider === "artist_authorized_audience_csv")
      ?.refresh_cadence ?? "manual";
  const audienceSourceReady = sources.some(
    (source) => source.provider === "artist_authorized_audience_csv",
  );
  const cadenceMutation = useMutation({
    mutationFn: (value: "manual" | "every_14_days" | "twice_monthly" | "every_2_months") =>
      setAudienceReviewCadence({ data: { cadence: value } }),
    onSuccess: ({ cadence: saved }) => {
      setCadenceMessage(
        `Preference saved: ${saved.replaceAll("_", " ")}. This does not schedule data collection.`,
      );
      queryClient.invalidateQueries({ queryKey: ["data_sources"] });
    },
    onError: (cause: Error) => setCadenceMessage(cause.message),
  });
  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!csvFile || !rightsConfirmed || !authorizationReference.trim()) return;
    setImportBusy(true);
    setImportMessage("");
    try {
      const rows = parseMetricCsv(await csvFile.text());
      const result = await importAuthorizedMetricRows({
        data: { authorizationReference: authorizationReference.trim(), rows },
      });
      await queryClient.invalidateQueries({ queryKey: ["metric_observations"] });
      await queryClient.invalidateQueries({ queryKey: ["data_sources"] });
      const skipped = result.submitted - result.accepted;
      setImportMessage(
        `Import recorded: ${result.accepted} new observations ( ${result.submitted} submitted${skipped > 0 ? `, ${skipped} duplicate or invalid rows skipped` : ""}). Run ${result.runId}.`,
      );
      setCsvFile(null);
    } catch (cause) {
      setImportMessage(cause instanceof Error ? cause.message : "Metric import failed.");
    } finally {
      setImportBusy(false);
    }
  }
  async function submitAudienceImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!audienceCsvFile || !rightsConfirmed || !authorizationReference.trim()) return;
    setAudienceImportBusy(true);
    setAudienceImportMessage("");
    try {
      const snapshots = parseAudienceCsv(await audienceCsvFile.text());
      const result = await importAuthorizedAudienceSnapshots({
        data: { authorizationReference: authorizationReference.trim(), snapshots },
      });
      await queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      await queryClient.invalidateQueries({ queryKey: ["data_sources"] });
      setAudienceImportMessage(
        `${result.inserted} of ${result.received} snapshots added; duplicates were safely skipped.`,
      );
      setAudienceCsvFile(null);
    } catch (cause) {
      setAudienceImportMessage(cause instanceof Error ? cause.message : "Audience import failed.");
    } finally {
      setAudienceImportBusy(false);
    }
  }
  function downloadTemplate() {
    const blob = new Blob([`${METRIC_CSV_HEADERS.join(",")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "breakout-radar-authorized-metrics-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  function downloadAudienceTemplate() {
    const blob = new Blob([`${AUDIENCE_CSV_HEADERS.join(",")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "breakout-radar-authorized-audience-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="space-y-6">
      <Panel
        title="ListenBrainz community pulse"
        sub="A live, open-data signal from opted-in ListenBrainz users. This reflects that community's listening, not African market share, total audience, or artist-level monthly listeners."
      >
        {pulseError && (
          <p role="status" className="text-sm text-muted-foreground">
            {pulseError}
          </p>
        )}
        {pulse && (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Top community artists · week range · counts are listens recorded by ListenBrainz
              </span>
              <span>
                Updated{" "}
                {pulse.updatedAt
                  ? new Date(pulse.updatedAt * 1000).toLocaleString()
                  : "time not provided"}
              </span>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pulse.artists.map((artist, index) => (
                <li
                  key={`${artist.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background/50 px-3 py-2"
                >
                  <span className="truncate">
                    <span className="mr-2 text-xs text-muted-foreground">{index + 1}</span>
                    {artist.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {artist.listens == null
                      ? "Count unavailable"
                      : `${artist.listens.toLocaleString()} listens`}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              Use this only to spark manual research. The dataset has no African territory filter,
              is community-selected, and should not be treated as a representative audience or
              validated breakout ranking. Data is fetched live and cached in-process for 15 minutes.
            </p>
          </>
        )}
      </Panel>
      <Panel
        title="Open metadata discovery"
        sub="Search the live MusicBrainz catalog to resolve artist names and identity candidates. This is descriptive metadata, not evidence of popularity or growth."
      >
        <ArtistIntakeSearch />
      </Panel>
      <Panel
        title="Import authorized metrics"
        sub="Import a first-party or licensed export with explicit provenance. Imported observations retain their source, period, territory, unit and rights reference."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-muted-foreground">
            Only import data you are authorized to use for internal analysis. Imports are attributed
            to the signed-in operator and are not authorized for model training by this workflow.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Download CSV template
          </button>
        </div>
        <form onSubmit={(event) => void submitImport(event)} className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-sm">
            Authorization reference
            <input
              required
              value={authorizationReference}
              onChange={(event) => setAuthorizationReference(event.target.value)}
              placeholder="Agreement, consent, or approved source record"
              className="h-10 rounded-md border bg-background px-3"
            />
          </label>
          <label className="grid gap-1 text-sm">
            CSV file
            <input
              required
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setCsvFile(event.target.files?.[0] ?? null)}
              className="h-10 rounded-md border bg-background px-3 py-2 text-xs"
            />
          </label>
          <label className="flex items-start gap-2 text-xs text-muted-foreground md:col-span-2">
            <input
              type="checkbox"
              checked={rightsConfirmed}
              onChange={(event) => setRightsConfirmed(event.target.checked)}
              className="mt-0.5"
            />
            I have verified this source’s authorization, permitted internal use, territory coverage
            and retention requirements, and the reference above records that basis.
          </label>
          <button
            type="submit"
            disabled={
              importBusy ||
              sourceRegistryQuery.isError ||
              !csvFile ||
              !rightsConfirmed ||
              !authorizationReference.trim()
            }
            className="h-10 w-fit rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {importBusy ? "Importing…" : "Validate & import observations"}
          </button>
        </form>
        {importMessage && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {importMessage}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Required columns: {METRIC_CSV_HEADERS.join(", ")}. Every MBID must already be confirmed in
          the workspace. The batch is all-or-nothing.
        </p>
      </Panel>
      <Panel
        title="Import authorized audience cohorts"
        sub="Upload aggregate cohort rows; the app groups them into dated snapshots and checks shares and counts reconcile before import."
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-xs text-muted-foreground">
            Use the authorization reference and rights confirmation above. Cohort counts must be
            aggregate, permitted, and sufficiently large under your source’s disclosure policy. The
            app does not infer person-level movement.
          </p>
          <button
            type="button"
            onClick={downloadAudienceTemplate}
            className="rounded-md border px-3 py-2 text-sm"
          >
            Download cohort CSV template
          </button>
        </div>
        <form
          onSubmit={(event) => void submitAudienceImport(event)}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="grid gap-1 text-sm">
            Audience cohort CSV
            <input
              required
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setAudienceCsvFile(event.target.files?.[0] ?? null)}
              className="h-10 rounded-md border bg-background px-3 py-2 text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={
              audienceImportBusy ||
              sourceRegistryQuery.isError ||
              !audienceCsvFile ||
              !rightsConfirmed ||
              !authorizationReference.trim()
            }
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {audienceImportBusy ? "Importing…" : "Validate & import cohort snapshots"}
          </button>
        </form>
        {audienceImportMessage && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            {audienceImportMessage}
          </p>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">
          Required columns: {AUDIENCE_CSV_HEADERS.join(", ")}. Every MBID must be confirmed; each
          dimension’s shares must sum to 100% and counts to its stated denominator. Duplicate
          snapshots are skipped.
        </p>
      </Panel>
      <Panel
        title="Data coverage"
        sub="Live provider connections are deliberately distinguished from demo fixtures and unavailable integrations."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Source</th>
                <th>Purpose</th>
                <th>Status</th>
                <th>Freshness</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {SOURCES.map((s) => (
                <tr key={s.name}>
                  <td className="py-2.5 font-medium">{s.name}</td>
                  <td>{s.kind}</td>
                  <td>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[11px]",
                        s.status === "Live lookup"
                          ? "border-primary/40 text-primary"
                          : s.status === "Synthetic demo data"
                            ? "border-amber/40 text-amber"
                            : "text-muted-foreground",
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="num text-muted-foreground">{s.fresh}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel
        title="Audience review cadence"
        sub="Choose an exact interval for the team’s manual audience snapshot reviews. This preference does not schedule imports."
      >
        <div className="flex flex-wrap items-center gap-3">
          <label className="grid gap-1 text-sm">
            Preferred interval
            <select
              value={cadence}
              disabled={
                sourceRegistryQuery.isError ||
                !audienceSourceReady ||
                !membership?.roles.some((role) => role === "admin" || role === "head_of_ar") ||
                cadenceMutation.isPending
              }
              onChange={(event) =>
                cadenceMutation.mutate(
                  event.target.value as
                    "manual" | "every_14_days" | "twice_monthly" | "every_2_months",
                )
              }
              className="h-10 rounded-md border bg-background px-3"
            >
              <option value="manual">Manual, no target interval</option>
              <option value="every_14_days">Fortnightly (every 14 days)</option>
              <option value="twice_monthly">Twice monthly</option>
              <option value="every_2_months">Every two months</option>
            </select>
          </label>
          {!membership?.roles.some((role) => role === "admin" || role === "head_of_ar") && (
            <span className="text-xs text-muted-foreground">
              Only Head of A&R or Admin can change this preference.
            </span>
          )}
        </div>
        {cadenceMessage && (
          <p role="status" className="mt-3 text-xs text-muted-foreground">
            {cadenceMessage}
          </p>
        )}
      </Panel>
      <Panel
        title="What public APIs can support"
        sub="Provider access is not the same as audience analytics access."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            MusicBrainz supplies open catalog metadata and identity references. It does not supply
            listener counts, audience demographics, or trend history.
          </li>
          <li>
            ListenBrainz supplies open, opt-in community listening aggregates. Its sample is
            self-selected and global; it is not a reliable measure of African market demand.
          </li>
          <li>
            YouTube Data API can support video/channel discovery with a Google API key. Its default
            quota includes 100 search requests/day, so search needs caching; it is not a complete
            historical UGC feed.
          </li>
          <li>
            TikTok Research Tools require approved, eligible non-commercial research access. The
            Commercial Content API is separate and currently documents EU-region data; neither is
            general African music UGC analytics.
          </li>
          <li>
            Spotify Web API access is subject to current developer rules and does not provide the
            licensed cross-platform audience history this product needs. Do not derive listenership
            metrics or train models from Spotify data without explicit rights approval.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
