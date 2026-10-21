import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import {
  Search,
  ChartNoAxesCombined,
  ClipboardCheck,
  GitBranch,
  Rocket,
  Settings,
  Bell,
  Database,
  FileText,
  LogOut,
  Compass,
} from "lucide-react";
import { Logo } from "@/components/br-ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isSupabaseConfigured()) throw redirect({ to: "/auth" });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    if (error || !roles?.length) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
  },
  component: Shell,
});

/** Exactly five top-level sidebar sections per design mandate */
const NAV = [
  {
    to: "/discover",
    label: "Discover",
    icon: Search,
    match: ["/artists"],
    search: { q: undefined },
  },
  {
    to: "/analyse",
    label: "Analyse",
    icon: ChartNoAxesCombined,
    match: ["/audience", "/ugc"],
    search: { tab: undefined, artistId: undefined },
  },
  {
    to: "/evaluate",
    label: "Evaluate",
    icon: ClipboardCheck,
    search: { tab: undefined, artistId: undefined },
  },
  {
    to: "/decide",
    label: "Decide",
    icon: GitBranch,
    match: ["/pipeline", "/integrity"],
    search: { tab: undefined, artistId: undefined },
  },
  {
    to: "/develop",
    label: "Develop",
    icon: Rocket,
    match: ["/development"],
    search: { tab: undefined, artistId: undefined },
  },
] as const;

function Shell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const destinations = NAV.map((group) => ({ to: group.to, label: group.label }));

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,var(--sidebar),color-mix(in_oklab,var(--sidebar)_88%,var(--cyan)))] p-4 md:flex">
        <div className="mb-8 rounded-2xl border border-sidebar-border/70 bg-background/20 px-3 py-4">
          <Logo />
          <div className="mt-4 flex items-center gap-2 border-t border-sidebar-border/70 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-lime shadow-[0_0_10px_var(--lime)]" />
            Internal A&amp;R workspace
          </div>
        </div>
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Talent journey
        </p>
        <nav className="space-y-1.5 overflow-y-auto" aria-label="Main">
          {NAV.map((group) => {
            const active =
              path.startsWith(group.to) ||
              ("match" in group && group.match.some((prefix) => path.startsWith(prefix)));
            return (
              <Link
                key={group.to}
                to={group.to}
                search={group.search}
                className={cn(
                  "group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-transparent px-3 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-lime/25 bg-lime/10 text-lime shadow-[inset_3px_0_0_var(--lime),0_8px_24px_-18px_var(--lime)]"
                    : "text-sidebar-foreground hover:border-sidebar-border/70 hover:bg-sidebar-accent/70 hover:text-foreground",
                )}
              >
                <group.icon
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    active ? "text-lime" : "text-muted-foreground group-hover:text-lime",
                  )}
                />
                {group.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-sidebar-border/70 bg-background/20 p-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            From signal to signed artist
          </div>
          <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
            {NAV.map((stage, index) => (
              <span
                key={stage.to}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  path.startsWith(stage.to) ? "bg-lime" : "bg-sidebar-border",
                )}
                style={{ opacity: path.startsWith(stage.to) ? 1 : 0.55 + index * 0.08 }}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-sidebar-foreground">
            Evidence-led decisions, at every step.
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl md:px-6">
          <form
            className="group relative max-w-xl flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q") as string;
              navigate({ to: "/discover", search: { q } });
            }}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              aria-label="Search artists"
              placeholder="Search artists, genres, cities…"
              className="h-10 w-full rounded-xl border border-border/70 bg-panel/80 pl-10 pr-14 text-sm placeholder:text-muted-foreground transition focus:border-lime/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/70 bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Search
            </kbd>
          </form>

          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan/5 px-3 py-1.5 font-medium text-foreground">
              <Compass className="size-3.5 text-cyan" />
              Africa
            </span>
            <span className="text-muted-foreground">Internal workspace</span>
          </div>

          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border/70 bg-panel/60 p-1 lg:ml-0">
            <Link
              to="/decide"
              search={{ tab: "briefs", artistId: undefined }}
              title="Decision Briefs & Reports"
              aria-label="Decision Briefs & Reports"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <FileText className="size-4" />
            </Link>

            <Link
              to="/settings"
              title="Data Sources & Imports"
              aria-label="Data Sources & Imports"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Database className="size-4" />
            </Link>

            <Link
              to="/settings"
              title="Alerts & Notifications"
              aria-label="Alerts & Notifications"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Bell className="size-4" />
            </Link>

            <Link
              to="/settings"
              title="Admin & Settings"
              aria-label="Admin & Settings"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <Settings className="size-4" />
            </Link>

            <ThemeToggle />

            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void supabase.auth.signOut()}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-destructive transition"
            >
              <LogOut className="size-4" />
            </button>
          </div>

          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border px-3 py-1.5 text-xs font-medium">
              Sections
            </summary>
            <nav
              aria-label="All sections"
              className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-56 overflow-y-auto rounded-xl border bg-panel p-2 shadow-xl"
            >
              {destinations.map((destination) => (
                <a
                  key={destination.to}
                  href={destination.to}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm hover:bg-accent",
                    path.startsWith(destination.to) && "bg-accent font-medium",
                  )}
                >
                  {destination.label}
                </a>
              ))}
              <div className="my-1 border-t" />
              <a
                href="/settings"
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                Settings &amp; Sources
              </a>
            </nav>
          </details>
        </header>

        <main className="relative isolate flex-1 overflow-hidden p-4 md:p-6 xl:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_85%_0%,color-mix(in_oklab,var(--cyan)_7%,transparent),transparent_42%),radial-gradient(ellipse_at_5%_35%,color-mix(in_oklab,var(--lime)_5%,transparent),transparent_35%)]"
          />
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
