import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Accepted, source-linked observations feeding the evidence report. */
export const observationsQuery = queryOptions({
  queryKey: ["report_metric_observations"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("metric_observations")
      .select("*")
      .eq("quality_status", "accepted")
      .order("observed_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});
