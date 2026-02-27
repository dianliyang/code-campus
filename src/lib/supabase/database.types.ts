export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      course_syllabi: {
        Row: {
          id: number
          course_id: number
          source_url: string | null
          raw_text: string | null
          content: Json
          schedule: Json
          retrieved_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          course_id: number
          source_url?: string | null
          raw_text?: string | null
          content?: Json
          schedule?: Json
          retrieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          course_id?: number
          source_url?: string | null
          raw_text?: string | null
          content?: Json
          schedule?: Json
          retrieved_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_syllabi_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
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
          course_code: string
          created_at: string | null
          credit: number | null
          cross_listed_courses: string | null
          department: string | null
          description: string | null
          details: Json | null
          difficulty: number | null
          id: number
          instructors: string[] | null
          is_hidden: boolean | null
          is_internal: boolean | null
          latest_semester: Json | null
          level: string | null
          popularity: number | null
          prerequisites: string | null
          related_urls: string[] | null
          search_vector: unknown
          title: string
          units: string | null
          university: string
          url: string | null
          workload: number | null
          subdomain: string | null
          resources: string[] | null
          category: string | null
        }
        Insert: {
          corequisites?: string | null
          course_code: string
          created_at?: string | null
          credit?: number | null
          cross_listed_courses?: string | null
          department?: string | null
          description?: string | null
          details?: Json | null
          difficulty?: number | null
          id?: number
          instructors?: string[] | null
          is_hidden?: boolean | null
          is_internal?: boolean | null
          latest_semester?: Json | null
          level?: string | null
          popularity?: number | null
          prerequisites?: string | null
          related_urls?: string[] | null
          search_vector?: unknown
          title: string
          units?: string | null
          university: string
          url?: string | null
          workload?: number | null
          subdomain?: string | null
          resources?: string[] | null
          category?: string | null
        }
        Update: {
          corequisites?: string | null
          course_code?: string
          created_at?: string | null
          credit?: number | null
          cross_listed_courses?: string | null
          department?: string | null
          description?: string | null
          details?: Json | null
          difficulty?: number | null
          id?: number
          instructors?: string[] | null
          is_hidden?: boolean | null
          is_internal?: boolean | null
          latest_semester?: Json | null
          level?: string | null
          popularity?: number | null
          prerequisites?: string | null
          related_urls?: string[] | null
          search_vector?: unknown
          title?: string
          units?: string | null
          university?: string
          url?: string | null
          workload?: number | null
          subdomain?: string | null
          resources?: string[] | null
          category?: string | null
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
          ai_usage_calls: number
          ai_usage_tokens: number
          ai_usage_updated_at: string | null
          ai_prompt_template: string | null
          ai_provider: string
          ai_study_plan_prompt_template: string | null
          ai_planner_prompt_template: string | null
          ai_topics_prompt_template: string | null
          ai_course_update_prompt_template: string | null
          ai_syllabus_prompt_template: string | null
          ai_web_search_enabled: boolean
          created_at: string
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ai_default_model?: string
          ai_usage_calls?: number
          ai_usage_tokens?: number
          ai_usage_updated_at?: string | null
          ai_prompt_template?: string | null
          ai_provider?: string
          ai_study_plan_prompt_template?: string | null
          ai_planner_prompt_template?: string | null
          ai_topics_prompt_template?: string | null
          ai_course_update_prompt_template?: string | null
          ai_syllabus_prompt_template?: string | null
          ai_web_search_enabled?: boolean
          created_at?: string
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          ai_default_model?: string
          ai_usage_calls?: number
          ai_usage_tokens?: number
          ai_usage_updated_at?: string | null
          ai_prompt_template?: string | null
          ai_provider?: string
          ai_study_plan_prompt_template?: string | null
          ai_planner_prompt_template?: string | null
          ai_topics_prompt_template?: string | null
          ai_course_update_prompt_template?: string | null
          ai_syllabus_prompt_template?: string | null
          ai_web_search_enabled?: boolean
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects_seminars: {
        Row: {
          category: string
          contents: string | null
          course_code: string
          created_at: string | null
          credit: number | null
          department: string | null
          description: string | null
          details: Json | null
          id: number
          instructors: string[] | null
          latest_semester: Json | null
          prerequisites: string | null
          related_links: string[] | null
          schedule: Json | null
          search_vector: unknown
          title: string
          university: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          category: string
          contents?: string | null
          course_code: string
          created_at?: string | null
          credit?: number | null
          department?: string | null
          description?: string | null
          details?: Json | null
          id?: number
          instructors?: string[] | null
          latest_semester?: Json | null
          prerequisites?: string | null
          related_links?: string[] | null
          schedule?: Json | null
          search_vector?: unknown
          title: string
          university: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          category?: string
          contents?: string | null
          course_code?: string
          created_at?: string | null
          credit?: number | null
          department?: string | null
          description?: string | null
          details?: Json | null
          id?: number
          instructors?: string[] | null
          latest_semester?: Json | null
          prerequisites?: string | null
          related_links?: string[] | null
          schedule?: Json | null
          search_vector?: unknown
          title?: string
          university?: string
          updated_at?: string | null
          url?: string | null
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
          status: string | null
          university: string
        }
        Insert: {
          completed_at?: string | null
          course_count?: number | null
          created_at?: string | null
          error?: string | null
          id?: number
          started_at?: string | null
          status?: string | null
          university: string
        }
        Update: {
          completed_at?: string | null
          course_count?: number | null
          created_at?: string | null
          error?: string | null
          id?: number
          started_at?: string | null
          status?: string | null
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
          end_time: string | null
          id: number
          kind: string | null
          location: string | null
          start_date: string
          start_time: string | null
          timezone: string | null
          uid: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: number
          created_at?: string | null
          days_of_week: number[]
          end_date: string
          end_time?: string | null
          id?: number
          kind?: string | null
          location?: string | null
          start_date: string
          start_time?: string | null
          timezone?: string | null
          uid?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: number
          created_at?: string | null
          days_of_week?: number[]
          end_date?: string
          end_time?: string | null
          id?: number
          kind?: string | null
          location?: string | null
          start_date?: string
          start_time?: string | null
          timezone?: string | null
          uid?: string
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
      user_projects_seminars: {
        Row: {
          progress: number | null
          project_seminar_id: number
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          progress?: number | null
          project_seminar_id: number
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          progress?: number | null
          project_seminar_id?: number
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_projects_seminars_project_seminar_id_fkey"
            columns: ["project_seminar_id"]
            isOneToOne: false
            referencedRelation: "projects_seminars"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          booking_status: string | null
          booking_url: string | null
          category: string
          category_en: string | null
          course_code: string
          created_at: string | null
          day_of_week: string | null
          details: Json | null
          end_date: string | null
          end_time: string | null
          id: number
          instructor: string | null
          location: string | null
          location_en: string | null
          price_external: number | null
          price_external_reduced: number | null
          price_staff: number | null
          price_student: number | null
          search_vector: unknown
          semester: string | null
          source: string
          start_date: string | null
          start_time: string | null
          title: string
          title_en: string | null
          updated_at: string | null
          url: string | null
        }
        Insert: {
          booking_status?: string | null
          booking_url?: string | null
          category: string
          category_en?: string | null
          course_code: string
          created_at?: string | null
          day_of_week?: string | null
          details?: Json | null
          end_date?: string | null
          end_time?: string | null
          id?: number
          instructor?: string | null
          location?: string | null
          location_en?: string | null
          price_external?: number | null
          price_external_reduced?: number | null
          price_staff?: number | null
          price_student?: number | null
          search_vector?: unknown
          semester?: string | null
          source: string
          start_date?: string | null
          start_time?: string | null
          title: string
          title_en?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          booking_status?: string | null
          booking_url?: string | null
          category?: string
          category_en?: string | null
          course_code?: string
          created_at?: string | null
          day_of_week?: string | null
          details?: Json | null
          end_date?: string | null
          end_time?: string | null
          id?: number
          instructor?: string | null
          location?: string | null
          location_en?: string | null
          price_external?: number | null
          price_external_reduced?: number | null
          price_staff?: number | null
          price_student?: number | null
          search_vector?: unknown
          semester?: string | null
          source?: string
          start_date?: string | null
          start_time?: string | null
          title?: string
          title_en?: string | null
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_popularity: { Args: { row_id: number }; Returns: undefined }
      increment_ai_usage: {
        Args: { p_calls?: number; p_tokens?: number; p_user_id: string }
        Returns: undefined
      }
      increment_popularity: { Args: { row_id: number }; Returns: undefined }
      seed_user_data: { Args: { p_user_id: string }; Returns: undefined }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
