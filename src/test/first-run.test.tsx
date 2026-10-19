import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { FIRST_RUN_STEPS, progressStepStates } from "@/lib/first-run";
import { FirstRunChecklist } from "@/components/first-run";

describe("first-run progress model", () => {
  it("starts at artist added and never claims intelligence exists", () => {
    const empty = progressStepStates(false, false);
    expect(empty[0]).toMatchObject({ label: "Artist added", done: false, current: true });
    expect(empty[1]).toMatchObject({ done: false, current: false });
    expect(empty[2]).toMatchObject({ done: false, current: false });

    const identityOnly = progressStepStates(true, false);
    expect(identityOnly[0]).toMatchObject({ done: true, current: false });
    expect(identityOnly[1]).toMatchObject({ done: false, current: true });

    const withEvidence = progressStepStates(true, true);
    expect(withEvidence[0]).toMatchObject({ done: true });
    expect(withEvidence[1]).toMatchObject({ done: true });
    expect(withEvidence[2]).toMatchObject({ done: false, current: true });
  });

  it("documents the six-step onboarding path", () => {
    expect(FIRST_RUN_STEPS).toHaveLength(6);
    expect(FIRST_RUN_STEPS.map((step) => step.title)).toEqual([
      "Find an artist",
      "Verify identity",
      "Add to Radar",
      "View the artist profile",
      "Attach authorized data",
      "Create the first A&R action",
    ]);
  });
});

describe("FirstRunChecklist", () => {
  it("renders an actionable empty state instead of a blank table", async () => {
    const rootRoute = createRootRoute({ component: Outlet });
    const discoverRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/discover",
      component: () => null,
    });
    const sourcesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/sources",
      component: () => null,
    });
    const homeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: () => <FirstRunChecklist />,
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([homeRoute, discoverRoute, sourcesRoute]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);

    expect(
      await screen.findByRole("heading", { name: "Get started with your first artist" }),
    ).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /Find an artist/i })).toHaveAttribute(
      "href",
      "/discover",
    );
    expect(await screen.findByRole("link", { name: /Attach authorized data/i })).toHaveAttribute(
      "href",
      "/sources",
    );
    expect(screen.getByLabelText("Setup progress")).toBeInTheDocument();
    expect(screen.getByText(/nothing to rank/i)).toBeInTheDocument();
  });
});
