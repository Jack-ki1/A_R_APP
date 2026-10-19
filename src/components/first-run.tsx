import { Link } from "@tanstack/react-router";
import { Check, Circle, Database, Search, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIRST_RUN_STEPS, progressStepStates } from "@/lib/first-run";
import { cn } from "@/lib/utils";

function ProgressSteps({
  hasArtists,
  hasObservations,
}: {
  hasArtists: boolean;
  hasObservations: boolean;
}) {
  const steps = progressStepStates(hasArtists, hasObservations);
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs" aria-label="Setup progress">
      {steps.map((step, index) => (
        <li key={step.label} className="flex items-center gap-2">
          <span
            className={cn(
              "grid size-5 place-items-center rounded-full border",
              step.done
                ? "border-lime/60 bg-lime/15 text-lime"
                : step.current
                  ? "border-lime/60 text-lime"
                  : "border-border text-muted-foreground",
            )}
            aria-hidden
          >
            {step.done ? <Check className="size-3" /> : <Circle className="size-2.5" />}
          </span>
          <span
            className={cn(step.done || step.current ? "text-foreground" : "text-muted-foreground")}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </li>
      ))}
    </ol>
  );
}

/** Empty-workspace on-ramp shown when no real artist has been onboarded yet. */
export function FirstRunChecklist() {
  return (
    <section className="panel p-6" aria-labelledby="first-run-title">
      <ProgressSteps hasArtists={false} hasObservations={false} />
      <h2 id="first-run-title" className="mt-4 text-lg font-semibold">
        Get started with your first artist
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        This workspace has no imported artists yet, so there is nothing to rank. Rankings only
        appear after a verified identity and at least two comparable, authorized observations — and
        they stay labeled as observed evidence, not predicted breakouts.
      </p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {FIRST_RUN_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-xl border bg-panel-raised p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="grid size-5 place-items-center rounded-full bg-lime/15 text-[11px] font-bold text-lime num">
                {index + 1}
              </span>
              {step.title}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/discover" search={{ q: undefined }}>
            <Search /> Find an artist
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/settings">
            <Upload /> Attach authorized data
          </Link>
        </Button>
      </div>
    </section>
  );
}

/** Shown after the first artists exist but no authorized observation has been recorded. */
export function NeedsEvidenceCard({
  artistCount,
  observationCount,
}: {
  artistCount: number;
  observationCount: number;
}) {
  return (
    <section className="panel p-5" aria-labelledby="needs-evidence-title">
      <ProgressSteps hasArtists={artistCount > 0} hasObservations={observationCount > 0} />
      <h2 id="needs-evidence-title" className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <Database className="size-4 text-lime" /> Needs evidence
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {artistCount} artist{artistCount === 1 ? "" : "s"} monitored, {observationCount} authorized
        observation{observationCount === 1 ? "" : "s"} recorded. Identities alone carry no audience,
        growth or integrity evidence — import a rights-cleared export to unlock observed trends.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link to="/settings">
            <Upload /> Attach authorized data
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/discover" search={{ q: undefined }}>
            <Search /> Find more artists
          </Link>
        </Button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Sparkles className="size-3" /> Observed growth, peer comparison and priority scores stay
        unavailable until a governed baseline exists.
      </p>
    </section>
  );
}
