import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery, STAGES, type Artist, type PipelineStage } from "@/lib/artists";
import { Portrait, IntegrityChip, DemoBadge } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PipelineTab() {
  const { data: artists = [] } = useQuery(artistsQuery);
  const qc = useQueryClient();

  const [over, setOver] = useState<PipelineStage | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetArtist, setTargetArtist] = useState<Artist | null>(null);
  const [targetStage, setTargetStage] = useState<PipelineStage | null>(null);
  const [rationale, setRationale] = useState("");
  const [evidenceRefs, setEvidenceRefs] = useState("");

  const move = useMutation({
    mutationFn: async ({
      id,
      stage,
      rationaleText,
      refs,
    }: {
      id: string;
      stage: PipelineStage;
      rationaleText: string;
      refs: string[];
    }) => {
      const { error } = await supabase.rpc("move_artist_stage", {
        p_artist_id: id,
        p_stage: stage,
        p_rationale: rationaleText,
        p_evidence_refs: refs,
      });
      if (error) throw error;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ["artists"] });
      const prev = qc.getQueryData<Artist[]>(["artists"]);
      qc.setQueryData<Artist[]>(["artists"], (old) =>
        old?.map((a) => (a.id === id ? { ...a, pipeline_stage: stage } : a)),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["artists"], ctx.prev);
      toast.error(e.message);
    },
    onSuccess: (_d, v) => {
      toast.success(`Moved to ${STAGES.find((s) => s.id === v.stage)?.label}`);
      setModalOpen(false);
      setTargetArtist(null);
      setTargetStage(null);
      setRationale("");
      setEvidenceRefs("");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
    },
  });

  const promptMove = (artist: Artist, stage: PipelineStage) => {
    if (artist.pipeline_stage === stage) return;
    setTargetArtist(artist);
    setTargetStage(stage);
    setRationale(artist.next_action ?? "");
    setEvidenceRefs("");
    setModalOpen(true);
  };

  const handleConfirmMove = () => {
    if (!targetArtist || !targetStage) return;
    if (rationale.trim().length < 3) {
      toast.error("Please provide a substantive rationale (at least 3 characters).");
      return;
    }
    const refs = evidenceRefs
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    move.mutate({
      id: targetArtist.id,
      stage: targetStage,
      rationaleText: rationale.trim(),
      refs,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">A&R Decision Pipeline</h2>
          <p className="text-xs text-muted-foreground">
            Audited stage progression from discovery to signing. Transitions require an
            evidence-based rationale.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-4" />
          Signing gate: 2 distinct reviewer evaluations &amp; Head of A&R role required
        </div>
      </div>

      <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const col = artists.filter((a) => a.pipeline_stage === s.id);
          const isOver = over === s.id;
          return (
            <div
              key={s.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(s.id);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const item = artists.find((a) => a.id === id);
                if (item) promptMove(item, s.id);
              }}
              className={cn(
                "flex flex-col rounded-xl border bg-panel p-3 transition",
                isOver && "border-lime ring-2 ring-lime/20",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider">{s.label}</span>
                <span className="rounded-full bg-panel-raised px-2 py-0.5 text-xs text-muted-foreground font-mono">
                  {col.length}
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[65vh]">
                {col.map((a) => (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    className="cursor-grab rounded-lg border bg-background p-3 text-xs shadow-xs transition hover:border-lime/60 active:cursor-grabbing"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to="/artists/$id"
                        params={{ id: a.id }}
                        className="font-medium hover:text-lime truncate max-w-[170px]"
                      >
                        {a.name}
                      </Link>
                      {a.is_demo && <DemoBadge />}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Portrait
                        seed={a.portrait_seed}
                        name={a.name}
                        isDemo={a.is_demo}
                        className="size-5 shrink-0"
                      />
                      <span className="truncate">
                        {a.city ? `${a.city}, ` : ""}
                        {a.country}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
                      <IntegrityChip value={a.integrity} />
                      <button
                        onClick={() => {
                          const nextIdx = STAGES.findIndex((st) => st.id === s.id) + 1;
                          const nextStage = STAGES[nextIdx]?.id;
                          if (nextStage) promptMove(a, nextStage);
                        }}
                        className="text-primary hover:underline"
                      >
                        Advance →
                      </button>
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                    Drop candidate here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move Candidate Stage</DialogTitle>
            <DialogDescription>
              Transitioning <strong>{targetArtist?.name}</strong> to{" "}
              <strong>{STAGES.find((s) => s.id === targetStage)?.label}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {targetStage === "signed" && (
              <div className="rounded-lg border border-amber/40 bg-amber/5 p-3 text-xs text-amber flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Governance Gate:</strong> Signing requires Head of A&R / Admin
                  permissions and at least 2 distinct recorded artistic reviews in the database.
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Audited Decision Rationale (required)
              </label>
              <Textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                placeholder="State the evidence-backed reason for this stage move..."
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Evidence Links or Citations (optional)
              </label>
              <Input
                value={evidenceRefs}
                onChange={(e) => setEvidenceRefs(e.target.value)}
                placeholder="URLs or observation IDs supporting this transition..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={move.isPending || rationale.trim().length < 3}
              onClick={handleConfirmMove}
            >
              {move.isPending ? "Confirming move..." : "Confirm Stage Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
