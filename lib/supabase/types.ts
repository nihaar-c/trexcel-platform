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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      judging_assignments: {
        Row: {
          id: string
          judge_id: string
          team_id: string
        }
        Insert: {
          id?: string
          judge_id: string
          team_id: string
        }
        Update: {
          id?: string
          judge_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_assignments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      judging_scores: {
        Row: {
          criterion_id: string
          id: string
          judge_id: string
          locked: boolean
          score: number
          submitted_at: string
          team_id: string
        }
        Insert: {
          criterion_id: string
          id?: string
          judge_id: string
          locked?: boolean
          score: number
          submitted_at?: string
          team_id: string
        }
        Update: {
          criterion_id?: string
          id?: string
          judge_id?: string
          locked?: boolean
          score?: number
          submitted_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "judging_scores_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "rubric_criteria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judging_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string | null
          team_id: string | null
        }
        Insert: {
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          team_id?: string | null
        }
        Update: {
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_categories: {
        Row: {
          display_order: number
          id: string
          name: string
          rubric_type: string
          total_pts: number
          weight_pct: number
        }
        Insert: {
          display_order?: number
          id?: string
          name: string
          rubric_type: string
          total_pts: number
          weight_pct: number
        }
        Update: {
          display_order?: number
          id?: string
          name?: string
          rubric_type?: string
          total_pts?: number
          weight_pct?: number
        }
        Relationships: []
      }
      rubric_criteria: {
        Row: {
          category_id: string
          display_order: number
          id: string
          max_score: number
          min_score: number
          name: string
          score_weight: number
        }
        Insert: {
          category_id: string
          display_order?: number
          id?: string
          max_score: number
          min_score?: number
          name: string
          score_weight?: number
        }
        Update: {
          category_id?: string
          display_order?: number
          id?: string
          max_score?: number
          min_score?: number
          name?: string
          score_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "rubric_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      student_details: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          first_name: string | null
          gender: string | null
          last_name: string | null
          parent_email: string | null
          parent_first_name: string | null
          parent_last_name: string | null
          parent_phone: string | null
          phone: string | null
          race: string | null
          school_name: string | null
          state: string | null
          student_id: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          first_name?: string | null
          gender?: string | null
          last_name?: string | null
          parent_email?: string | null
          parent_first_name?: string | null
          parent_last_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          race?: string | null
          school_name?: string | null
          state?: string | null
          student_id?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          first_name?: string | null
          gender?: string | null
          last_name?: string | null
          parent_email?: string | null
          parent_first_name?: string | null
          parent_last_name?: string | null
          parent_phone?: string | null
          phone?: string | null
          race?: string | null
          school_name?: string | null
          state?: string | null
          student_id?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          ai_description: string | null
          category: string
          description: string | null
          file_url: string | null
          help_received: string | null
          id: string
          status: string
          submitted_at: string
          team_id: string
          title: string | null
        }
        Insert: {
          ai_description?: string | null
          category: string
          description?: string | null
          file_url?: string | null
          help_received?: string | null
          id?: string
          status?: string
          submitted_at?: string
          team_id: string
          title?: string | null
        }
        Update: {
          ai_description?: string | null
          category?: string
          description?: string | null
          file_url?: string | null
          help_received?: string | null
          id?: string
          status?: string
          submitted_at?: string
          team_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          count: number | null
          id: string
          invite_code: string | null
          memo: string | null
          team_name: string
          theme: string | null
        }
        Insert: {
          count?: number | null
          id?: string
          invite_code?: string | null
          memo?: string | null
          team_name: string
          theme?: string | null
        }
        Update: {
          count?: number | null
          id?: string
          invite_code?: string | null
          memo?: string | null
          team_name?: string
          theme?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
