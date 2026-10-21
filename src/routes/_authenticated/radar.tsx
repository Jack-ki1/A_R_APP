import { createFileRoute } from "@tanstack/react-router";
import { artistsQuery } from "@/lib/artists";
import { RadarOverview } from "@/components/discover/radar-overview";

export const Route = createFileRoute("/_authenticated/radar")({
  head: () => ({
    meta: [
      { title: "Command Centre — Breakout Radar" },
      { name: "description", content: "Today's breakouts and A&R signals." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: RadarPage,
});

function RadarPage() {
  return <RadarOverview />;
}
