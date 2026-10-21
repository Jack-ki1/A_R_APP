import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
import { Route as ShellRoute } from "@/routes/_authenticated/route";
import { Route as AnalyseRoute } from "@/routes/_authenticated/analyse";
import { Route as EvaluateRoute } from "@/routes/_authenticated/evaluate";
import { Route as DecideRoute } from "@/routes/_authenticated/decide";
import { Route as DevelopRoute } from "@/routes/_authenticated/develop";
import { IS_MODEL_APPROVED } from "@/lib/ml";

const db = vi.hoisted(() => ({
  artists: [] as unknown[],
  saved_searches: [] as unknown[],
  metric_observations: [] as unknown[],
  audience_snapshots: [] as unknown[],
  artistic_reviews: [] as unknown[],
  integrity_cases: [] as unknown[],
  dev_tasks: [] as unknown[],
  audit_log: [] as unknown[],
  data_sources: [] as unknown[],
  user_roles: [{ role: "head_of_ar" }] as unknown[],
}));

vi.mock("@/integrations/supabase/client", () => {
  function from(table: string) {
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
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
        getSession: () => Promise.resolve({ data: { session: { user: { id: "test-user" } } } }),
        getUser: () => Promise.resolve({ data: { user: { id: "test-user" } } }),
        signOut: () => Promise.resolve({ error: null }),
      },
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

type PageComponent = () => ReactNode;

function pageComponent(route: { options: { component?: unknown } }): PageComponent {
  return route.options.component as PageComponent;
}

function renderStage(component: PageComponent) {
  const rootRoute = createRootRoute({ component: Outlet });
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/", component });
  const childRoutes = [
    { path: "/discover" as const },
    { path: "/analyse" as const },
    { path: "/evaluate" as const },
    { path: "/decide" as const },
    { path: "/develop" as const },
    { path: "/settings" as const },
    { path: "/artists/$id" as const },
    { path: "/pipeline" as const },
    { path: "/audience" as const },
    { path: "/integrity" as const },
    { path: "/ugc" as const },
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
  db.artists = [
    makeArtist({
      id: "artist-1",
      name: "Ayra Test",
      country: "Nigeria",
      pipeline_stage: "watchlist",
    }),
  ];
  db.artistic_reviews = [];
  db.integrity_cases = [];
  db.dev_tasks = [];
});

describe("Five-Stage Workflow Architecture", () => {
  it("renders exactly five primary sections in the main navigation", async () => {
    renderStage(pageComponent(ShellRoute));
    const nav = await screen.findByRole("navigation", { name: "Main" });
    const links = withinNavLinks(nav);

    expect(links).toEqual(["Discover", "Analyse", "Evaluate", "Decide", "Develop"]);
  });

  it("renders the Analyse workspace with multi-dimensional tabs", async () => {
    renderStage(pageComponent(AnalyseRoute));
    expect(await screen.findByRole("heading", { name: "Analyse Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Audience" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "UGC & Social" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Growth Integrity" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Markets" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Catalogue" })).toBeInTheDocument();
  });

  it("renders the Evaluate workspace with Artistic Review, Predict, and Backtesting", async () => {
    renderStage(pageComponent(EvaluateRoute));
    expect(await screen.findByRole("heading", { name: "Evaluate Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Artistic Review" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Predict" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Backtesting" })).toBeInTheDocument();
    expect(await screen.findByText(/Signing gate pending/i)).toBeInTheDocument();
  });

  it("enforces ML governance policy: synthetic baseline model is not approved for operational decisions", () => {
    expect(IS_MODEL_APPROVED).toBe(false);
  });

  it("renders the Decide workspace with pipeline and decision tabs", async () => {
    renderStage(pageComponent(DecideRoute));
    expect(await screen.findByRole("heading", { name: "Decide Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pipeline Board" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Decision Queue" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Integrity Cases" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Decision Briefs" })).toBeInTheDocument();
  });

  it("renders the Develop workspace with programs and tasks", async () => {
    renderStage(pageComponent(DevelopRoute));
    expect(await screen.findByRole("heading", { name: "Develop Workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Programs Blueprint" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Action Items & Tasks" })).toBeInTheDocument();
  });
});

function withinNavLinks(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("a")).map((a) => a.textContent?.trim() ?? "");
}
