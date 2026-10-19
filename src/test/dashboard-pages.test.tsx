import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { makeArtist } from "@/test/fixtures";
import { Route as DiscoverRoute } from "@/routes/_authenticated/discover";
import { Route as RadarRoute } from "@/routes/_authenticated/radar";

const db = vi.hoisted(() => ({
  artists: [] as unknown[],
  saved_searches: [] as unknown[],
  metric_observations: [] as unknown[],
  audience_snapshots: [] as unknown[],
  audit_log: [] as unknown[],
  data_sources: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client", () => {
  function from(table: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
      delete: () => builder,
      then: (
        onFulfilled: (value: { data: unknown[]; count: number; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) =>
        Promise.resolve({
          data: db[table as keyof typeof db] ?? [],
          count: (db[table as keyof typeof db] ?? []).length,
          error: null,
        }).then(onFulfilled, onRejected),
    };
    return builder;
  }
  return {
    isSupabaseConfigured: () => true,
    supabase: {
      from,
      auth: {
        getSession: () => Promise.resolve({ data: { session: null } }),
        getUser: () => Promise.resolve({ data: { user: null } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

type PageComponent = () => ReactNode;

/** Route files keep their page components private; tests mount them via the route options. */
function pageComponent(route: { options: { component?: unknown } }): PageComponent {
  return route.options.component as PageComponent;
}

function renderPage(component: PageComponent) {
  const rootRoute = createRootRoute({ component: Outlet });
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component });
  const childRoutes = [
    { path: "/discover" as const },
    { path: "/sources" as const },
    { path: "/pipeline" as const },
    { path: "/artists/$id" as const },
    { path: "/audience" as const },
    { path: "/radar" as const },
  ].map(({ path }) =>
    createRoute({ getParentRoute: () => rootRoute, path, component: () => null }),
  );
  const router = createRouter({
    routeTree: rootRoute.addChildren([homeRoute, ...childRoutes]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  db.artists = [];
  db.saved_searches = [];
  db.metric_observations = [];
  db.audience_snapshots = [];
  db.audit_log = [];
  db.data_sources = [];
});

describe("Discover page", () => {
  beforeEach(() => {
    db.artists = [
      makeArtist({ name: "Newcomer" }),
      makeArtist({ name: "Rising", growth_30d: 42, expected_growth_30d: 5 }),
      makeArtist({ name: "Flagged", integrity: "suspicious" }),
      makeArtist({ name: "Fixture", is_demo: true }),
    ];
  });

  it("lists unscored, unmeasured artists by default", async () => {
    renderPage(pageComponent(DiscoverRoute));
    expect(await screen.findByText("Newcomer")).toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Flagged")).toBeInTheDocument();
    expect(screen.queryByText("Fixture")).not.toBeInTheDocument();
    const allTab = screen.getByRole("button", { name: /All tracked/ });
    expect(allTab.textContent).toContain("3");
    expect(allTab.getAttribute("aria-pressed")).toBe("true");
  });

  it("moves unmeasured artists out of Growth-qualified without dropping them", async () => {
    renderPage(pageComponent(DiscoverRoute));
    await screen.findByText("Newcomer");
    fireEvent.click(screen.getByRole("button", { name: /Growth-qualified/ }));
    expect(screen.queryByText("Newcomer")).not.toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Needs first observation/ }));
    expect(screen.getByText("Newcomer")).toBeInTheDocument();
    expect(screen.queryByText("Rising")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Under review/ }));
    expect(screen.getByText("Flagged")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /All tracked/ }));
    expect(screen.getByText("Newcomer")).toBeInTheDocument();
  });

  it("only excludes unknown metrics when a threshold is switched on", async () => {
    renderPage(pageComponent(DiscoverRoute));
    await screen.findByText("Newcomer");
    expect(
      screen.getByText(/Unknown momentum or growth never hides an artist/),
    ).toBeInTheDocument();
    // Switching the growth threshold on is the only way unmeasured artists disappear.
    fireEvent.click(screen.getByLabelText("Apply 30-day growth threshold"));
    expect(screen.queryByText("Newcomer")).not.toBeInTheDocument();
    expect(screen.getByText("Rising")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(await screen.findByText("Newcomer")).toBeInTheDocument();
  });
});

describe("Radar page", () => {
  it("shows the first-run on-ramp instead of a blank ranking table", async () => {
    renderPage(pageComponent(RadarRoute));
    expect(
      await screen.findByRole("heading", { name: "Get started with your first artist" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Start your first scouting report")).toBeInTheDocument();
    const monitoredLabel = screen.getByText("Artists monitored");
    expect(monitoredLabel.previousElementSibling).toHaveTextContent("0");
    expect(screen.getByText(/Breakouts \(no growth baseline yet\)/)).toBeInTheDocument();
    expect(await screen.findByText("No observations yet")).toBeInTheDocument();
    expect(screen.getByText("Unvalidated model")).toBeInTheDocument();
    expect(screen.queryByText(/No eligible candidates/)).not.toBeInTheDocument();
  });

  it("guides the operator to attach evidence after the first artist is added", async () => {
    db.artists = [makeArtist({ name: "First Artist" })];
    renderPage(pageComponent(RadarRoute));
    expect(await screen.findByRole("heading", { name: "Needs evidence" })).toBeInTheDocument();
    expect(screen.getByText(/1 artist monitored, 0 authorized observations/)).toBeInTheDocument();
    expect(await screen.findByText("First Artist")).toBeInTheDocument();
    expect(screen.getByText(/awaiting integrity verification/)).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Get started with your first artist" }),
    ).toBeNull();
  });
});
