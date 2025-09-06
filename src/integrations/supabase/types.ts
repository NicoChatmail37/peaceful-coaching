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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          account_code: string
          account_name: string
          company_id: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string
          id: string
          invoice_id: string | null
          user_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          company_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          id?: string
          invoice_id?: string | null
          user_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          company_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          id?: string
          invoice_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          npa: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          npa?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          npa?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          npa: string | null
          phone: string | null
          theme_color: string | null
          tva_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          npa?: string | null
          phone?: string | null
          theme_color?: string | null
          tva_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          npa?: string | null
          phone?: string | null
          theme_color?: string | null
          tva_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          accounting_entries_generated: boolean | null
          company_id: string | null
          created_at: string
          document_type: string
          extracted_data: Json | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          processed_at: string | null
          processing_status: string | null
          status: string
          updated_at: string
          user_id: string
          validation_status: string | null
        }
        Insert: {
          accounting_entries_generated?: boolean | null
          company_id?: string | null
          created_at?: string
          document_type?: string
          extracted_data?: Json | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
          validation_status?: string | null
        }
        Update: {
          accounting_entries_generated?: boolean | null
          company_id?: string | null
          created_at?: string
          document_type?: string
          extracted_data?: Json | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          processed_at?: string | null
          processing_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          validation_status?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          employment_type: string
          end_date: string | null
          first_name: string
          hourly_rate_default: number | null
          id: string
          is_student: boolean | null
          last_name: string
          monthly_base: number | null
          start_date: string | null
          thirteenth_enabled: boolean | null
          updated_at: string
          user_id: string
          work_rate_pct: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          employment_type?: string
          end_date?: string | null
          first_name: string
          hourly_rate_default?: number | null
          id?: string
          is_student?: boolean | null
          last_name: string
          monthly_base?: number | null
          start_date?: string | null
          thirteenth_enabled?: boolean | null
          updated_at?: string
          user_id: string
          work_rate_pct?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          employment_type?: string
          end_date?: string | null
          first_name?: string
          hourly_rate_default?: number | null
          id?: string
          is_student?: boolean | null
          last_name?: string
          monthly_base?: number | null
          start_date?: string | null
          thirteenth_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          work_rate_pct?: number | null
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          product_service_id: string | null
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          product_service_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          product_service_id?: string | null
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_service_id_fkey"
            columns: ["product_service_id"]
            isOneToOne: false
            referencedRelation: "products_services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          company_id: string | null
          created_at: string
          date: string
          due_date: string
          exported: boolean | null
          id: string
          notes: string | null
          number: string
          status: string | null
          subtotal: number
          total: number
          tva_amount: number
          tva_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          due_date: string
          exported?: boolean | null
          id?: string
          notes?: string | null
          number: string
          status?: string | null
          subtotal?: number
          total?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          company_id?: string | null
          created_at?: string
          date?: string
          due_date?: string
          exported?: boolean | null
          id?: string
          notes?: string | null
          number?: string
          status?: string | null
          subtotal?: number
          total?: number
          tva_amount?: number
          tva_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payruns: {
        Row: {
          aanp_emp: number
          aap_er: number
          ac_emp: number
          ac_er: number
          af_er: number
          avs_ai_apg_emp: number
          avs_ai_apg_er: number
          company_id: string
          created_at: string
          employee_id: string
          employer_cost: number
          gross: number
          hourly_rate: number | null
          hours: number | null
          id: string
          lpp_emp: number
          lpp_er: number
          mode: string
          monthly_gross: number | null
          net: number
          notes: string | null
          period_month: number
          period_year: number
          thirteenth_amount: number | null
          thirteenth_fraction: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aanp_emp?: number
          aap_er?: number
          ac_emp?: number
          ac_er?: number
          af_er?: number
          avs_ai_apg_emp?: number
          avs_ai_apg_er?: number
          company_id: string
          created_at?: string
          employee_id: string
          employer_cost?: number
          gross?: number
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          lpp_emp?: number
          lpp_er?: number
          mode: string
          monthly_gross?: number | null
          net?: number
          notes?: string | null
          period_month: number
          period_year: number
          thirteenth_amount?: number | null
          thirteenth_fraction?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aanp_emp?: number
          aap_er?: number
          ac_emp?: number
          ac_er?: number
          af_er?: number
          avs_ai_apg_emp?: number
          avs_ai_apg_er?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          employer_cost?: number
          gross?: number
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          lpp_emp?: number
          lpp_er?: number
          mode?: string
          monthly_gross?: number | null
          net?: number
          notes?: string | null
          period_month?: number
          period_year?: number
          thirteenth_amount?: number | null
          thirteenth_fraction?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products_services: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_service: boolean | null
          name: string
          price: number
          unit: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_service?: boolean | null
          name: string
          price?: number
          unit?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_service?: boolean | null
          name?: string
          price?: number
          unit?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rates: {
        Row: {
          aanp_employee: number
          aap_employer: number
          ac_ceiling_year: number
          ac_employee: number
          ac_employer: number
          af_employer: number
          avs_ai_apg_employee: number
          avs_ai_apg_employer: number
          company_id: string | null
          created_at: string
          id: string
          lpp_employee: number
          lpp_employer: number
          lpp_enabled: boolean
          lpp_threshold_year: number
          notes: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          aanp_employee?: number
          aap_employer?: number
          ac_ceiling_year?: number
          ac_employee?: number
          ac_employer?: number
          af_employer?: number
          avs_ai_apg_employee?: number
          avs_ai_apg_employer?: number
          company_id?: string | null
          created_at?: string
          id?: string
          lpp_employee?: number
          lpp_employer?: number
          lpp_enabled?: boolean
          lpp_threshold_year?: number
          notes?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          aanp_employee?: number
          aap_employer?: number
          ac_ceiling_year?: number
          ac_employee?: number
          ac_employer?: number
          af_employer?: number
          avs_ai_apg_employee?: number
          avs_ai_apg_employer?: number
          company_id?: string | null
          created_at?: string
          id?: string
          lpp_employee?: number
          lpp_employer?: number
          lpp_enabled?: boolean
          lpp_threshold_year?: number
          notes?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_api_key: string | null
          ai_provider: string
          auto_process: boolean | null
          company_id: string
          created_at: string
          default_accounts: Json | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_api_key?: string | null
          ai_provider?: string
          auto_process?: boolean | null
          company_id: string
          created_at?: string
          default_accounts?: Json | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_api_key?: string | null
          ai_provider?: string
          auto_process?: boolean | null
          company_id?: string
          created_at?: string
          default_accounts?: Json | null
          id?: string
          updated_at?: string
          user_id?: string
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
