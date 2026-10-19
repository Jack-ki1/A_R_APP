import { createFileRoute, Link } from "@tanstack/react-router";
import { Panel } from "@/components/br-ui";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Breakout Radar" },
      { name: "description", content: "Workspace administration, sources, reports, and research tools." },
    ],
  }),
  component: Settings,
});

const ROLES = [
  { role: "Admin", can: "Everything, including managing team roles and marking Signed" },
  { role: "Head of A&R", can: "Move artists to any stage, including Signed" },
  { role: "Scout", can: "Move artists, add notes, open integrity cases" },
  { role: "Analyst", can: "Import approved data, investigate integrity, and use research/reporting tools" },
  { role: "Artist Development", can: "Manage development plans" },
];

function Settings() {
  return (
    <div className="space-y-4">
      <Panel title="Workspace administration" sub="Configure and review the supporting tools for this private A&R workspace.">
        <p className="text-sm text-muted-foreground">
          Access requires a Supabase account with a workspace role. User invitation and role-management controls
          still need to be connected to a verified Supabase staging project.
        </p>
      </Panel>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <SettingsLink to="/sources" title="Data sources" detail="Identity lookup, authorized imports, source status, and audience cadence." />
        <SettingsLink to="/reports" title="Reports & exports" detail="Private source-linked observation reports and CSV exports." />
        <SettingsLink to="/alerts" title="Alerts" detail="Evidence-linked operational alerts when source rules are available." />
        <SettingsLink to="/predictions" title="Forecast readiness" detail="Model readiness status; no probabilities are available." />
        <SettingsLink to="/backtesting" title="Backtest readiness" detail="Historical validation requirements and current evidence status." />
      </section>
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
          Missing evidence stays unavailable. Legacy fixture scores are not operational intelligence; the app does
          not provide trained model probabilities or validated historical forecasts.
        </p>
      </Panel>
    </div>
  );
}

function SettingsLink({ to, title, detail }: { to: "/sources" | "/reports" | "/alerts" | "/predictions" | "/backtesting"; title: string; detail: string }) {
  return (
    <Link to={to} className="panel block p-4 transition hover:border-lime hover:bg-panel-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </Link>
  );
}
