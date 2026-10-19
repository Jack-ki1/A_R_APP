import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { getListenBrainzPulse } from "@/lib/musicbrainz.functions";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { observationsQuery } from "@/lib/reports";
import { Panel } from "@/components/br-ui";
import { SourcesSection, type Pulse } from "@/components/settings/sources-section";
import { AlertsSection } from "@/components/settings/alerts-section";
import { ReportsSection } from "@/components/settings/reports-section";
import { PredictionsSection } from "@/components/settings/predictions-section";
import { BacktestingSection } from "@/components/settings/backtesting-section";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Breakout Radar" },
      {
        name: "description",
        content: "Workspace administration, data sources, alerts, reports, and model readiness.",
      },
    ],
  }),
  loader: async ({ context }) => {
    const [pulse] = await Promise.all([
      (async () => {
        try {
          return await getListenBrainzPulse();
        } catch {
          return null;
        }
      })(),
      context.queryClient.ensureQueryData(tableQuery("alerts")),
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(observationsQuery),
    ]);
    return {
      pulse,
      pulseError: pulse ? "" : "ListenBrainz community data is temporarily unavailable.",
    };
  },
  component: Settings,
});

const ROLES = [
  { role: "Admin", can: "Everything, including managing team roles and marking Signed" },
  { role: "Head of A&R", can: "Move artists to any stage, including Signed" },
  { role: "Scout", can: "Move artists, add notes, open integrity cases" },
  {
    role: "Analyst",
    can: "Import approved data, investigate integrity, and use research/reporting tools",
  },
  { role: "Artist Development", can: "Manage development plans" },
];

const SECTION_LINKS = [
  { href: "#sources", label: "Data sources" },
  { href: "#alerts", label: "Alerts" },
  { href: "#reports", label: "Reports & exports" },
  { href: "#predictions", label: "Forecast readiness" },
  { href: "#backtesting", label: "Backtest readiness" },
] as const;

function Settings() {
  // strict:false keeps the component mountable outside its own route (tests render it standalone).
  const loaded = useLoaderData({ strict: false }) as
    { pulse: Pulse; pulseError: string } | undefined;
  const { pulse, pulseError } = loaded ?? {
    pulse: null,
    pulseError: "ListenBrainz community data is temporarily unavailable.",
  };
  return (
    <div className="space-y-4">
      <Panel
        title="Workspace administration"
        sub="Configure and review the supporting tools for this private A&R workspace."
      >
        <p className="text-sm text-muted-foreground">
          Access requires a Supabase account with a workspace role. User invitation and
          role-management controls still need to be connected to a verified Supabase staging
          project.
        </p>
      </Panel>
      <nav aria-label="Settings sections" className="flex flex-wrap gap-2">
        {SECTION_LINKS.map((section) => (
          <a
            key={section.href}
            href={section.href}
            className="rounded-lg border bg-panel px-3 py-1.5 text-sm text-muted-foreground transition hover:border-lime hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {section.label}
          </a>
        ))}
      </nav>

      <div id="sources" className="scroll-mt-20">
        <SourcesSection pulse={pulse} pulseError={pulseError} />
      </div>
      <div id="alerts" className="scroll-mt-20">
        <AlertsSection />
      </div>
      <div id="reports" className="scroll-mt-20">
        <ReportsSection />
      </div>
      <div id="predictions" className="scroll-mt-20">
        <PredictionsSection />
      </div>
      <div id="backtesting" className="scroll-mt-20">
        <BacktestingSection />
      </div>

      <Panel title="Roles">
        <ul className="divide-y text-sm">
          {ROLES.map((r) => (
            <li key={r.role} className="flex gap-4 py-2.5">
              <b className="w-40 shrink-0">{r.role}</b>
              <span className="text-muted-foreground">{r.can}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Evidence and scoring policy">
        <p className="text-sm text-muted-foreground">
          Missing evidence stays unavailable. Legacy fixture scores are not operational
          intelligence; the app does not provide trained model probabilities or validated historical
          forecasts.
        </p>
      </Panel>
    </div>
  );
}
