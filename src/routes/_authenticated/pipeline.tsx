import { createFileRoute, redirect } from "@tanstack/react-router";
import { PipelineTab } from "@/components/decide/pipeline-tab";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "A&R Pipeline — Breakout Radar" },
      { name: "description", content: "Move artists from discovery to signing." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/decide", search: { tab: "pipeline", artistId: undefined } });
  },
  component: PipelineRedirectPage,
});

function PipelineRedirectPage() {
  return <PipelineTab />;
}
