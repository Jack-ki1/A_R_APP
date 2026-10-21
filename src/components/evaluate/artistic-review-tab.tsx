import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { artistsQuery } from "@/lib/artists";
import { tableQuery } from "@/lib/modules";
import { Panel, Portrait } from "@/components/br-ui";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const RUBRIC_CRITERIA = [
  {
    id: "songwriting",
    label: "Songwriting & Composition",
    desc: "Melodic strength, hook delivery, lyrical resonance, structure",
  },
  {
    id: "performance",
    label: "Vocal / Instrumental Craft",
    desc: "Pitch control, vocal timbre, emotional dynamic, technical execution",
  },
  {
    id: "originality",
    label: "Originality & Distinctiveness",
    desc: "Sonic signature, uniqueness in genre, clear differentiation",
  },
  {
    id: "repeatability",
    label: "Catalogue Repeatability",
    desc: "Depth across releases vs one-off fluke, consistent quality",
  },
  {
    id: "live_craft",
    label: "Live Performance Potential",
    desc: "Stage energy, live arrangement adaptation, audience connection",
  },
  {
    id: "creative_identity",
    label: "Creative Identity & Vision",
    desc: "Visual aesthetic, narrative story, cultural authenticity",
  },
  {
    id: "work_ethic",
    label: "Work Ethic & Coachability",
    desc: "Responsiveness, collaborative openness, discipline",
  },
  {
    id: "development_readiness",
    label: "Development Potential",
    desc: "Growth trajectory under label mentorship, resource scalability",
  },
] as const;

const VERDICTS = ["Strong yes", "Promising", "Not yet", "Pass"] as const;

