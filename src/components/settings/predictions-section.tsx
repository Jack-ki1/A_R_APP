import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/br-ui";
import { getModelMetadata } from "@/lib/ml.functions";

export function PredictionsSection() {
  const modelQuery = useQuery({
    queryKey: ["ml-model"],
    queryFn: () => getModelMetadata(),
    retry: false,
  });

  return (
    <div className="space-y-4">
      <Panel
        title="Breakout prediction model"
        sub="A logistic-regression baseline trained on synthetic data. It is unvalidated and must not be used for operational decisions until real outcome data and governance approval are in place."
      >
        {modelQuery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading model metadata…
          </p>
        )}
        {modelQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            Could not load model metadata.{" "}
            {modelQuery.error instanceof Error ? modelQuery.error.message : ""}
          </p>
        )}
        {modelQuery.data && (
          <>
            <div className="rounded-lg border border-amber/30 bg-amber/5 p-4">
              <div className="font-semibold text-amber">Status: unvalidated baseline</div>
              <p className="mt-2 text-sm text-muted-foreground">{modelQuery.data.disclaimer}</p>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Model version</dt>
                <dd>{modelQuery.data.version}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Algorithm</dt>
                <dd>Logistic regression</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Training data</dt>
                <dd>
                  {modelQuery.data.trainingData} ({modelQuery.data.nSamples} samples)
                </dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">AUC (synthetic test set)</dt>
                <dd>{modelQuery.data.aucOnSynthetic}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Trained at</dt>
                <dd>{new Date(modelQuery.data.trainedAt).toLocaleDateString()}</dd>
              </div>
              <div className="rounded-lg border p-3">
                <dt className="text-muted-foreground">Features</dt>
                <dd>{modelQuery.data.features.length}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <h4 className="text-sm font-medium">Input features</h4>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {modelQuery.data.features.map((f) => (
                  <li
                    key={f}
                    className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </Panel>
      <Panel
        title="Predictive scoring operations"
        sub="Governance policy: Bulk operational scoring from synthetic models is locked."
      >
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 text-xs">
          <div className="font-semibold text-amber">Operational scoring disabled</div>
          <p className="mt-1 text-muted-foreground leading-relaxed">
            Per A&amp;R evidence governance policy, synthetic models cannot be used to generate
            operational scores or influence signing decisions. View model status and validation
            criteria under <strong>Evaluate → Predict</strong>.
          </p>
        </div>
      </Panel>
      <Panel title="Readiness gates for an operational model">
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
          <li>
            Replace the synthetic training set with real labelled data, retrain, and complete
            governance review before any operational deployment.
          </li>
        </ol>
      </Panel>
    </div>
  );
}
