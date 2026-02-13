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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      course_fields: {
        Row: {
          course_id: number
          field_id: number
        }
        Insert: {
          course_id: number
          field_id: number
        }
        Update: {
          course_id?: number
          field_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_fields_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_fields_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      course_semesters: {
        Row: {
          course_id: number
          semester_id: number
        }
        Insert: {
          course_id: number
          semester_id: number
        }
        Update: {
          course_id?: number
          semester_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_semesters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_semesters_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          corequisites: string | null
          cross_listed_courses: string | null
          course_code: string
          created_at: string | null
          credit: number | null
          department: string | null
          description: string | null
          details: Json | null
          difficulty: number | null
          id: number
          instructors: string[] | null
          is_hidden: boolean | null
          is_internal: boolean | null
          level: string | null
          popularity: number | null
          prerequisites: string | null
          related_urls: string[] | null
          search_vector: unknown
          title: string
          units: string | null
          university: string
          url: string | null
          workload: string | null
        }
        Insert: {
          corequisites?: string | null
          cross_listed_courses?: string | null
          course_code: string
          created_at?: string | null
          credit?: number | null
          department?: string | null
          description?: string | null
          details?: Json | null
          difficulty?: number | null
          id?: number
          instructors?: string[] | null
          is_hidden?: boolean | null
          is_internal?: boolean | null
          level?: string | null
          popularity?: number | null
          prerequisites?: string | null
          related_urls?: string[] | null
          search_vector?: unknown
          title: string
          units?: string | null
          university: string
          url?: string | null
          workload?: string | null
        }
        Update: {
          corequisites?: string | null
          cross_listed_courses?: string | null
          course_code?: string
          created_at?: string | null
          credit?: number | null
          department?: string | null
          description?: string | null
          details?: Json | null
          difficulty?: number | null
          id?: number
          instructors?: string[] | null
          is_hidden?: boolean | null
          is_internal?: boolean | null
          level?: string | null
          popularity?: number | null
          prerequisites?: string | null
          related_urls?: string[] | null
          search_vector?: unknown
          title?: string
          units?: string | null
          university?: string
          url?: string | null
          workload?: string | null
        }
        Relationships: []
      }
      fields: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ai_default_model: string
          ai_provider: string
          ai_prompt_template: string | null
          ai_study_plan_prompt_template: string | null
          ai_web_search_enabled: boolean
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ai_default_model?: string
          ai_provider?: string
          ai_prompt_template?: string | null
          ai_study_plan_prompt_template?: string | null
          ai_web_search_enabled?: boolean
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          ai_default_model?: string
          ai_provider?: string
          ai_prompt_template?: string | null
          ai_study_plan_prompt_template?: string | null
          ai_web_search_enabled?: boolean
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      scraper_jobs: {
        Row: {
          completed_at: string | null
          course_count: number | null
          created_at: string | null
          error: string | null
          id: number
          started_at: string | null
          status: string
          university: string
        }
        Insert: {
          completed_at?: string | null
          course_count?: number | null
          created_at?: string | null
          error?: string | null
          id?: number
          started_at?: string | null
          status?: string
          university: string
        }
        Update: {
          completed_at?: string | null
          course_count?: number | null
          created_at?: string | null
          error?: string | null
          id?: number
          started_at?: string | null
          status?: string
          university?: string
        }
        Relationships: []
      }
      semesters: {
        Row: {
          id: number
          term: string
          year: number
        }
        Insert: {
          id?: number
          term: string
          year: number
        }
        Update: {
          id?: number
          term?: string
          year?: number
        }
        Relationships: []
      }
      study_logs: {
        Row: {
          created_at: string | null
          id: number
          is_completed: boolean | null
          log_date: string
          notes: string | null
          plan_id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_completed?: boolean | null
          log_date: string
          notes?: string | null
          plan_id: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_completed?: boolean | null
          log_date?: string
          notes?: string | null
          plan_id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          course_id: number
          created_at: string | null
          days_of_week: number[]
          end_date: string
          end_time: string
          id: number
          location: string | null
          start_date: string
          start_time: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: number
          created_at?: string | null
          days_of_week: number[]
          end_date: string
          end_time?: string
          id?: number
          location?: string | null
          start_date: string
          start_time?: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: number
          created_at?: string | null
          days_of_week?: number[]
          end_date?: string
          end_time?: string
          id?: number
          location?: string | null
          start_date?: string
          start_time?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_courses: {
        Row: {
          course_id: number
          gpa: number | null
          notes: string | null
          priority: number | null
          progress: number | null
          score: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: number
          gpa?: number | null
          notes?: string | null
          priority?: number | null
          progress?: number | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: number
          gpa?: number | null
          notes?: string | null
          priority?: number | null
          progress?: number | null
          score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_popularity: { Args: { row_id: number }; Returns: undefined }
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
