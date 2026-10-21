import { createFileRoute, redirect } from "@tanstack/react-router";
import { TasksTab } from "@/components/develop/tasks-tab";

export const Route = createFileRoute("/_authenticated/development")({
  head: () => ({
    meta: [
      { title: "Artist Development — Breakout Radar" },
      { name: "description", content: "Development plans for artists in progress." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/develop", search: { tab: "tasks", artistId: undefined } });
  },
  component: DevelopmentRedirectPage,
});

function DevelopmentRedirectPage() {
  return <TasksTab />;
}
