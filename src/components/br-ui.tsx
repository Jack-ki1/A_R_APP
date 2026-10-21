import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { portraitStyle, INTEGRITY_LABEL } from "@/lib/artists";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="grid size-9 place-items-center rounded-xl bg-lime/15 border border-lime/30 text-lime">
        <svg viewBox="0 0 32 24" className="h-5 w-7" aria-hidden>
          <path
            d="M1 12h5l3-8 5 16 4-12 3 6 3-2h7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="font-display text-sm font-black tracking-wider text-foreground">
          BREAKOUT <span className="text-lime">RADAR</span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          A&amp;R Intelligence Platform
        </div>
      </div>
    </div>
  );
}

export function Portrait({
  seed,
  className,
  name,
  isDemo = false,
}: {
  seed: number;
  className?: string;
  name: string;
  isDemo?: boolean;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
  return isDemo ? (
    <div
      role="img"
      aria-label={`Synthetic demo illustration for ${name}`}
      className={cn("shrink-0 rounded-full bg-muted", className)}
      style={portraitStyle(seed)}
    />
  ) : (
    <div
      role="img"
      aria-label={`Initials avatar for ${name}`}
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-lime/10 font-display text-sm font-semibold text-lime",
        className,
      )}
    >
      {initials}
    </div>
  );
}

export function DemoBadge() {
  return (
    <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber">
      Demo
    </span>
  );
}

const statusTone: Record<string, string> = {
  live: "border-cyan/40 bg-cyan/10 text-cyan",
  imported: "border-lime/40 bg-lime/10 text-lime",
  partial: "border-amber/40 bg-amber/10 text-amber",
  off: "border-border bg-muted text-muted-foreground",
  unvalidated: "border-violet/40 bg-violet/10 text-violet",
};

/** Coverage/quality status. DEMO is reserved for real fixtures (see DemoBadge). */
export function StatusBadge({
  tone,
  children,
}: {
  tone: keyof typeof statusTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        statusTone[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Panel({
  title,
  sub,
  action,
  children,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function ScoreRing({
  value,
  size = 40,
}: {
  value: number | null | undefined;
  size?: number;
}) {
  if (value == null)
    return <span className="text-[10px] text-muted-foreground">Insufficient evidence</span>;
  return (
    <div
      className="grid place-items-center rounded-full border-2 border-lime/70 bg-lime/10 font-display text-sm font-bold text-lime num"
      style={{ width: size, height: size }}
    >
      {value}
    </div>
  );
}

const integrityTone: Record<string, string> = {
  organic: "border-lime/40 bg-lime/10 text-lime",
  paid_promo: "border-cyan/40 bg-cyan/10 text-cyan",
  unknown: "border-border bg-muted text-muted-foreground",
  suspicious: "border-amber/40 bg-amber/10 text-amber",
  confirmed_invalid: "border-destructive/40 bg-destructive/10 text-destructive",
};
export function IntegrityChip({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium",
        integrityTone[value],
      )}
    >
      {INTEGRITY_LABEL[value] ?? value}
    </span>
  );
}

export function Kpi({
  icon,
  value,
  label,
  tone = "lime",
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  tone?: "lime" | "cyan" | "violet" | "amber" | "rose" | "orange";
}) {
  const tones = {
    lime: "bg-lime/20 text-lime border border-lime/30",
    cyan: "bg-cyan/20 text-cyan border border-cyan/30",
    violet: "bg-violet/20 text-violet border border-violet/30",
    amber: "bg-amber/20 text-amber border border-amber/30",
    rose: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
    orange: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  };
  return (
    <div className="panel p-4 transition-all hover:border-lime/40">
      <div className={cn("mb-3 grid size-10 place-items-center rounded-xl", tones[tone])}>
        {icon}
      </div>
      <div className="font-display text-2xl font-bold num">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