export function ArtisticReviewTab({ initialArtistId }: { initialArtistId?: string | undefined }) {
  const { data: artists = [] } = useQuery(artistsQuery);
  const { data: reviews = [] } = useQuery(tableQuery("artistic_reviews"));
  const queryClient = useQueryClient();

  const [selectedArtistId, setSelectedArtistId] = useState(initialArtistId ?? artists[0]?.id);
  const activeArtistId = selectedArtistId ?? artists[0]?.id;
  const artist = artists.find((a) => a.id === activeArtistId);

  // Rubric scores 1-5
  const [scores, setScores] = useState<Record<string, number>>({
    songwriting: 3,
    performance: 3,
    originality: 3,
    repeatability: 3,
    live_craft: 3,
    creative_identity: 3,
    work_ethic: 3,
    development_readiness: 3,
  });
  const [verdict, setVerdict] = useState<(typeof VERDICTS)[number]>("Promising");
  const [notes, setNotes] = useState("");
  const [evidenceLinks, setEvidenceLinks] = useState("");

  const artistReviews = reviews.filter((r) => r.artist_id === activeArtistId);
  const distinctReviewers = new Set(
    artistReviews.map(
      (r) =>
        (r as { reviewer_user_id?: string; reviewer?: string }).reviewer_user_id ??
        (r as { reviewer?: string }).reviewer,
    ),
  ).size;

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!activeArtistId) throw new Error("Select an artist first.");
      if (notes.trim().length < 3)
        throw new Error("Please provide substantive review notes (minimum 3 characters).");

      const evidenceArray = evidenceLinks
        .split(/\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      const { data, error } = await supabase.rpc("save_artistic_review", {
        p_artist_id: activeArtistId,
        p_scores: scores,
        p_verdict: verdict,
        p_notes: notes.trim(),
        p_evidence: evidenceArray,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Artistic review recorded with signed reviewer credentials.");
      setNotes("");
      setEvidenceLinks("");
      queryClient.invalidateQueries({ queryKey: ["artistic_reviews"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <Panel
        title="Human Artistic Evaluation"
        sub="Scored creative appraisal against an explicit 8-dimension A&R rubric. Two distinct reviewer evaluations are mandatory before any signing recommendation."
      >
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Choose artist for artistic review"
        >
          {artists.map((a) => (
            <button
              key={a.id}
              role="tab"
              aria-selected={a.id === activeArtistId}
              onClick={() => setSelectedArtistId(a.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                a.id === activeArtistId ? "border-lime bg-lime/10 text-lime" : "hover:bg-accent",
              )}
            >
              {a.name}
            </button>
          ))}
        </div>
      </Panel>

      {artist && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Panel
              title={`Record Evaluation for ${artist.name}`}
              sub="Scores are anchored 1 (Unsatisfactory) to 5 (World-class exception)."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitReview.mutate();
                }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  {RUBRIC_CRITERIA.map((criterion) => (
                    <div key={criterion.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-foreground">
                          {criterion.label}
                        </label>
                        <span className="font-mono text-sm font-bold text-lime">
                          {scores[criterion.id] ?? 3} / 5
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{criterion.desc}</p>
                      <div className="mt-2 flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setScores((prev) => ({ ...prev, [criterion.id]: val }))}
                            className={cn(
                              "flex-1 rounded py-1 text-xs font-medium transition",
                              (scores[criterion.id] ?? 3) === val
                                ? "bg-lime text-black font-bold"
                                : "border hover:bg-accent text-muted-foreground",
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    A&R Recommendation Verdict
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {VERDICTS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVerdict(v)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                          verdict === v
                            ? "border-lime bg-lime/10 text-lime font-bold"
                            : "hover:bg-accent",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Creative Review Notes & Narrative Assessment
                  </label>
                  <Textarea
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide specific, evidence-grounded feedback on tracks heard, live presence observed, songwriting dynamics, or stylistic differentiation..."
                    rows={4}
                    className="text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    Evidence Links / Demo Audio References (one per line)
                  </label>
                  <Input
                    value={evidenceLinks}
                    onChange={(e) => setEvidenceLinks(e.target.value)}
                    placeholder="https://soundcloud.com/... or https://youtube.com/..."
                    className="text-sm"
                  />
                </div>

                <Button type="submit" disabled={submitReview.isPending || notes.trim().length < 3}>
                  {submitReview.isPending ? "Submitting review..." : "Save Artistic Evaluation"}
                </Button>
              </form>
            </Panel>
          </div>

          <div className="space-y-6">
            <Panel
              title="Review Governance & History"
              sub={`Signing requirement: 2 distinct reviewers · Currently: ${distinctReviewers}`}
            >
              <div
                className={cn(
                  "rounded-lg border p-3 text-xs",
                  distinctReviewers >= 2
                    ? "border-lime/40 bg-lime/5 text-lime"
                    : "border-amber/40 bg-amber/5 text-amber",
                )}
              >
                {distinctReviewers >= 2
                  ? "✓ Signing requirement met: At least 2 independent reviews recorded."
                  : "⚠ Signing gate pending: Requires at least 2 distinct reviewer evaluations before pipeline approval to Signed."}
              </div>

              <div className="mt-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recorded Reviews ({artistReviews.length})
                </h4>
                {artistReviews.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No artistic reviews recorded yet for this artist.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {artistReviews.map((r) => {
                      const recScores = (r.scores ?? {}) as Record<string, number>;
                      const avgScore =
                        Object.values(recScores).length > 0
                          ? (
                              Object.values(recScores).reduce((a, b) => a + b, 0) /
                              Object.values(recScores).length
                            ).toFixed(1)
                          : "—";
                      return (
                        <div key={r.id} className="rounded-lg border p-3 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {(r as { reviewer?: string }).reviewer ?? "A&R Reviewer"}
                            </span>
                            <span className="rounded bg-lime/10 px-2 py-0.5 font-bold text-lime">
                              {r.verdict}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Rubric score avg:{" "}
                            <strong className="text-foreground">{avgScore} / 5</strong> ·{" "}
                            {new Date(
                              (r as { created_at?: string }).created_at ?? Date.now(),
                            ).toLocaleDateString()}
                          </div>
                          {r.notes && (
                            <p className="italic text-foreground/90 border-l-2 pl-2 border-muted">
                              &ldquo;{r.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
