import { createFileRoute, redirect } from "@tanstack/react-router";
import { CasesTab } from "@/components/decide/cases-tab";

export const Route = createFileRoute("/_authenticated/integrity")({
  head: () => ({
    meta: [
      { title: "Growth Integrity — Breakout Radar" },
      { name: "description", content: "Review suspicious growth cases." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/decide", search: { tab: "cases", artistId: undefined } });
  },
  component: IntegrityRedirectPage,
});

function IntegrityRedirectPage() {
  return <CasesTab />;
}
