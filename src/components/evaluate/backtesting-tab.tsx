import { Panel } from "@/components/br-ui";

export function BacktestingTab() {
  return (
    <div className="space-y-6">
      <Panel
        title="Historical Backtesting & Experiment Registry"
        sub="Systematic simulation of historical scouting decisions against realized outcomes."
      >
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 text-sm">
          <div className="font-semibold text-amber">No Approved Historical Backtest Available</div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Prior demonstration charts simulated outcomes on synthetic data curves without empirical
            scouting decisions or real career histories. In accordance with evidence discipline,
            synthetic error charts have been decommissioned.
          </p>
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel
          title="Backtesting Protocol Standards"
          sub="Scientific rigor required for reproducible A&R backtesting."
        >
          <ul className="list-disc space-y-2.5 pl-5 text-xs text-muted-foreground">
            <li>
              <strong className="text-foreground">Strict As-Of Cutoff Timestamps:</strong> Features
              must be computed strictly using data available before the cutoff date, preventing
              hindsight bias.
            </li>
            <li>
              <strong className="text-foreground">Pre-declared Target Outcomes:</strong> Unambiguous
              target definitions (e.g., reaching 500k monthly streams or top-50 national charting
              within 12 months).
            </li>
            <li>
              <strong className="text-foreground">Right-Censored & Incomplete Windows:</strong>{" "}
              Explicit handling of artists who left music or whose metrics ceased collection.
            </li>
            <li>
              <strong className="text-foreground">Benchmarking Against Simple Baselines:</strong>{" "}
              Comparison against simple growth-rate ranking and human scout heuristics.
            </li>
          </ul>
        </Panel>

        <Panel
          title="Required Validation Metrics"
          sub="Evaluation criteria for future validated backtest runs."
        >
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground">Precision @ K</dt>
              <dd className="mt-1 font-semibold text-foreground">Scout capacity (K=5, 10)</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground">Recall @ Horizon</dt>
              <dd className="mt-1 font-semibold text-foreground">12-month breakout capture</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground">Brier Score / Calibration</dt>
              <dd className="mt-1 font-semibold text-foreground">Probability reliability</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="text-muted-foreground">Lead Time</dt>
              <dd className="mt-1 font-semibold text-foreground">Months before mainstream peak</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Backtest runs will appear here as immutable experiment artifacts once longitudinal data
            collection is active.
          </p>
        </Panel>
      </div>
    </div>
  );
}
