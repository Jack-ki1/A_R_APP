import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ExternalLink, Search, Plug, Unplug, Loader2 } from "lucide-react";
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
  connectProvider,
  disconnectProvider,
  testProviderConnection,
  searchYouTube,
} from "@/lib/provider-connections.functions";
import { providerConnectionsQuery } from "@/lib/provider-connections";
import {
  AUDIENCE_CSV_HEADERS,
  METRIC_CSV_HEADERS,
  parseAudienceCsv,
  parseMetricCsv,
} from "@/lib/metric-import";

const PROVIDER_INFO: Record<string, { label: string; getKeyUrl: string; getKeyLabel: string }> = {
  youtube: {
    label: "YouTube Data API",
    getKeyUrl: "https://console.cloud.google.com/apis/credentials",
    getKeyLabel: "Google Cloud API key",
  },
  spotify: {
    label: "Spotify",
    getKeyUrl: "https://developer.spotify.com/dashboard",
    getKeyLabel: "Client ID + secret (stored as one credential)",
  },
  tiktok: {
    label: "TikTok",
    getKeyUrl: "https://developers.tiktok.com/",
    getKeyLabel: "TikTok for Developers key",
  },
};

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
  const connectionsQuery = useQuery(providerConnectionsQuery);
  const connections = connectionsQuery.data ?? [];
  const [connectProviderId, setConnectProviderId] = useState("youtube");
  const [apiKey, setApiKey] = useState("");
  const [connectMessage, setConnectMessage] = useState("");
  const [connectBusy, setConnectBusy] = useState(false);
  const [testBusy, setTestBusy] = useState<string | null>(null);
  const [ytQuery, setYtQuery] = useState("");
  const [ytResults, setYtResults] = useState<
    Awaited<ReturnType<typeof searchYouTube>>["items"] | null
  >(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytError, setYtError] = useState("");
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
  const connectMutation = useMutation({
    mutationFn: (input: { provider: string; apiKey: string }) =>
      connectProvider({
        data: input as { provider: "youtube" | "spotify" | "tiktok"; apiKey: string },
      }),
    onSuccess: () => {
      setConnectMessage("Credential stored securely. You can now test the connection.");
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["provider_connections"] });
    },
    onError: (cause: Error) => setConnectMessage(cause.message),
  });
  const disconnectMutation = useMutation({
    mutationFn: (provider: string) =>
      disconnectProvider({ data: { provider: provider as "youtube" | "spotify" | "tiktok" } }),
    onSuccess: () => {
      setConnectMessage("Connection removed.");
      queryClient.invalidateQueries({ queryKey: ["provider_connections"] });
    },
    onError: (cause: Error) => setConnectMessage(cause.message),
  });
  async function handleTest(provider: string) {
    setTestBusy(provider);
    setConnectMessage("");
    try {
      const result = await testProviderConnection({
        data: { provider: provider as "youtube" | "spotify" | "tiktok" },
      });
      setConnectMessage(result.message);
      queryClient.invalidateQueries({ queryKey: ["provider_connections"] });
    } catch (cause) {
      setConnectMessage(cause instanceof Error ? cause.message : "Connection test failed.");
    } finally {
      setTestBusy(null);
    }
  }
  async function handleYouTubeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ytQuery.trim()) return;
    setYtBusy(true);
    setYtError("");
    setYtResults(null);
    try {
      const result = await searchYouTube({ data: { query: ytQuery.trim() } });
      setYtResults(result.items);
    } catch (cause) {
      setYtError(cause instanceof Error ? cause.message : "YouTube search failed.");
    } finally {
      setYtBusy(false);
    }
  }
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
        title="Connect a data source"
        sub="Link your own provider account. Your API key is encrypted with Supabase Vault and only ever used server-side — it never appears in the browser or in any query response."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              Provider
              <select
                value={connectProviderId}
                onChange={(e) => {
                  setConnectProviderId(e.target.value);
                  setApiKey("");
                  setConnectMessage("");
                }}
                className="h-10 rounded-md border bg-background px-3"
              >
                {Object.entries(PROVIDER_INFO).map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              {PROVIDER_INFO[connectProviderId]?.getKeyLabel ?? "API key"}
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your key here"
                autoComplete="off"
                className="h-10 rounded-md border bg-background px-3"
              />
            </label>
            <a
              href={PROVIDER_INFO[connectProviderId]?.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="size-3" /> Where to get your key
            </a>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={connectBusy || apiKey.trim().length < 10}
                onClick={() => {
                  setConnectBusy(true);
                  setConnectMessage("");
                  connectMutation.mutate(
                    { provider: connectProviderId, apiKey: apiKey.trim() },
                    { onSettled: () => setConnectBusy(false) },
                  );
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Plug className="size-4" /> Connect
              </button>
              {connections.some((c) => c.provider === connectProviderId) && (
                <>
                  <button
                    type="button"
                    disabled={testBusy !== null}
                    onClick={() => void handleTest(connectProviderId)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border px-4 text-sm disabled:opacity-50"
                  >
                    {testBusy === connectProviderId ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Test connection
                  </button>
                  <button
                    type="button"
                    disabled={disconnectMutation.isPending}
                    onClick={() => disconnectMutation.mutate(connectProviderId)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-destructive/40 px-4 text-sm text-destructive disabled:opacity-50"
                  >
                    <Unplug className="size-4" /> Disconnect
                  </button>
                </>
              )}
            </div>
            {connectMessage && (
              <p role="status" className="text-sm text-muted-foreground">
                {connectMessage}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Your connections</h4>
            {connectionsQuery.isPending && (
              <p className="text-xs text-muted-foreground">Loading…</p>
            )}
            {connectionsQuery.isError && (
              <p role="alert" className="text-xs text-destructive">
                Could not load connections. Verify Supabase connectivity and that migration 0006 is
                applied.
              </p>
            )}
            {connections.length === 0 && !connectionsQuery.isPending && (
              <p className="text-xs text-muted-foreground">
                No provider accounts connected yet. Paste an API key above to get started.
              </p>
            )}
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {PROVIDER_INFO[conn.provider]?.label ?? conn.provider}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">{conn.key_hint}</span>
                </div>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px]",
                    conn.status === "connected"
                      ? "border-primary/40 text-primary"
                      : "border-destructive/40 text-destructive",
                  )}
                >
                  {conn.status === "connected" ? "Connected" : "Error"}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Keys are stored per-user and scoped to your account. Only you can decrypt and use them.
          The server uses your key to call the provider API on your behalf; results are returned
          only to you. Spotify and TikTok connections are stored but live calls require an OAuth and
          rights review before enabling.
        </p>
      </Panel>
      {connections.some((c) => c.provider === "youtube" && c.status === "connected") && (
        <Panel
          title="YouTube search"
          sub="Search for videos using your connected YouTube API key. Results are fetched live and are only visible to you."
        >
          <form onSubmit={(e) => void handleYouTubeSearch(e)} className="flex gap-2">
            <input
              value={ytQuery}
              onChange={(e) => setYtQuery(e.target.value)}
              placeholder="Search artist or song name"
              className="h-10 flex-1 rounded-md border bg-background px-3"
            />
            <button
              type="submit"
              disabled={ytBusy || ytQuery.trim().length < 2}
              className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {ytBusy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Search
            </button>
          </form>
          {ytError && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {ytError}
            </p>
          )}
          {ytResults && ytResults.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No results found.</p>
          )}
          {ytResults && ytResults.length > 0 && (
            <ul className="mt-4 divide-y">
              {ytResults.map((item) => (
                <li key={item.videoId} className="flex items-center gap-3 py-2.5">
                  {item.thumbnailUrl && (
                    <img
                      src={item.thumbnailUrl}
                      alt=""
                      className="size-16 rounded object-cover"
                      width={64}
                      height={36}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={`https://www.youtube.com/watch?v=${item.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium hover:text-lime"
                    >
                      {item.title}
                    </a>
                    <p className="text-xs text-muted-foreground">{item.channelTitle}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            YouTube's default quota includes ~100 search requests/day. Results are live API
            responses, not stored observations.
          </p>
        </Panel>
      )}
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
              {SOURCES.map((s) => {
                const providerKey =
                  s.name === "YouTube Data API"
                    ? "youtube"
                    : s.name === "Spotify"
                      ? "spotify"
                      : s.name === "TikTok UGC"
                        ? "tiktok"
                        : null;
                const conn = providerKey
                  ? connections.find((c) => c.provider === providerKey)
                  : null;
                const statusLabel = conn
                  ? conn.status === "connected"
                    ? "Connected"
                    : "Error"
                  : s.status;
                return (
                  <tr key={s.name}>
                    <td className="py-2.5 font-medium">{s.name}</td>
                    <td>{s.kind}</td>
                    <td>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px]",
                          conn?.status === "connected"
                            ? "border-primary/40 text-primary"
                            : s.status === "Live lookup"
                              ? "border-primary/40 text-primary"
                              : s.status === "Synthetic demo data"
                                ? "border-amber/40 text-amber"
                                : "text-muted-foreground",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="num text-muted-foreground">
                      {conn?.status === "connected" ? "On demand" : s.fresh}
                    </td>
                  </tr>
                );
              })}
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
