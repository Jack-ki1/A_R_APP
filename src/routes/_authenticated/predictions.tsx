import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { artistsQuery } from "@/lib/artists";
import { MODELS, computeIndex } from "@/lib/modules";
import { Panel, DemoBadge, ScoreRing } from "@/components/br-ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/predictions")({
  head: () => ({
    meta: [
      { title: "Predictions — Breakout Radar" },
      { name: "description", content: "Breakout index and model registry." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(artistsQuery),
  component: Predictions,
});

function Predictions() {
  const { data } = useSuspenseQuery(artistsQuery);
  const [mid, setMid] = useState<string>(MODELS[0].id);
  const m = MODELS.find((x) => x.id === mid)!;
  const other = MODELS.find((x) => x.id !== mid)!;
  const rows = data
    .map((a) => ({
      a,
      current: computeIndex(a, m.weights),
      alternate: computeIndex(a, other.weights),
    }))
    .sort((x, y) => (y.current.value ?? -1) - (x.current.value ?? -1));
  return (
    <div className="space-y-4">
      <Panel
        title="Heuristic priority index"
        sub="Unvalidated, demo-backed heuristic rankings. No breakout probabilities or validated model are available."
        action={<DemoBadge />}
      >
        <div className="grid gap-3 md:grid-cols-2">
          {MODELS.map((x) => (
            <button
              key={x.id}
              onClick={() => setMid(x.id)}
              className={`rounded-lg border p-4 text-left ${x.id === mid ? "border-lime glow" : ""}`}
            >
              <div className="flex items-center justify-between">
                <b>{x.name}</b>
                <span className="rounded-full border px-2 text-[11px]">
                  {x.validationStatus.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Validation: {x.validationStatus.replaceAll("_", " ")}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {Object.entries(x.weights).map(([k, w]) => (
                  <span key={k} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                    {k.replace("_", " ")} {Math.round(w * 100)}%
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </Panel>
      <Panel title={`Ranking — ${m.name}`} sub={`Compared against ${other.name}`}>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr>
              <th className="py-2">#</th>
              <th>Artist</th>
              <th>Confidence</th>
              <th>{m.name}</th>
              <th>Δ vs other</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(({ a, current, alternate }, i) => (
              <tr key={a.id}>
                <td className="py-2 num">{current.value == null ? "—" : i + 1}</td>
                <td>
                  <Link to="/artists/$id" params={{ id: a.id }} className="hover:text-lime">
                    {a.name}
                  </Link>
                </td>
                <td className="num text-muted-foreground">
                  {Math.round(current.coverage * 100)}% feature coverage
                </td>
                <td>
                  {current.value == null ? (
                    "Insufficient evidence"
                  ) : (
                    <ScoreRing value={current.value} size={32} />
                  )}
                </td>
                <td
                  className={`num ${current.value != null && alternate.value != null && current.value - alternate.value >= 0 ? "text-lime" : "text-amber"}`}
                >
                  {current.value != null && alternate.value != null
                    ? (current.value - alternate.value > 0 ? "+" : "") +
                      (current.value - alternate.value)
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Feature coverage is shown for each row; incomplete inputs do not receive a rescaled index.
        </p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => setMid(other.id)}>
          Switch to {other.name}
        </Button>
      </Panel>
    </div>
  );
}
