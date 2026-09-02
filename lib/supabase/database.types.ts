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
      campaign_rules: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          metric: string
          operator: string
          reward_amount: number
          target_value: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          metric: string
          operator: string
          reward_amount: number
          target_value: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          metric?: string
          operator?: string
          reward_amount?: number
          target_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          company_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      company_file_employees: {
        Row: {
          created_at: string
          employee_id: string
          file_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          file_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          file_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_file_employees_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_file_employees_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "company_files"
            referencedColumns: ["id"]
          },
        ]
      }
      company_file_pending_employees: {
        Row: {
          cpf: string
          created_at: string
          file_id: string
          name: string
        }
        Insert: {
          cpf: string
          created_at?: string
          file_id: string
          name: string
        }
        Update: {
          cpf?: string
          created_at?: string
          file_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_file_pending_employees_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "company_files"
            referencedColumns: ["id"]
          },
        ]
      }
      company_files: {
        Row: {
          company_id: string
          created_at: string
          id: string
          original_name: string
          period_end: string | null
          period_start: string | null
          purpose: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          original_name: string
          period_end?: string | null
          period_start?: string | null
          purpose: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          original_name?: string
          period_end?: string | null
          period_start?: string | null
          purpose?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_invites: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          employee_id: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          employee_id: string
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          employee_id?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_invites_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          company_id: string
          cpf: string
          created_at: string
          id: string
          invited_at: string | null
          job_title: string | null
          name: string
          role: string
          user_id: string | null
          work_schedule_id: string | null
        }
        Insert: {
          company_id: string
          cpf: string
          created_at?: string
          id?: string
          invited_at?: string | null
          job_title?: string | null
          name: string
          role?: string
          user_id?: string | null
          work_schedule_id?: string | null
        }
        Update: {
          company_id?: string
          cpf?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          job_title?: string | null
          name?: string
          role?: string
          user_id?: string | null
          work_schedule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          campaign_id: string
          created_at: string
          earned_amount: number
          employee_id: string
          id: string
          reference_month: string
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          earned_amount: number
          employee_id: string
          id?: string
          reference_month: string
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          earned_amount?: number
          employee_id?: string
          id?: string
          reference_month?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          review_status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          review_status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          review_status?: string
        }
        Relationships: []
      }
      timesheet_events: {
        Row: {
          created_at: string
          employee_id: string
          event_date: string
          has_manual_adjustment: boolean
          id: string
          is_absence: boolean
          is_day_off: boolean
          justification_claim_note: string | null
          justification_claimed_at: string | null
          justification_kind: string | null
          justification_review_note: string | null
          justification_reviewed_at: string | null
          justification_reviewed_by: string | null
          justification_status: string
          lateness_minutes: number
          notes: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          event_date: string
          has_manual_adjustment?: boolean
          id?: string
          is_absence?: boolean
          is_day_off?: boolean
          justification_claim_note?: string | null
          justification_claimed_at?: string | null
          justification_kind?: string | null
          justification_review_note?: string | null
          justification_reviewed_at?: string | null
          justification_reviewed_by?: string | null
          justification_status?: string
          lateness_minutes?: number
          notes?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          event_date?: string
          has_manual_adjustment?: boolean
          id?: string
          is_absence?: boolean
          is_day_off?: boolean
          justification_claim_note?: string | null
          justification_claimed_at?: string | null
          justification_kind?: string | null
          justification_review_note?: string | null
          justification_reviewed_at?: string | null
          justification_reviewed_by?: string | null
          justification_status?: string
          lateness_minutes?: number
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_summaries: {
        Row: {
          created_at: string
          earned_amount: number
          employee_id: string
          id: string
          manual_adjustments_count: number
          reference_month: string
          total_absences: number
          total_lateness_minutes: number
        }
        Insert: {
          created_at?: string
          earned_amount?: number
          employee_id: string
          id?: string
          manual_adjustments_count?: number
          reference_month: string
          total_absences?: number
          total_lateness_minutes?: number
        }
        Update: {
          created_at?: string
          earned_amount?: number
          employee_id?: string
          id?: string
          manual_adjustments_count?: number
          reference_month?: string
          total_absences?: number
          total_lateness_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_summaries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedule_bonus_rules: {
        Row: {
          created_at: string
          id: string
          metric: string
          operator: string
          reward_amount: number
          sort_order: number
          target_value: number
          work_schedule_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metric: string
          operator: string
          reward_amount: number
          sort_order?: number
          target_value: number
          work_schedule_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metric?: string
          operator?: string
          reward_amount?: number
          sort_order?: number
          target_value?: number
          work_schedule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_schedule_bonus_rules_work_schedule_id_fkey"
            columns: ["work_schedule_id"]
            isOneToOne: false
            referencedRelation: "work_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      work_schedules: {
        Row: {
          absence_penalty_percent: number
          accumulated_lateness_tolerance_minutes: number
          bonus_base_amount: number
          code: number
          company_id: string
          created_at: string
          entry_1: string
          entry_2: string | null
          exit_1: string
          exit_2: string | null
          fixed_days_off: number[]
          fixed_sundays: number[]
          floating_sundays: string[]
          id: string
          is_night_shift: boolean | null
          lateness_penalty_percent: number
          name: string
          punctuality_percent: number
          sunday_rule_type: string
          workload_minutes: number | null
        }
        Insert: {
          absence_penalty_percent?: number
          accumulated_lateness_tolerance_minutes?: number
          bonus_base_amount?: number
          code?: number
          company_id: string
          created_at?: string
          entry_1: string
          entry_2?: string | null
          exit_1: string
          exit_2?: string | null
          fixed_days_off?: number[]
          fixed_sundays?: number[]
          floating_sundays?: string[]
          id?: string
          is_night_shift?: boolean | null
          lateness_penalty_percent?: number
          name: string
          punctuality_percent?: number
          sunday_rule_type?: string
          workload_minutes?: number | null
        }
        Update: {
          absence_penalty_percent?: number
          accumulated_lateness_tolerance_minutes?: number
          bonus_base_amount?: number
          code?: number
          company_id?: string
          created_at?: string
          entry_1?: string
          entry_2?: string | null
          exit_1?: string
          exit_2?: string | null
          fixed_days_off?: number[]
          fixed_sundays?: number[]
          floating_sundays?: string[]
          id?: string
          is_night_shift?: boolean | null
          lateness_penalty_percent?: number
          name?: string
          punctuality_percent?: number
          sunday_rule_type?: string
          workload_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "work_schedules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_employee_invite: {
        Args: { p_token: string }
        Returns: string
      }
      complete_company_admin_onboarding: {
        Args: {
          p_cnpj: string
          p_company_name: string
          p_cpf: string
          p_full_name: string
        }
        Returns: string
      }
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

