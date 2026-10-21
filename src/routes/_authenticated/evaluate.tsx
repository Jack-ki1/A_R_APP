import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArtisticReviewTab } from "@/components/evaluate/artistic-review-tab";
import { PredictTab } from "@/components/evaluate/predict-tab";
import { BacktestingTab } from "@/components/evaluate/backtesting-tab";

export const Route = createFileRoute("/_authenticated/evaluate")({
  head: () => ({
    meta: [
      { title: "Evaluate — Breakout Radar" },
      { name: "description", content: "Artistic reviews, governed predictions, and backtesting." },
    ],
  }),
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    tab?: string | undefined;
    artistId?: string | undefined;
  } => ({
    tab: typeof s["tab"] === "string" ? s["tab"] : undefined,
    artistId: typeof s["artistId"] === "string" ? s["artistId"] : undefined,
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(tableQuery("artistic_reviews")),
    ]),
  component: EvaluatePage,
});

function EvaluatePage() {
  const searchTab = useRouterState({
    select: (s) =>
      typeof s.location.search["tab"] === "string" ? s.location.search["tab"] : undefined,
  });
  const searchArtistId = useRouterState({
    select: (s) =>
      typeof s.location.search["artistId"] === "string" ? s.location.search["artistId"] : undefined,
  });

  const [activeTab, setActiveTab] = useState(searchTab ?? "artistry");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-lime/10 px-2 py-0.5 text-xs font-semibold text-lime">
            Stage 3
          </span>
          <h1 className="text-2xl font-bold">Evaluate Workspace</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Assess creative merit through human artistic scoring, inspect model readiness, and review
          backtesting protocols.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="artistry">Artistic Review</TabsTrigger>
          <TabsTrigger value="predict">Predict</TabsTrigger>
          <TabsTrigger value="backtesting">Backtesting</TabsTrigger>
        </TabsList>

        <TabsContent value="artistry">
          <ArtisticReviewTab initialArtistId={searchArtistId} />
        </TabsContent>
        <TabsContent value="predict">
          <PredictTab />
        </TabsContent>
        <TabsContent value="backtesting">
          <BacktestingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
