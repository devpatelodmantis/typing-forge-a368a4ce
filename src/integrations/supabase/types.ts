export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      character_confidence: {
        Row: {
          character: string
          confidence_level: number | null
          created_at: string | null
          current_accuracy: number | null
          current_wpm: number | null
          id: string
          is_unlocked: boolean | null
          lessons_practiced: number | null
          total_instances: number | null
          unlocked_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          character: string
          confidence_level?: number | null
          created_at?: string | null
          current_accuracy?: number | null
          current_wpm?: number | null
          id?: string
          is_unlocked?: boolean | null
          lessons_practiced?: number | null
          total_instances?: number | null
          unlocked_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          character?: string
          confidence_level?: number | null
          created_at?: string | null
          current_accuracy?: number | null
          current_wpm?: number | null
          id?: string
          is_unlocked?: boolean | null
          lessons_practiced?: number | null
          total_instances?: number | null
          unlocked_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      code_snippets: {
        Row: {
          character_count: number | null
          content: string
          created_at: string | null
          difficulty: string | null
          id: string
          language: string
          title: string | null
        }
        Insert: {
          character_count?: number | null
          content: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          language: string
          title?: string | null
        }
        Update: {
          character_count?: number | null
          content?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          language?: string
          title?: string | null
        }
        Relationships: []
      }
      leaderboards: {
        Row: {
          accuracy_avg: number | null
          consistency_avg: number | null
          id: string
          tests_completed: number | null
          total_characters: number | null
          updated_at: string | null
          user_id: string
          wpm_avg: number | null
          wpm_best: number | null
        }
        Insert: {
          accuracy_avg?: number | null
          consistency_avg?: number | null
          id?: string
          tests_completed?: number | null
          total_characters?: number | null
          updated_at?: string | null
          user_id: string
          wpm_avg?: number | null
          wpm_best?: number | null
        }
        Update: {
          accuracy_avg?: number | null
          consistency_avg?: number | null
          id?: string
          tests_completed?: number | null
          total_characters?: number | null
          updated_at?: string | null
          user_id?: string
          wpm_avg?: number | null
          wpm_best?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          target_wpm: number | null
          theme: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          target_wpm?: number | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          target_wpm?: number | null
          theme?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string | null
          category: string | null
          character_count: number | null
          content: string
          created_at: string | null
          difficulty: string | null
          id: string
          word_count: number | null
        }
        Insert: {
          author?: string | null
          category?: string | null
          character_count?: number | null
          content: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          word_count?: number | null
        }
        Update: {
          author?: string | null
          category?: string | null
          character_count?: number | null
          content?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          word_count?: number | null
        }
        Relationships: []
      }
      race_sessions: {
        Row: {
          created_at: string | null
          ended_at: string | null
          expected_text: string
          host_accuracy: number | null
          host_id: string
          host_progress: number | null
          host_wpm: number | null
          id: string
          opponent_accuracy: number | null
          opponent_id: string | null
          opponent_progress: number | null
          opponent_wpm: number | null
          room_code: string
          started_at: string | null
          status: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          expected_text: string
          host_accuracy?: number | null
          host_id: string
          host_progress?: number | null
          host_wpm?: number | null
          id?: string
          opponent_accuracy?: number | null
          opponent_id?: string | null
          opponent_progress?: number | null
          opponent_wpm?: number | null
          room_code: string
          started_at?: string | null
          status?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          expected_text?: string
          host_accuracy?: number | null
          host_id?: string
          host_progress?: number | null
          host_wpm?: number | null
          id?: string
          opponent_accuracy?: number | null
          opponent_id?: string | null
          opponent_progress?: number | null
          opponent_wpm?: number | null
          room_code?: string
          started_at?: string | null
          status?: string | null
          winner_id?: string | null
        }
        Relationships: []
      }
      test_sessions: {
        Row: {
          accuracy_percent: number | null
          consistency_percent: number | null
          correct_characters: number | null
          created_at: string | null
          duration_seconds: number
          error_count: number | null
          gross_wpm: number | null
          id: string
          net_wpm: number | null
          per_char_metrics: Json | null
          test_mode: string
          total_characters: number | null
          user_id: string | null
          wpm_history: Json | null
        }
        Insert: {
          accuracy_percent?: number | null
          consistency_percent?: number | null
          correct_characters?: number | null
          created_at?: string | null
          duration_seconds: number
          error_count?: number | null
          gross_wpm?: number | null
          id?: string
          net_wpm?: number | null
          per_char_metrics?: Json | null
          test_mode: string
          total_characters?: number | null
          user_id?: string | null
          wpm_history?: Json | null
        }
        Update: {
          accuracy_percent?: number | null
          consistency_percent?: number | null
          correct_characters?: number | null
          created_at?: string | null
          duration_seconds?: number
          error_count?: number | null
          gross_wpm?: number | null
          id?: string
          net_wpm?: number | null
          per_char_metrics?: Json | null
          test_mode?: string
          total_characters?: number | null
          user_id?: string | null
          wpm_history?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
