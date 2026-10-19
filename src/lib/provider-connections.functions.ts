import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { encryptSecret, decryptSecret, keyHint } from "@/lib/crypto";

const SUPPORTED_PROVIDERS = ["youtube", "spotify", "tiktok"] as const;

export const connectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      provider: z.enum(SUPPORTED_PROVIDERS),
      apiKey: z.string().trim().min(10).max(500),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    const encrypted = encryptSecret(data.apiKey);
    const hint = keyHint(data.apiKey);
    const { data: connectionId, error } = await context.supabase.rpc("connect_provider", {
      p_provider: data.provider,
      p_encrypted_key: encrypted,
      p_key_hint: hint,
    });
    if (error || !connectionId)
      throw new Error(error?.message ?? "Could not store the provider credential.");
    return { connectionId };
  });

export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ provider: z.enum(SUPPORTED_PROVIDERS) }))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    const { error } = await context.supabase.rpc("disconnect_provider", {
      p_provider: data.provider,
    });
    if (error) throw new Error(error.message ?? "Could not remove the connection.");
    return { ok: true };
  });

export const testProviderConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ provider: z.enum(SUPPORTED_PROVIDERS) }))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    const { data: encrypted, error: keyError } = await context.supabase.rpc(
      "get_provider_api_key",
      { p_provider: data.provider },
    );
    if (keyError || !encrypted)
      throw new Error(keyError?.message ?? "No stored credential found for this provider.");
    const apiKey = decryptSecret(encrypted);

    let ok = false;
    let message = "";

    if (data.provider === "youtube") {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`,
        { signal: AbortSignal.timeout(10_000) },
      );
      if (response.ok) {
        ok = true;
        message = "YouTube API key is valid and the connection works.";
      } else {
        const body = (await response.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        message = body.error?.message ?? `YouTube API returned HTTP ${response.status}.`;
      }
    } else if (data.provider === "spotify") {
      message =
        "Spotify integration requires an OAuth review. The credential is stored but live calls are not yet enabled.";
    } else if (data.provider === "tiktok") {
      message =
        "TikTok integration requires approved research access. The credential is stored but live calls are not yet enabled.";
    }

    await context.supabase.rpc("update_provider_connection_status", {
      p_provider: data.provider,
      p_status: ok ? "connected" : "error",
      ...(ok ? {} : { p_error: message }),
    });

    return { ok, message };
  });

export const searchYouTube = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ query: z.string().trim().min(2).max(200) }))
  .handler(async ({ data, context }) => {
    const { data: roles, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .limit(1);
    if (roleError || !roles?.length) throw new Error("Workspace access is required.");
    const { data: encrypted, error: keyError } = await context.supabase.rpc(
      "get_provider_api_key",
      { p_provider: "youtube" },
    );
    if (keyError || !encrypted)
      throw new Error("Connect your YouTube API key in Data Sources before searching.");
    const apiKey = decryptSecret(encrypted);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(data.query)}&type=video&maxResults=12&key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(body.error?.message ?? `YouTube API returned HTTP ${response.status}.`);
    }
    const body = (await response.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          publishedAt?: string;
          thumbnails?: { medium?: { url?: string } };
        };
      }>;
    };
    const items = (body.items ?? [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        videoId: item.id!.videoId!,
        title: item.snippet?.title ?? "",
        channelTitle: item.snippet?.channelTitle ?? "",
        publishedAt: item.snippet?.publishedAt ?? "",
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? "",
      }));
    return { items };
  });
