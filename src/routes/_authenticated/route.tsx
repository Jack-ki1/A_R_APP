import {
  createFileRoute,
  Outlet,
  Link,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Compass, Gauge, Search, Settings, LogOut } from "lucide-react";
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

const NAV = [
  { to: "/radar", label: "Home", icon: Gauge },
  { to: "/discover", label: "Find artists", icon: Search, match: ["/artists"] },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Shell() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const destinations = NAV.map((group) => ({ to: group.to, label: group.label }));

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Logo className="mb-8 px-2" />
        <nav className="space-y-1 overflow-y-auto" aria-label="Main">
          {NAV.map((group) => {
            const active =
              path.startsWith(group.to) ||
              ("match" in group && group.match.some((prefix) => path.startsWith(prefix)));
            return (
              <Link
                key={group.to}
                to={group.to}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <group.icon className="size-4 shrink-0" /> {group.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-lg bg-sidebar-accent p-3 text-xs">
          <div className="font-medium">A&R Team</div>
          <div className="text-muted-foreground">Internal use only</div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <form
            className="relative max-w-md flex-1"
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
              className="h-9 w-full rounded-lg border bg-panel pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </form>
          <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <Compass className="size-3.5" /> Africa · internal workspace
            <span className="mx-2 h-4 w-px bg-border" />
            Evidence-led workspace · metadata lookup and authorized imports
          </div>
          <ThemeToggle />
          <button
            type="button"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => void supabase.auth.signOut()}
            className="rounded-lg p-2 hover:bg-accent"
          >
            <LogOut className="size-4" />
          </button>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border px-3 py-2 text-xs font-medium">
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
            </nav>
          </details>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
