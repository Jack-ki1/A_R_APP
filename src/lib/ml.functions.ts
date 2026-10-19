import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { predictBreakout, getModelInfo, type ArtistFeatures } from "@/lib/ml";

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
      growth30d: z.number().nullable(),
      expectedGrowth30d: z.number().nullable(),
      audienceSize: z.number().nullable(),
      commentsPerThousandViews: z.number().nullable(),
      saveShare: z.number().nullable(),
      integrity: z.string(),
      evidenceCoverage: z.number().nullable(),
      momentumScore: z.number().nullable(),
      hasObservations: z.boolean(),
      hasSnapshots: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["admin", "head_of_ar", "analyst"]);
    if (roleError || !roles?.length) throw new Error("Analyst access is required.");
    const features: ArtistFeatures = data;
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
    const { data: artists, error } = await context.supabase
      .from("artists")
      .select("id, growth_30d, expected_growth_30d, scores, integrity");
    if (error) throw new Error(error.message);
    const results: Array<{ artistId: string; score: number; confidence: string }> = [];
    for (const artist of artists ?? []) {
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
      await context.supabase.rpc("upsert_ml_prediction", {
        p_artist_id: artist.id,
        p_model_version: prediction.modelVersion,
        p_prediction_score: prediction.score,
        p_confidence: prediction.confidence,
        p_features_used: prediction.featuresUsed,
      });
      results.push({
        artistId: artist.id,
        score: prediction.score,
        confidence: prediction.confidence,
      });
    }
    return { count: results.length, results };
  });
