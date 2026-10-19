export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          artist_id: string | null;
          body: string | null;
          created_at: string;
          id: string;
          is_demo: boolean;
          is_read: boolean;
          kind: string;
          title: string;
        };
        Insert: {
          artist_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          is_read?: boolean;
          kind: string;
          title: string;
        };
        Update: {
          artist_id?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          is_demo?: boolean;
          is_read?: boolean;
          kind?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      artist_notes: {
        Row: {
          artist_id: string;
          author_id: string;
          author_name: string | null;
          body: string;
          created_at: string;
          id: string;
        };
        Insert: {
          artist_id: string;
          author_id?: string;
          author_name?: string | null;
          body: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          artist_id?: string;
          author_id?: string;
          author_name?: string | null;
          body?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artist_notes_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      artistic_reviews: {
        Row: {
          artist_id: string;
          created_at: string;
          evidence_json: Json;
          id: string;
          notes: string | null;
          reviewer: string;
          reviewer_user_id: string | null;
          rubric_version: string;
          scores: Json;
          verdict: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          evidence_json?: Json;
          id?: string;
          notes?: string | null;
          reviewer?: string;
          reviewer_user_id?: string | null;
          rubric_version?: string;
          scores?: Json;
          verdict: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          evidence_json?: Json;
          id?: string;
          notes?: string | null;
          reviewer?: string;
          reviewer_user_id?: string | null;
          rubric_version?: string;
          scores?: Json;
          verdict?: string;
        };
        Relationships: [
          {
            foreignKeyName: "artistic_reviews_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      artists: {
        Row: {
          aliases: string[];
          artistic_status: string;
          audience_current: number | null;
          canonical_id: string;
          city: string;
          country: string;
          created_at: string;
          events: Json;
          evidence: Json;
          evidence_confidence: number | null;
          expected_growth_30d: number | null;
          genre: string;
          growth_30d: number | null;
          id: string;
          integrity: Database["public"]["Enums"]["integrity_class"];
          is_demo: boolean;
          language: string;
          name: string;
          next_action: string | null;
          next_action_due: string | null;
          pipeline_stage: Database["public"]["Enums"]["pipeline_stage"];
          portrait_seed: number;
          scores: Json;
          scout_owner: string | null;
          series: Json;
          stage: string;
          unsigned: boolean;
          updated_at: string;
          why_now: string | null;
        };
        Insert: {
          aliases?: string[];
          artistic_status?: string;
          audience_current?: number | null;
          canonical_id: string;
          city: string;
          country: string;
          created_at?: string;
          events?: Json;
          evidence?: Json;
          evidence_confidence?: number | null;
          expected_growth_30d?: number | null;
          genre: string;
          growth_30d?: number | null;
          id?: string;
          integrity?: Database["public"]["Enums"]["integrity_class"];
          is_demo?: boolean;
          language: string;
          name: string;
          next_action?: string | null;
          next_action_due?: string | null;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          portrait_seed?: number;
          scores?: Json;
          scout_owner?: string | null;
          series?: Json;
          stage: string;
          unsigned?: boolean;
          updated_at?: string;
          why_now?: string | null;
        };
        Update: {
          aliases?: string[];
          artistic_status?: string;
          audience_current?: number | null;
          canonical_id?: string;
          city?: string;
          country?: string;
          created_at?: string;
          events?: Json;
          evidence?: Json;
          evidence_confidence?: number | null;
          expected_growth_30d?: number | null;
          genre?: string;
          growth_30d?: number | null;
          id?: string;
          integrity?: Database["public"]["Enums"]["integrity_class"];
          is_demo?: boolean;
          language?: string;
          name?: string;
          next_action?: string | null;
          next_action_due?: string | null;
          pipeline_stage?: Database["public"]["Enums"]["pipeline_stage"];
          portrait_seed?: number;
          scores?: Json;
          scout_owner?: string | null;
          series?: Json;
          stage?: string;
          unsigned?: boolean;
          updated_at?: string;
          why_now?: string | null;
        };
        Relationships: [];
      };
      audience_snapshots: {
        Row: {
          artist_id: string;
          cohort_scheme: string;
          coverage: number | null;
          denominator_type: string;
          id: string;
          quality_status: string;
          reference_date: string;
          rights_status: string;
          rights_reference: string | null;
          provenance_json: Json;
          segments: Json;
          source: string;
          segment_counts: Json;
          source_import_key: string | null;
          source_id: string | null;
          ingestion_run_id: string | null;
          total: number;
          window_days: number;
        };
        Insert: {
          artist_id: string;
          cohort_scheme?: string;
          coverage?: number | null;
          denominator_type?: string;
          id?: string;
          quality_status?: string;
          reference_date: string;
          rights_status?: string;
          rights_reference?: string | null;
          provenance_json?: Json;
          segments: Json;
          source: string;
          segment_counts?: Json;
          source_import_key?: string | null;
          source_id?: string | null;
          ingestion_run_id?: string | null;
          total: number;
          window_days: number;
        };
        Update: {
          artist_id?: string;
          cohort_scheme?: string;
          coverage?: number | null;
          denominator_type?: string;
          id?: string;
          quality_status?: string;
          reference_date?: string;
          rights_status?: string;
          rights_reference?: string | null;
          provenance_json?: Json;
          segments?: Json;
          source?: string;
          segment_counts?: Json;
          source_import_key?: string | null;
          source_id?: string | null;
          ingestion_run_id?: string | null;
          total?: number;
          window_days?: number;
        };
        Relationships: [
          {
            foreignKeyName: "audience_snapshots_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          detail: Json | null;
          entity: string;
          entity_id: string | null;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json | null;
          entity: string;
          entity_id?: string | null;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          detail?: Json | null;
          entity?: string;
          entity_id?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      dev_tasks: {
        Row: {
          area: string;
          artist_id: string;
          created_at: string;
          done: boolean;
          due: string | null;
          id: string;
          title: string;
        };
        Insert: {
          area: string;
          artist_id: string;
          created_at?: string;
          done?: boolean;
          due?: string | null;
          id?: string;
          title: string;
        };
        Update: {
          area?: string;
          artist_id?: string;
          created_at?: string;
          done?: boolean;
          due?: string | null;
          id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dev_tasks_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      integrity_cases: {
        Row: {
          artist_id: string;
          created_at: string;
          evidence_json: Json;
          id: string;
          is_demo: boolean;
          opened_by: string | null;
          reason: string;
          resolution: string | null;
          resolved_at: string | null;
          signals: Json;
          status: string;
        };
        Insert: {
          artist_id: string;
          created_at?: string;
          evidence_json?: Json;
          id?: string;
          is_demo?: boolean;
          opened_by?: string | null;
          reason: string;
          resolution?: string | null;
          resolved_at?: string | null;
          signals?: Json;
          status?: string;
        };
        Update: {
          artist_id?: string;
          created_at?: string;
          evidence_json?: Json;
          id?: string;
          is_demo?: boolean;
          opened_by?: string | null;
          reason?: string;
          resolution?: string | null;
          resolved_at?: string | null;
          signals?: Json;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrity_cases_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "artists";
            referencedColumns: ["id"];
          },
        ];
      };
      integrity_decisions: {
        Row: {
          id: string;
          case_id: string;
          artist_id: string;
          decided_by: string;
          outcome: Database["public"]["Enums"]["integrity_class"];
          reason: string;
          evidence_ids: Json;
          decided_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          artist_id: string;
          decided_by: string;
          outcome: Database["public"]["Enums"]["integrity_class"];
          reason: string;
          evidence_ids?: Json;
          decided_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          artist_id?: string;
          decided_by?: string;
          outcome?: Database["public"]["Enums"]["integrity_class"];
          reason?: string;
          evidence_ids?: Json;
          decided_at?: string;
        };
        Relationships: [];
      };
      workflow_history: {
        Row: {
          id: string;
          artist_id: string;
          entity: string;
          from_state: string | null;
          to_state: string;
          changed_by: string;
          changed_at: string;
          rationale: string;
          evidence_refs: Json;
        };
        Insert: {
          id?: string;
          artist_id: string;
          entity: string;
          from_state?: string | null;
          to_state: string;
          changed_by: string;
          changed_at?: string;
          rationale: string;
          evidence_refs?: Json;
        };
        Update: {
          id?: string;
          artist_id?: string;
          entity?: string;
          from_state?: string | null;
          to_state?: string;
          changed_by?: string;
          changed_at?: string;
          rationale?: string;
          evidence_refs?: Json;
        };
        Relationships: [];
      };
      data_sources: {
        Row: {
          id: string;
          provider: string;
          source_category: string;
          rights_status: string;
          allowed_uses: string[];
          geographic_coverage: string | null;
          reporting_lag: string | null;
          retention_policy: string | null;
          terms_reviewed_at: string | null;
          config_status: string;
          refresh_cadence: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          provider: string;
          source_category: string;
          rights_status?: string;
          allowed_uses?: string[];
          geographic_coverage?: string | null;
          reporting_lag?: string | null;
          retention_policy?: string | null;
          terms_reviewed_at?: string | null;
          config_status?: string;
          refresh_cadence?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          provider?: string;
          source_category?: string;
          rights_status?: string;
          allowed_uses?: string[];
          geographic_coverage?: string | null;
          reporting_lag?: string | null;
          retention_policy?: string | null;
          terms_reviewed_at?: string | null;
          config_status?: string;
          refresh_cadence?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      artist_source_accounts: {
        Row: {
          id: string;
          artist_id: string;
          source: string;
          external_artist_id: string;
          profile_url: string | null;
          match_status: string;
          match_confidence: number | null;
          verified_by: string | null;
          verified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          source: string;
          external_artist_id: string;
          profile_url?: string | null;
          match_status?: string;
          match_confidence?: number | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          source?: string;
          external_artist_id?: string;
          profile_url?: string | null;
          match_status?: string;
          match_confidence?: number | null;
          verified_by?: string | null;
          verified_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      candidate_intake: {
        Row: {
          id: string;
          artist_id: string;
          submitted_by: string;
          intake_source: string;
          submitted_at: string;
          status: string;
          notes: string | null;
          provenance_json: Json;
        };
        Insert: {
          id?: string;
          artist_id: string;
          submitted_by: string;
          intake_source: string;
          submitted_at?: string;
          status?: string;
          notes?: string | null;
          provenance_json?: Json;
        };
        Update: {
          id?: string;
          artist_id?: string;
          submitted_by?: string;
          intake_source?: string;
          submitted_at?: string;
          status?: string;
          notes?: string | null;
          provenance_json?: Json;
        };
        Relationships: [];
      };
      ingestion_runs: {
        Row: {
          id: string;
          source_id: string;
          started_by: string;
          started_at: string;
          ended_at: string | null;
          status: string;
          records_received: number;
          records_accepted: number;
          records_rejected: number;
          error_code: string | null;
          error_message: string | null;
          provenance_json: Json;
        };
        Insert: {
          id?: string;
          source_id: string;
          started_by: string;
          started_at?: string;
          ended_at?: string | null;
          status?: string;
          records_received?: number;
          records_accepted?: number;
          records_rejected?: number;
          error_code?: string | null;
          error_message?: string | null;
          provenance_json?: Json;
        };
        Update: {
          id?: string;
          source_id?: string;
          started_by?: string;
          started_at?: string;
          ended_at?: string | null;
          status?: string;
          records_received?: number;
          records_accepted?: number;
          records_rejected?: number;
          error_code?: string | null;
          error_message?: string | null;
          provenance_json?: Json;
        };
        Relationships: [];
      };
      metric_observations: {
        Row: {
          id: string;
          artist_id: string;
          source_id: string;
          ingestion_run_id: string;
          platform_metric_name: string;
          metric_definition_version: string;
          start_at: string;
          end_at: string;
          observed_at: string;
          ingested_at: string;
          territory: string | null;
          unit: string;
          value_decimal: number;
          rights_status_snapshot: string;
          quality_status: string;
          provenance_json: Json;
        };
        Insert: {
          id?: string;
          artist_id: string;
          source_id: string;
          ingestion_run_id: string;
          platform_metric_name: string;
          metric_definition_version: string;
          start_at: string;
          end_at: string;
          observed_at: string;
          ingested_at?: string;
          territory?: string | null;
          unit: string;
          value_decimal: number;
          rights_status_snapshot: string;
          quality_status?: string;
          provenance_json?: Json;
        };
        Update: {
          id?: string;
          artist_id?: string;
          source_id?: string;
          ingestion_run_id?: string;
          platform_metric_name?: string;
          metric_definition_version?: string;
          start_at?: string;
          end_at?: string;
          observed_at?: string;
          ingested_at?: string;
          territory?: string | null;
          unit?: string;
          value_decimal?: number;
          rights_status_snapshot?: string;
          quality_status?: string;
          provenance_json?: Json;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          created_at: string;
          filters: Json;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          filters?: Json;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          filters?: Json;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      provider_connections: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          vault_secret_id: string;
          key_hint: string;
          status: string;
          last_tested_at: string | null;
          last_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          vault_secret_id: string;
          key_hint: string;
          status?: string;
          last_tested_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: string;
          vault_secret_id?: string;
          key_hint?: string;
          status?: string;
          last_tested_at?: string | null;
          last_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ml_predictions: {
        Row: {
          id: string;
          artist_id: string;
          model_version: string;
          prediction_score: number;
          confidence: string;
          features_used: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          model_version: string;
          prediction_score: number;
          confidence: string;
          features_used?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          model_version?: string;
          prediction_score?: number;
          confidence?: string;
          features_used?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_team: { Args: { _user_id: string }; Returns: boolean };
      intake_musicbrainz_candidate: {
        Args: {
          p_mbid: string;
          p_name: string;
          p_area: string;
          p_artist_type: string;
          p_source_url: string;
        };
        Returns: string;
      };
      import_authorized_metric_rows: {
        Args: { p_authorization_reference: string; p_rows: Json };
        Returns: string;
      };
      import_authorized_audience_snapshots: {
        Args: { p_authorization_reference: string; p_snapshots: Json };
        Returns: number;
      };
      set_audience_review_cadence: {
        Args: { p_cadence: string };
        Returns: string;
      };
      save_artistic_review: {
        Args: {
          p_artist_id: string;
          p_scores: Json;
          p_verdict: string;
          p_notes: string;
          p_evidence: Json;
        };
        Returns: string;
      };
      resolve_integrity_case: {
        Args: {
          p_case_id: string;
          p_outcome: Database["public"]["Enums"]["integrity_class"];
          p_reason: string;
          p_evidence_ids: Json;
        };
        Returns: string;
      };
      move_artist_stage: {
        Args: {
          p_artist_id: string;
          p_stage: Database["public"]["Enums"]["pipeline_stage"];
          p_rationale: string;
          p_evidence_refs?: Json;
        };
        Returns: undefined;
      };
      connect_provider: {
        Args: { p_provider: string; p_api_key: string };
        Returns: string;
      };
      get_provider_api_key: {
        Args: { p_provider: string };
        Returns: string;
      };
      disconnect_provider: {
        Args: { p_provider: string };
        Returns: undefined;
      };
      update_provider_connection_status: {
        Args: { p_provider: string; p_status: string; p_error?: string };
        Returns: undefined;
      };
      upsert_ml_prediction: {
        Args: {
          p_artist_id: string;
          p_model_version: string;
          p_prediction_score: number;
          p_confidence: string;
          p_features_used: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "head_of_ar" | "scout" | "analyst" | "artist_dev";
      integrity_class: "organic" | "paid_promo" | "unknown" | "suspicious" | "confirmed_invalid";
      pipeline_stage:
        | "identified"
        | "watchlist"
        | "investigation"
        | "artistic_review"
        | "contact"
        | "live_audition"
        | "development"
        | "negotiation"
        | "signed"
        | "passed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "head_of_ar", "scout", "analyst", "artist_dev"],
      integrity_class: ["organic", "paid_promo", "unknown", "suspicious", "confirmed_invalid"],
      pipeline_stage: [
        "identified",
        "watchlist",
        "investigation",
        "artistic_review",
        "contact",
        "live_audition",
        "development",
        "negotiation",
        "signed",
        "passed",
      ],
    },
  },
} as const;
