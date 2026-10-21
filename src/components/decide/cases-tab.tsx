import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, INTEGRITY_LABEL } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, IntegrityChip, Portrait } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const OUTCOMES = ["organic", "paid_promo", "unknown", "suspicious", "confirmed_invalid"] as const;

export function CasesTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { data: cases = [] } = useQuery(tableQuery("integrity_cases"));
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
      toast.success("Case resolved and recorded in audit ledger.");
      ["integrity_cases", "artists"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = cases.filter((c) => !c.is_demo && c.status === tab);

  return (
    <div className="space-y-6">
      <Panel
        title="Integrity Case Disposition"
        sub="Audited case adjudication for flagged candidates. Decisions update artist integrity and are recorded in the immutable audit log."
      >
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "open" ? "default" : "outline"}
            onClick={() => setTab("open")}
          >
            Open cases ({cases.filter((c) => !c.is_demo && c.status === "open").length})
          </Button>
          <Button
            size="sm"
            variant={tab === "resolved" ? "default" : "outline"}
            onClick={() => setTab("resolved")}
          >
            Resolved ({cases.filter((c) => !c.is_demo && c.status === "resolved").length})
          </Button>
        </div>
      </Panel>

      <div className="space-y-4">
        {list.map((c) => {
          const a = artists.find((x) => x.id === c.artist_id);
          return (
            <Panel
              key={c.id}
              title={
                <div className="flex items-center gap-2">
                  {a && (
                    <Portrait
                      seed={a.portrait_seed}
                      name={a.name}
                      isDemo={a.is_demo}
                      className="size-6"
                    />
                  )}
                  <span>{a?.name ?? "Unknown artist"}</span>
                  {a && <IntegrityChip value={a.integrity} />}
                </div>
              }
              sub={c.reason}
            >
              <div className="space-y-3 text-xs">
                <div className="rounded-lg bg-panel p-3 text-muted-foreground">
                  Case opened: {new Date(c.created_at).toLocaleDateString()}
                  {c.evidence_json &&
                    Array.isArray(c.evidence_json) &&
                    c.evidence_json.length > 0 && (
                      <div className="mt-1">Evidence citations: {c.evidence_json.join(", ")}</div>
                    )}
                </div>

                {tab === "open" && (
                  <div className="space-y-3 border-t pt-3">
                    <Textarea
                      placeholder="Required rationale: cite specific telemetry or confirmed third-party explanation..."
                      value={note[c.id] ?? ""}
                      onChange={(e) => setNote({ ...note, [c.id]: e.target.value })}
                      rows={2}
                      className="text-xs"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">Select disposition:</span>
                      {OUTCOMES.map((outcome) => (
                        <Button
                          key={outcome}
                          size="sm"
                          variant="outline"
                          disabled={resolve.isPending || (note[c.id]?.trim().length ?? 0) < 3}
                          onClick={() => resolve.mutate({ id: c.id, outcome })}
                          className="capitalize"
                        >
                          Mark {INTEGRITY_LABEL[outcome]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          );
        })}

        {list.length === 0 && (
          <Panel title={tab === "open" ? "No open cases" : "No resolved cases"}>
            <p className="text-xs text-muted-foreground">
              {tab === "open"
                ? "All integrity surveillance cases have been resolved."
                : "No resolved cases in record."}
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
