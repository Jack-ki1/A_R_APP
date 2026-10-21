import { useQuery } from "@tanstack/react-query";
import { Panel } from "@/components/br-ui";
import { getModelMetadata } from "@/lib/ml.functions";
import { AlertCircle, ShieldAlert, Cpu } from "lucide-react";

export function PredictTab() {
  const modelQuery = useQuery({
    queryKey: ["ml-model"],
    queryFn: () => getModelMetadata(),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <Panel
        title="Predictive Modelling & Breakout Forecasting"
        sub="Statistical forecasting of breakout probability across specific target horizons. Governed by evidence verification and strict validation gates."
      >
        <div className="rounded-lg border border-amber/40 bg-amber/5 p-4 text-sm text-foreground">
          <div className="flex items-center gap-2 font-bold text-amber">
            <ShieldAlert className="size-5" />
            Operational Policy: Research-Only Prototype Quarantined
          </div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            The baseline logistic model was trained on an authored synthetic demo dataset
            (`ml/train.py`). Per label policy, synthetic demo models are{" "}
            <strong>
              strictly disabled from operational scoring, ranking, and signing decisions
            </strong>
            . True breakout prediction requires a signed model artifact trained on verified
            historical outcomes with chronological holdout validation.
          </p>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Model Architecture & Verification Gates"
          sub="Current model metadata and governance prerequisites."
        >
          {modelQuery.isPending && (
            <p className="text-sm text-muted-foreground">Inspecting model registry...</p>
          )}
          {modelQuery.isError && (
            <p className="text-sm text-destructive">
              Model registry unreachable:{" "}
              {modelQuery.error instanceof Error ? modelQuery.error.message : ""}
            </p>
          )}
          {modelQuery.data && (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground">Model Status</dt>
                  <dd className="mt-1 font-bold text-amber">Quarantined (Research Only)</dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground">Version</dt>
                  <dd className="mt-1 font-mono font-semibold text-foreground">
                    {modelQuery.data.version}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground">Training Dataset</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {modelQuery.data.trainingData}
                  </dd>
                </div>
                <div className="rounded-lg border p-3">
                  <dt className="text-muted-foreground">Synthetic ROC-AUC</dt>
                  <dd className="mt-1 font-semibold text-muted-foreground">
                    {modelQuery.data.aucOnSynthetic} (Toy)
                  </dd>
                </div>
              </dl>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Engineered Feature Schema ({modelQuery.data.features.length})
                </h4>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {modelQuery.data.features.map((f) => (
                    <li
                      key={f}
                      className="rounded border px-2 py-0.5 text-[11px] font-mono text-muted-foreground"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Operational Promotion Requirements"
          sub="Criteria before predictions can be unlocked in A&R workflows."
        >
          <ul className="space-y-3 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber mt-0.5" />
              <span>
                <strong className="text-foreground">Real Historical Outcome Labels:</strong>{" "}
                Point-in-time dataset documenting whether African emerging artists (&lt;100k initial
                audience) reached predefined breakout thresholds within 12 months.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber mt-0.5" />
              <span>
                <strong className="text-foreground">Chronological Rolling-Origin Split:</strong>{" "}
                Validation on future time periods strictly preventing lookahead and hindsight
                leakage.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 text-amber mt-0.5" />
              <span>
                <strong className="text-foreground">Governance Sign-Off:</strong> Model review by
                Head of A&R and Head of Data Science verifying calibration, precision@K, and absence
                of demographic bias.
              </span>
            </li>
          </ul>

          <div className="mt-6 rounded-lg border border-dashed p-4 text-center">
            <Cpu className="mx-auto size-6 text-muted-foreground mb-2" />
            <div className="text-xs font-semibold text-foreground">Operational Scoring Locked</div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Automated scoring runs are suspended until an approved, trained model artifact is
              registered.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
