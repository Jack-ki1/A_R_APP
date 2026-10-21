import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predictBreakout, getModelInfo, type ArtistFeatures, IS_MODEL_APPROVED } from "@/lib/ml";

export const getModelMetadata = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (error || !roles?.length) throw new Error("Workspace access is required.");
    return getModelInfo();
  });

export const predictArtist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      artistId: z.string().uuid(),
      asOfDate: z.string().optional(),
      modelVersion: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar", "analyst"]);
    if (roleError || !roles?.length) throw new Error("Analyst access is required.");

    // Operational governance gate: refuse to persist unapproved synthetic predictions
    if (!IS_MODEL_APPROVED) {
      throw new Error(
        "Operational prediction is blocked: Baseline model is unvalidated on real historical outcomes. Approval required before operational scoring.",
      );
    }

    // Retrieve verified point-in-time features from database server-side (not caller supplied)
    const { data: artist, error: artistError } = await context.supabase
      .from("artists")
      .select("id, growth_30d, expected_growth_30d, scores, integrity")
      .eq("id", data.artistId)
      .single();
    if (artistError || !artist) throw new Error(artistError?.message ?? "Artist not found.");

    const scores = (artist.scores ?? {}) as Record<string, number | null>;
    const features: ArtistFeatures = {
      growth30d: artist.growth_30d,
      expectedGrowth30d: artist.expected_growth_30d,
      audienceSize: scores["audience"] ?? null,
      commentsPerThousandViews: scores["comments_per_1k_views"] ?? null,
      saveShare: scores["save_share"] ?? null,
      integrity: artist.integrity ?? "unknown",
      evidenceCoverage: scores["evidence_coverage"] ?? null,
      momentumScore: scores["momentum"] ?? null,
      hasObservations: false,
      hasSnapshots: false,
    };

    const prediction = predictBreakout(features);
    const { error: upsertError } = await context.supabase.rpc("upsert_ml_prediction", {
      p_artist_id: data.artistId,
      p_model_version: prediction.modelVersion,
      p_prediction_score: prediction.score,
      p_confidence: prediction.confidence,
      p_features_used: prediction.featuresUsed,
    });
    if (upsertError) throw new Error(upsertError.message ?? "Could not store the prediction.");
    return prediction;
  });

export const predictAllArtists = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar", "analyst"]);
    if (roleError || !roles?.length) throw new Error("Analyst access is required.");

    // Strict security & evidence governance: disable bulk synthetic scoring from operational UI
    throw new Error(
      "Operational scoring is disabled: No validated breakout prediction model is approved for signing decisions.",
    );
  });
