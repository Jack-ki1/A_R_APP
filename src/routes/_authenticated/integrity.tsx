import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, INTEGRITY_LABEL } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, DemoBadge, IntegrityChip, Portrait } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/integrity")({
  head: () => ({
    meta: [
      { title: "Growth Integrity — Breakout Radar" },
      { name: "description", content: "Review suspicious growth cases." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(artistsQuery),
      context.queryClient.ensureQueryData(tableQuery("integrity_cases")),
    ]),
  component: Integrity,
});

const OUTCOMES = ["organic", "paid_promo", "unknown", "suspicious", "confirmed_invalid"] as const;

function Integrity() {
  const { data: artists } = useSuspenseQuery(artistsQuery);
  const { data: cases } = useSuspenseQuery(tableQuery("integrity_cases"));
  const qc = useQueryClient();
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [note, setNote] = useState<Record<string, string>>({});
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  const resolve = useMutation({
    mutationFn: async ({ id, outcome }: { id: string; outcome: (typeof OUTCOMES)[number] }) => {
      const rationale = note[id]?.trim() ?? "";
      if (rationale.length < 3)
        throw new Error("Add the evidence-based reason for this decision first.");
      const evidenceIds = (evidence[id] ?? "")
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      const { error } = await supabase.rpc("resolve_integrity_case", {
        p_case_id: id,
        p_outcome: outcome,
        p_reason: rationale,
        p_evidence_ids: evidenceIds,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Case resolved");
      ["integrity_cases", "artists"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const list = cases.filter((c) => !c.is_demo && c.status === tab);
  return (
    <Panel
      title="Growth Integrity case queue"
      sub="A person decides every outcome; flags are prompts, not verdicts."
      action={
        <div className="flex gap-1">
          {(["open", "resolved"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "ghost"}
              onClick={() => setTab(t)}
            >
              {t === "open" ? "Open" : "Resolved"} (
              {cases.filter((c) => !c.is_demo && c.status === t).length})
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-3">
        {list.map((c) => {
          const a = artists.find((x) => x.id === c.artist_id);
          if (!a) return null;
          return (
            <article key={c.id} className="rounded-lg border bg-panel-raised p-4">
              <div className="flex items-center gap-3">
                <Portrait
                  seed={a.portrait_seed}
                  name={a.name}
                  isDemo={a.is_demo}
                  className="size-9"
                />
                <Link
                  to="/artists/$id"
                  params={{ id: a.id }}
                  className="font-medium hover:text-lime"
                >
                  {a.name}
                </Link>
                <IntegrityChip value={a.integrity} />
                {c.is_demo && <DemoBadge />}
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 text-sm">{c.reason}</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {(c.signals as string[]).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              {c.status === "open" ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Required decision rationale and evidence summary"
                    value={note[c.id] ?? ""}
                    onChange={(e) => setNote({ ...note, [c.id]: e.target.value })}
                    className="min-h-14 text-sm"
                  />
                  <Textarea
                    placeholder="Evidence observation IDs or source URLs (one per line)"
                    value={evidence[c.id] ?? ""}
                    onChange={(e) => setEvidence({ ...evidence, [c.id]: e.target.value })}
                    className="min-h-12 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    {OUTCOMES.map((o) => (
                      <Button
                        key={o}
                        size="sm"
                        variant="outline"
                        disabled={
                          (note[c.id]?.trim().length ?? 0) < 3 ||
                          (o === "confirmed_invalid" && !evidence[c.id]?.trim().length) ||
                          resolve.isPending
                        }
                        onClick={() => resolve.mutate({ id: c.id, outcome: o })}
                      >
                        Mark {INTEGRITY_LABEL[o]}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-lime">Outcome: {c.resolution}</p>
              )}
            </article>
          );
        })}
        {!list.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">No {tab} cases.</p>
        )}
      </div>
    </Panel>
  );
}
