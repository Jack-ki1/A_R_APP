import { createFileRoute } from "@tanstack/react-router";
import { Panel } from "@/components/br-ui";

export const Route = createFileRoute("/_authenticated/predictions")({
  head: () => ({
    meta: [
      { title: "Model readiness — Breakout Radar" },
      { name: "description", content: "Model registry and evidence readiness." },
    ],
  }),
  component: Predictions,
});

function Predictions() {
  return (
    <div className="space-y-4">
      <Panel
        title="Breakout model registry"
        sub="No trained, validated, or deployed model is available. No breakout probabilities are produced."
      >
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
          <div className="font-semibold text-amber">Status: not trained</div>
          <p className="mt-2 text-sm text-muted-foreground">
            The current workspace has no approved point-in-time feature history, agreed outcome
            labels, or held-out evaluation runs. Hand-authored score fields are not accepted as
            model inputs.
          </p>
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">Training data rights</dt>
            <dd>Not confirmed</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">Historical outcomes</dt>
            <dd>Unavailable</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">Point-in-time feature snapshots</dt>
            <dd>Not collected</dd>
          </div>
          <div className="rounded-lg border p-3">
            <dt className="text-muted-foreground">Validation report</dt>
            <dd>Unavailable</dd>
          </div>
        </dl>
      </Panel>
      <Panel title="Readiness gates">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            Agree on one measurable outcome, observation horizon, territories, genres, and scouting
            capacity.
          </li>
          <li>
            Confirm provider licenses permit historical retention and model training on derived
            data.
          </li>
          <li>
            Collect timestamped features and outcomes, including unsuccessful and censored cases.
          </li>
          <li>
            Run chronological held-out comparisons against simple baselines and report coverage,
            uncertainty, and subgroup performance.
          </li>
        </ol>
      </Panel>
    </div>
  );
}
