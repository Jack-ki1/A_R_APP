import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueueTab } from "@/components/decide/queue-tab";
import { CasesTab } from "@/components/decide/cases-tab";
import { PipelineTab } from "@/components/decide/pipeline-tab";
import { BriefsTab } from "@/components/decide/briefs-tab";

export const Route = createFileRoute("/_authenticated/decide")({
  head: () => ({
    meta: [
      { title: "Decide — Breakout Radar" },
      {
        name: "description",
        content: "A&R decision desk, integrity case resolution, and pipeline governance.",
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
      context.queryClient.ensureQueryData(tableQuery("integrity_cases")),
    ]),
  component: DecidePage,
});

function DecidePage() {
  const searchTab = useRouterState({
    select: (s) =>
      typeof s.location.search["tab"] === "string" ? s.location.search["tab"] : undefined,
  });

  const [activeTab, setActiveTab] = useState(searchTab ?? "pipeline");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-lime/10 px-2 py-0.5 text-xs font-semibold text-lime">
            Stage 4
          </span>
          <h1 className="text-2xl font-bold">Decide Workspace</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Review candidates in the queue, resolve integrity cases, govern stage progression, and
          prepare decision memos.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline Board</TabsTrigger>
          <TabsTrigger value="queue">Decision Queue</TabsTrigger>
          <TabsTrigger value="cases">Integrity Cases</TabsTrigger>
          <TabsTrigger value="briefs">Decision Briefs</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <PipelineTab />
        </TabsContent>
        <TabsContent value="queue">
          <QueueTab />
        </TabsContent>
        <TabsContent value="cases">
          <CasesTab />
        </TabsContent>
        <TabsContent value="briefs">
          <BriefsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
