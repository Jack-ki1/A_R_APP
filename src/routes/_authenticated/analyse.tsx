import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { artistsQuery, snapshotsQuery } from "@/lib/artists";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OverviewTab } from "@/components/analyse/overview-tab";
import { AudienceTab } from "@/components/analyse/audience-tab";
import { UgcTab } from "@/components/analyse/ugc-tab";
import { IntegrityTab } from "@/components/analyse/integrity-tab";
import { MarketsTab } from "@/components/analyse/markets-tab";
import { CatalogueTab } from "@/components/analyse/catalogue-tab";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/analyse")({
  head: () => ({
    meta: [
      { title: "Analyse — Breakout Radar" },
      {
        name: "description",
        content: "Understand artist growth, audience evolution, UGC, and integrity.",
      },
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
      context.queryClient.ensureQueryData(snapshotsQuery),
    ]),
  component: AnalysePage,
});

function AnalysePage() {
  const searchTab = useRouterState({
    select: (s) =>
      typeof s.location.search["tab"] === "string" ? s.location.search["tab"] : undefined,
  });
  const searchArtistId = useRouterState({
    select: (s) =>
      typeof s.location.search["artistId"] === "string" ? s.location.search["artistId"] : undefined,
  });

  const [activeTab, setActiveTab] = useState(searchTab ?? "overview");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-lime/10 px-2 py-0.5 text-xs font-semibold text-lime">
            Stage 2
          </span>
          <h1 className="text-2xl font-bold">Analyse Workspace</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Investigate artist trajectories, audience cohort evolution, UGC signals, and data
          integrity.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-3 sm:flex sm:flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="audience">Audience</TabsTrigger>
          <TabsTrigger value="ugc">UGC & Social</TabsTrigger>
          <TabsTrigger value="integrity">Growth Integrity</TabsTrigger>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab initialArtistId={searchArtistId} />
        </TabsContent>
        <TabsContent value="audience">
          <AudienceTab selectedArtistId={searchArtistId} />
        </TabsContent>
        <TabsContent value="ugc">
          <UgcTab />
        </TabsContent>
        <TabsContent value="integrity">
          <IntegrityTab />
        </TabsContent>
        <TabsContent value="markets">
          <MarketsTab />
        </TabsContent>
        <TabsContent value="catalogue">
          <CatalogueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
