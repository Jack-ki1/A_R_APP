import { createFileRoute, redirect } from "@tanstack/react-router";
import { UgcTab } from "@/components/analyse/ugc-tab";

export const Route = createFileRoute("/_authenticated/ugc")({
  head: () => ({
    meta: [
      { title: "UGC Intelligence — Breakout Radar" },
      { name: "description", content: "Authorized user-generated content evidence." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/analyse", search: { tab: "ugc", artistId: undefined } });
  },
  component: UgcRedirectPage,
});

function UgcRedirectPage() {
  return <UgcTab />;
}
