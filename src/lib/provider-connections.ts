import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProviderConnection = {
  id: string;
  user_id: string;
  provider: string;
  key_hint: string;
  status: string;
  last_tested_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export const providerConnectionsQuery = queryOptions({
  queryKey: ["provider_connections"],
  queryFn: async (): Promise<ProviderConnection[]> => {
    const { data, error } = await supabase
      .from("provider_connections")
      .select(
        "id, user_id, provider, key_hint, status, last_tested_at, last_error, created_at, updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  staleTime: 30_000,
});
