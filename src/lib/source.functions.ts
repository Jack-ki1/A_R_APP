import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { waitForMusicBrainzSlot } from "@/lib/musicbrainz.functions";

const ImportInput = z.object({
  authorizationReference: z.string().trim().min(3).max(500),
  rows: z
    .array(
      z.object({
        mbid: z.string().uuid(),
        source: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9][a-z0-9._-]*$/i),
        metric_name: z.string().min(1).max(100),
        definition_version: z.string().max(80),
        start_at: z.string().date(),
        end_at: z.string().date(),
        observed_at: z.string().datetime({ offset: true }),
        territory: z.string().max(100),
        unit: z.string().min(1).max(40),
        value: z.string().regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/),
      }),
    )
    .min(1)
    .max(5000),
});
const AudienceImportInput = z.object({
  authorizationReference: z.string().trim().min(3).max(500),
  snapshots: z
    .array(
      z.object({
        mbid: z.string().uuid(),
        source: z.string().trim().min(1).max(100),
        reference_date: z.string().date(),
        window_days: z.number().int().positive(),
        cohort_scheme: z.string().trim().min(1).max(100),
        denominator_type: z.string().trim().min(1).max(80),
        total: z.number().int().positive(),
        coverage: z.number().min(0.8).max(1),
        segments: z.record(z.string(), z.record(z.string(), z.number().min(0).max(100))),
        segment_counts: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
      }),
    )
    .min(1)
    .max(1000),
});

export const addMusicBrainzCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ mbid: z.string().uuid(), confirmIdentity: z.literal(true) }))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    await waitForMusicBrainzSlot();
    const response = await fetch(`https://musicbrainz.org/ws/2/artist/${data.mbid}?fmt=json`, {
      headers: { "User-Agent": "BreakoutRadar/1.0 (internal A&R research tool)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new Error("MusicBrainz could not verify this artist identity. Try again shortly.");
    const body = (await response.json()) as {
      id?: string;
      name?: string;
      disambiguation?: string;
      type?: string;
      area?: { name?: string };
    };
    if (body.id?.toLocaleLowerCase() !== data.mbid.toLocaleLowerCase() || !body.name?.trim())
      throw new Error("MusicBrainz returned an invalid identity record.");
    const sourceUrl = `https://musicbrainz.org/artist/${data.mbid}`;
    const { data: artistId, error } = await context.supabase.rpc("intake_musicbrainz_candidate", {
      p_mbid: body.id,
      p_name: body.name.trim(),
      p_area: body.area?.name ?? "",
      p_artist_type: body.type ?? "",
      p_source_url: sourceUrl,
    });
    if (error || !artistId) throw new Error(error?.message ?? "Candidate intake failed.");
    return { artistId };
  });

export const importAuthorizedMetricRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(ImportInput)
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar", "analyst"]);
    if (roleError || !roles?.length)
      throw new Error("Analyst access is required to import metrics.");
    const { data: runId, error } = await context.supabase.rpc("import_authorized_metric_rows", {
      p_authorization_reference: data.authorizationReference,
      p_rows: data.rows,
    });
    if (error || !runId) throw new Error(error?.message ?? "Metric import failed.");
    // The RPC inserts with `on conflict do nothing`, so the true accepted count is the number
    // of rows actually written for this run — not the submitted count.
    const { count: acceptedCount, error: countError } = await context.supabase
      .from("metric_observations")
      .select("id", { count: "exact", head: true })
      .eq("ingestion_run_id", runId);
    if (countError)
      throw new Error(countError.message ?? "Import succeeded but the accepted count failed.");
    const accepted = acceptedCount ?? 0;
    return { runId, accepted, submitted: data.rows.length };
  });

export const importAuthorizedAudienceSnapshots = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(AudienceImportInput)
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar", "analyst"]);
    if (roleError || !roles?.length)
      throw new Error("Analyst access is required to import audience snapshots.");
    const { data: inserted, error } = await context.supabase.rpc(
      "import_authorized_audience_snapshots",
      {
        p_authorization_reference: data.authorizationReference,
        p_snapshots: data.snapshots,
      },
    );
    if (error || inserted == null) throw new Error(error?.message ?? "Audience import failed.");
    return { inserted, received: data.snapshots.length };
  });

export const setAudienceReviewCadence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({ cadence: z.enum(["manual", "every_14_days", "twice_monthly", "every_2_months"]) }),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar"]);
    if (roleError || !roles?.length) throw new Error("Head of A&R or admin access is required.");
    const { data: saved, error } = await context.supabase.rpc("set_audience_review_cadence", {
      p_cadence: data.cadence,
    });
    if (error || !saved)
      throw new Error(error?.message ?? "Could not save the cadence preference.");
    return { cadence: saved };
  });
