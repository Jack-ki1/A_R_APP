import { Panel } from "@/components/br-ui";

export function BacktestingSection() {
  return (
    <div className="space-y-4">
      <Panel title="Historical validation" sub="No validated backtest is available.">
        <div className="rounded-lg border border-amber/30 bg-amber/5 p-4 text-sm">
          <div className="font-semibold text-amber">Insufficient historical evidence</div>
          <p className="mt-2 text-muted-foreground">
            The former chart extrapolated synthetic demonstration series. It did not test whether
            scouting decisions identified later outcomes, so its error metrics have been removed.
          </p>
        </div>
      </Panel>
      <Panel title="Evidence required for a backtest">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Timestamped snapshots available as of each historical cutoff.</li>
          <li>
            A defined outcome with reliable observation dates and censored or unknown labels
            preserved.
          </li>
          <li>
            Chronological rolling-origin splits, no future information leakage, and immutable run
            settings.
          </li>
          <li>
            Precision and recall at scout capacity, lead time, coverage, market mix, uncertainty,
            and comparison with a simple baseline.
          </li>
        </ul>
      </Panel>
    </div>
  );
}
