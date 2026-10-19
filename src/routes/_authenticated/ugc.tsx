import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/br-ui";

export const Route = createFileRoute("/_authenticated/ugc")({
  head: () => ({
    meta: [
      { title: "UGC Intelligence — Breakout Radar" },
      { name: "description", content: "Authorized user-generated content evidence." },
    ],
  }),
  component: Ugc,
});

function Ugc() {
  return (
    <div className="space-y-4">
      <Panel
        title="UGC monitoring is not connected"
        sub="No authorized platform feed or artist-supplied UGC export is configured in this workspace."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            There are no verified UGC posts, creator counts, reach figures, or velocity measures to
            show. Demo event fixtures and hand-entered scores are excluded from this page.
          </p>
          <p>
            Connect a licensed or explicitly authorized source before monitoring. The ingestion
            workflow must preserve platform post IDs, source timestamps, match evidence, paid or
            official attribution, coverage, and retention permissions. TikTok and Instagram remain
            unavailable until an approved access path is documented.
          </p>
          <p>
            Creator identities and demographics will not be inferred from public posts. Any future
            creator reporting must follow the source terms and the label’s privacy policy.
          </p>
        </div>
      </Panel>
      <Panel
        title="Available evidence"
        sub="A connected source will appear here with its coverage and freshness."
      >
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Source status</dt>
            <dd>Not connected</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Observed posts</dt>
            <dd>Unavailable</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Creator reach/diversity</dt>
            <dd>Insufficient evidence</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
