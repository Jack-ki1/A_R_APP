import { createFileRoute, redirect } from "@tanstack/react-router";
import { AudienceTab } from "@/components/analyse/audience-tab";

export const Route = createFileRoute("/_authenticated/audience")({
  head: () => ({
    meta: [
      { title: "Audience Morphing — Breakout Radar" },
      { name: "description", content: "How artist audiences are changing over time." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/analyse", search: { tab: "audience", artistId: undefined } });
  },
  component: AudienceRedirectPage,
});

function AudienceRedirectPage() {
  return <AudienceTab />;
}
