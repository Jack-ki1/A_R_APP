import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgramsTab } from "@/components/develop/programs-tab";
import { TasksTab } from "@/components/develop/tasks-tab";
import { CampaignsTab } from "@/components/develop/campaigns-tab";
import { OutcomesTab } from "@/components/develop/outcomes-tab";

export const Route = createFileRoute("/_authenticated/develop")({
  head: () => ({
    meta: [
      { title: "Develop — Breakout Radar" },
      {
        name: "description",
        content: "Artist development programs, releases, brand building, and measured outcomes.",
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
      context.queryClient.ensureQueryData(tableQuery("dev_tasks")),
    ]),
  component: DevelopPage,
});

function DevelopPage() {
  const searchTab = useRouterState({
    select: (s) =>
      typeof s.location.search["tab"] === "string" ? s.location.search["tab"] : undefined,
  });
  const searchArtistId = useRouterState({
    select: (s) =>
      typeof s.location.search["artistId"] === "string" ? s.location.search["artistId"] : undefined,
  });

  const [activeTab, setActiveTab] = useState(searchTab ?? "programs");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-lime/10 px-2 py-0.5 text-xs font-semibold text-lime">
            Stage 5
          </span>
          <h1 className="text-2xl font-bold">Develop Workspace</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Build artist brands, manage developmental tasks, run release experiments, and evaluate
          measured outcomes.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="programs">Programs Blueprint</TabsTrigger>
          <TabsTrigger value="tasks">Action Items &amp; Tasks</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="outcomes">Measured Outcomes</TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <ProgramsTab initialArtistId={searchArtistId} />
        </TabsContent>
        <TabsContent value="tasks">
          <TasksTab initialArtistId={searchArtistId} />
        </TabsContent>
        <TabsContent value="campaigns">
          <CampaignsTab />
        </TabsContent>
        <TabsContent value="outcomes">
          <OutcomesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
