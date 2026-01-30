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
      acc_entry_lines: {
        Row: {
          account_code: string
          account_name: string
          amount_net: number | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
          vat_amount: number | null
          vat_code: string | null
          vat_rate: number | null
        }
        Insert: {
          account_code: string
          account_name: string
          amount_net?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
          vat_amount?: number | null
          vat_code?: string | null
          vat_rate?: number | null
        }
        Update: {
          account_code?: string
          account_name?: string
          amount_net?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          vat_amount?: number | null
          vat_code?: string | null
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "acc_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      acc_posting_rules: {
        Row: {
          account_code: string
          account_name: string
          company_id: string
          created_at: string
          event_type: string
          formula_json: Json | null
          id: string
          is_active: boolean
          line_type: string
          updated_at: string
          user_id: string
          vat_code_default: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          company_id: string
          created_at?: string
          event_type: string
          formula_json?: Json | null
          id?: string
          is_active?: boolean
          line_type: string
          updated_at?: string
          user_id: string
          vat_code_default?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          company_id?: string
          created_at?: string
          event_type?: string
          formula_json?: Json | null
          id?: string
          is_active?: boolean
          line_type?: string
          updated_at?: string
          user_id?: string
          vat_code_default?: string | null
        }
        Relationships: []
      }
      account_alias: {
        Row: {
          company_id: string
          created_at: string
          effective_date: string
          id: string
          new_code: string
          old_code: string
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_date?: string
          id?: string
          new_code: string
          old_code: string
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_date?: string
          id?: string
          new_code?: string
          old_code?: string
        }
        Relationships: []
      }
      account_changes: {
        Row: {
          applied_at: string
          change_type: string
          company_id: string
          diff_json: Json | null
          id: string
          migration_date: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          change_type: string
          company_id: string
          diff_json?: Json | null
          id?: string
          migration_date?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          change_type?: string
          company_id?: string
          diff_json?: Json | null
          id?: string
          migration_date?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      account_template_lines: {
        Row: {
          code: string
          id: string
          level: number
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          parent_code: string | null
          sort_order: number | null
          template_id: string
          vat_code_default: string | null
        }
        Insert: {
          code: string
          id?: string
          level: number
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          parent_code?: string | null
          sort_order?: number | null
          template_id: string
          vat_code_default?: string | null
        }
        Update: {
          code?: string
          id?: string
          level?: number
          name?: string
          nature?: Database["public"]["Enums"]["account_nature"]
          parent_code?: string | null
          sort_order?: number | null
          template_id?: string
          vat_code_default?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "account_template_lines_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "account_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      account_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locale: string
          name: string
          sector: string
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          name: string
          sector: string
          version?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          name?: string
          sector?: string
          version?: string
        }
        Relationships: []
      }
      accounting_entries: {
        Row: {
          account_code: string
          account_name: string
          auto_generated: boolean
          company_id: string | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["entry_type"] | null
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          posted_at: string | null
          reversed_of: string | null
          source_id: string | null
          source_type: string | null
          user_id: string
        }
        Insert: {
          account_code: string
          account_name: string
          auto_generated?: boolean
          company_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["entry_type"] | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          posted_at?: string | null
          reversed_of?: string | null
          source_id?: string | null
          source_type?: string | null
          user_id: string
        }
        Update: {
          account_code?: string
          account_name?: string
          auto_generated?: boolean
          company_id?: string | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["entry_type"] | null
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          posted_at?: string | null
          reversed_of?: string | null
          source_id?: string | null
          source_type?: string | null
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
      accounts: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          level: number
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          parent_code: string | null
          updated_at: string
          vat_code_default: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          level: number
          name: string
          nature: Database["public"]["Enums"]["account_nature"]
          parent_code?: string | null
          updated_at?: string
          vat_code_default?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          level?: number
          name?: string
          nature?: Database["public"]["Enums"]["account_nature"]
          parent_code?: string | null
          updated_at?: string
          vat_code_default?: string | null
        }
        Relationships: []
      }
      allowances_profiles: {
        Row: {
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          holiday_pct: number
          id: string
          name: string
          notes: string | null
          thirteenth_pct: number
          updated_at: string
          user_id: string
          vacation_pct: number
        }
        Insert: {
          company_id: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holiday_pct?: number
          id?: string
          name: string
          notes?: string | null
          thirteenth_pct?: number
          updated_at?: string
          user_id: string
          vacation_pct?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          holiday_pct?: number
          id?: string
          name?: string
          notes?: string | null
          thirteenth_pct?: number
          updated_at?: string
          user_id?: string
          vacation_pct?: number
        }
        Relationships: []
      }
      annual_certificates: {
        Row: {
          certificate_year: number
          company_id: string
          created_at: string
          employee_id: string
          generated_at: string
          id: string
          pdf_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_year: number
          company_id: string
          created_at?: string
          employee_id: string
          generated_at?: string
          id?: string
          pdf_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_year?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          generated_at?: string
          id?: string
          pdf_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_subscriptions: {
        Row: {
          app_name: Database["public"]["Enums"]["app_name"]
          company_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_product_id: string | null
          stripe_subscription_id: string | null
          subscribed_at: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          app_name: Database["public"]["Enums"]["app_name"]
          company_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          app_name?: Database["public"]["Enums"]["app_name"]
          company_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_product_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_at?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          settings_jsonb: Json | null
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
          settings_jsonb?: Json | null
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
          settings_jsonb?: Json | null
          theme_color?: string | null
          tva_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      company_ui_presets: {
        Row: {
          company_id: string
          labels_json: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          labels_json?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          labels_json?: Json
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          accounting_entries_generated: boolean | null
          company_id: string | null
          confidence_score: number | null
          created_at: string
          document_type: string
          extracted_data: Json | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          parse_method: string | null
          processed_at: string | null
          processing_status: string | null
          raw_text: string | null
          scanned_by_user_id: string | null
          status: string
          text_hash: string | null
          updated_at: string
          user_id: string
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          accounting_entries_generated?: boolean | null
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string
          extracted_data?: Json | null
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          parse_method?: string | null
          processed_at?: string | null
          processing_status?: string | null
          raw_text?: string | null
          scanned_by_user_id?: string | null
          status?: string
          text_hash?: string | null
          updated_at?: string
          user_id: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          accounting_entries_generated?: boolean | null
          company_id?: string | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string
          extracted_data?: Json | null
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          parse_method?: string | null
          processed_at?: string | null
          processing_status?: string | null
          raw_text?: string | null
          scanned_by_user_id?: string | null
          status?: string
          text_hash?: string | null
          updated_at?: string
          user_id?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: []
      }
      domain_outbox: {
        Row: {
          company_id: string
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          next_run_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          next_run_at?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          next_run_at?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      employee_lpp_overrides: {
        Row: {
          created_at: string
          effective_from: string | null
          employee_id: string
          employer_share_override: number | null
          id: string
          notes: string | null
          plan_id: string | null
          risk_admin_rate_override: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string | null
          employee_id: string
          employer_share_override?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          risk_admin_rate_override?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string | null
          employee_id?: string
          employer_share_override?: number | null
          id?: string
          notes?: string | null
          plan_id?: string | null
          risk_admin_rate_override?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_lpp_overrides_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_lpp_overrides_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lpp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_replacements: {
        Row: {
          company_id: string
          created_at: string | null
          employee_id: string
          end_date: string
          event_type: string
          id: string
          indemnity_rate: number | null
          notes: string | null
          replacement_employee_id: string | null
          replacement_type: string
          start_date: string
          temp_first_name: string | null
          temp_hourly_rate: number | null
          temp_last_name: string | null
          temp_monthly_base: number | null
          updated_at: string | null
          waiting_days: number | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          employee_id: string
          end_date: string
          event_type: string
          id?: string
          indemnity_rate?: number | null
          notes?: string | null
          replacement_employee_id?: string | null
          replacement_type: string
          start_date: string
          temp_first_name?: string | null
          temp_hourly_rate?: number | null
          temp_last_name?: string | null
          temp_monthly_base?: number | null
          updated_at?: string | null
          waiting_days?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          employee_id?: string
          end_date?: string
          event_type?: string
          id?: string
          indemnity_rate?: number | null
          notes?: string | null
          replacement_employee_id?: string | null
          replacement_type?: string
          start_date?: string
          temp_first_name?: string | null
          temp_hourly_rate?: number | null
          temp_last_name?: string | null
          temp_monthly_base?: number | null
          updated_at?: string | null
          waiting_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_replacements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_replacements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_replacements_replacement_employee_id_fkey"
            columns: ["replacement_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          allowances_profile_id: string | null
          avs_number: string | null
          birth_date: string | null
          canton: string | null
          city: string | null
          company_id: string
          created_at: string
          email: string | null
          employment_type: string
          end_date: string | null
          first_name: string
          holiday_pct_override: number | null
          hourly_rate_default: number | null
          id: string
          insurance_config_id: string | null
          is_replacement: boolean | null
          is_student: boolean | null
          last_name: string
          lpp_enrolled: boolean | null
          monthly_base: number | null
          nationality: string | null
          npa: string | null
          pay_type: string
          start_date: string | null
          thirteenth_enabled: boolean | null
          thirteenth_pct_override: number | null
          updated_at: string
          user_id: string
          vacation_pct_override: number | null
          weekly_hours_target: number | null
          work_rate_pct: number | null
        }
        Insert: {
          address?: string | null
          allowances_profile_id?: string | null
          avs_number?: string | null
          birth_date?: string | null
          canton?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          employment_type?: string
          end_date?: string | null
          first_name: string
          holiday_pct_override?: number | null
          hourly_rate_default?: number | null
          id?: string
          insurance_config_id?: string | null
          is_replacement?: boolean | null
          is_student?: boolean | null
          last_name: string
          lpp_enrolled?: boolean | null
          monthly_base?: number | null
          nationality?: string | null
          npa?: string | null
          pay_type?: string
          start_date?: string | null
          thirteenth_enabled?: boolean | null
          thirteenth_pct_override?: number | null
          updated_at?: string
          user_id: string
          vacation_pct_override?: number | null
          weekly_hours_target?: number | null
          work_rate_pct?: number | null
        }
        Update: {
          address?: string | null
          allowances_profile_id?: string | null
          avs_number?: string | null
          birth_date?: string | null
          canton?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          employment_type?: string
          end_date?: string | null
          first_name?: string
          holiday_pct_override?: number | null
          hourly_rate_default?: number | null
          id?: string
          insurance_config_id?: string | null
          is_replacement?: boolean | null
          is_student?: boolean | null
          last_name?: string
          lpp_enrolled?: boolean | null
          monthly_base?: number | null
          nationality?: string | null
          npa?: string | null
          pay_type?: string
          start_date?: string | null
          thirteenth_enabled?: boolean | null
          thirteenth_pct_override?: number | null
          updated_at?: string
          user_id?: string
          vacation_pct_override?: number | null
          weekly_hours_target?: number | null
          work_rate_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_allowances_profile_id_fkey"
            columns: ["allowances_profile_id"]
            isOneToOne: false
            referencedRelation: "allowances_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_configs: {
        Row: {
          accident_cap_yearly: number
          company_id: string
          created_at: string
          has_ijm: boolean
          id: string
          ijm_rate: number
          ijm_waiting_days: number
          laa_rate: number
          laa_waiting_days: number
          lpp_threshold_yearly: number
          nbu_threshold_hours_per_week: number
          salary_avg_window_default: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accident_cap_yearly?: number
          company_id: string
          created_at?: string
          has_ijm?: boolean
          id?: string
          ijm_rate?: number
          ijm_waiting_days?: number
          laa_rate?: number
          laa_waiting_days?: number
          lpp_threshold_yearly?: number
          nbu_threshold_hours_per_week?: number
          salary_avg_window_default?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accident_cap_yearly?: number
          company_id?: string
          created_at?: string
          has_ijm?: boolean
          id?: string
          ijm_rate?: number
          ijm_waiting_days?: number
          laa_rate?: number
          laa_waiting_days?: number
          lpp_threshold_yearly?: number
          nbu_threshold_hours_per_week?: number
          salary_avg_window_default?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_appointments: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          ends_at: string
          id: string
          invoice_id: string | null
          location: string | null
          session_id: string | null
          starts_at: string
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          invoice_id?: string | null
          location?: string | null
          session_id?: string | null
          starts_at: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          invoice_id?: string | null
          location?: string | null
          session_id?: string | null
          starts_at?: string
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_appointments_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_appointments_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      invoice_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          fee_amount: number
          id: string
          invoice_id: string
          method: string
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          fee_amount?: number
          id?: string
          invoice_id: string
          method: string
          paid_at?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          fee_amount?: number
          id?: string
          invoice_id?: string
          method?: string
          paid_at?: string
          reference?: string | null
        }
        Relationships: []
      }
      invoice_sessions: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          ended_at: string | null
          id: string
          invoice_id: string | null
          notes_text: string | null
          started_at: string | null
          status: string
          title: string | null
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          invoice_id?: string | null
          notes_text?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          invoice_id?: string | null
          notes_text?: string | null
          started_at?: string | null
          status?: string
          title?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_sessions_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      lpp_age_rates: {
        Row: {
          age_max: number
          age_min: number
          created_at: string
          id: string
          plan_id: string
          total_saving_rate: number
        }
        Insert: {
          age_max: number
          age_min: number
          created_at?: string
          id?: string
          plan_id: string
          total_saving_rate: number
        }
        Update: {
          age_max?: number
          age_min?: number
          created_at?: string
          id?: string
          plan_id?: string
          total_saving_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "lpp_age_rates_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "lpp_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lpp_plans: {
        Row: {
          company_id: string | null
          coordination_deduction: number
          created_at: string
          default_employer_share: number
          entry_threshold: number
          id: string
          is_active: boolean | null
          max_insurable_salary: number
          name: string
          risk_admin_rate: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          company_id?: string | null
          coordination_deduction?: number
          created_at?: string
          default_employer_share?: number
          entry_threshold?: number
          id?: string
          is_active?: boolean | null
          max_insurable_salary?: number
          name: string
          risk_admin_rate?: number
          updated_at?: string
          user_id: string
          year?: number
        }
        Update: {
          company_id?: string | null
          coordination_deduction?: number
          created_at?: string
          default_employer_share?: number
          entry_threshold?: number
          id?: string
          is_active?: boolean | null
          max_insurable_salary?: number
          name?: string
          risk_admin_rate?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "lpp_plans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      numbering_settings: {
        Row: {
          company_id: string
          created_at: string
          document_type: string
          format_pattern: string
          id: string
          next_number: number
          prefix: string | null
          reset_yearly: boolean
          suffix: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          document_type: string
          format_pattern?: string
          id?: string
          next_number?: number
          prefix?: string | null
          reset_yearly?: boolean
          suffix?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          document_type?: string
          format_pattern?: string
          id?: string
          next_number?: number
          prefix?: string | null
          reset_yearly?: boolean
          suffix?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payroll_lpp_lines: {
        Row: {
          age_years: number
          annual_gross: number
          annual_insured_salary: number
          company_id: string
          created_at: string
          employee_id: string
          employee_risk_admin: number
          employee_saving: number
          employer_risk_admin: number
          employer_saving: number
          employer_share: number
          id: string
          monthly_insured_salary: number
          payrun_id: string
          period_month: number
          period_year: number
          plan_id: string
          risk_admin_rate: number
          saving_rate: number
          user_id: string
        }
        Insert: {
          age_years: number
          annual_gross: number
          annual_insured_salary: number
          company_id: string
          created_at?: string
          employee_id: string
          employee_risk_admin?: number
          employee_saving?: number
          employer_risk_admin?: number
          employer_saving?: number
          employer_share: number
          id?: string
          monthly_insured_salary: number
          payrun_id: string
          period_month: number
          period_year: number
          plan_id: string
          risk_admin_rate: number
          saving_rate: number
          user_id: string
        }
        Update: {
          age_years?: number
          annual_gross?: number
          annual_insured_salary?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          employee_risk_admin?: number
          employee_saving?: number
          employer_risk_admin?: number
          employer_saving?: number
          employer_share?: number
          id?: string
          monthly_insured_salary?: number
          payrun_id?: string
          period_month?: number
          period_year?: number
          plan_id?: string
          risk_admin_rate?: number
          saving_rate?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_lpp_lines_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "payruns"
            referencedColumns: ["id"]
          },
        ]
      }
      payrun_audit: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_reason: string | null
          created_at: string | null
          field_name: string
          id: string
          modified_at: string
          modified_by: string
          new_value: string | null
          old_value: string | null
          payrun_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          created_at?: string | null
          field_name: string
          id?: string
          modified_at?: string
          modified_by: string
          new_value?: string | null
          old_value?: string | null
          payrun_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_reason?: string | null
          created_at?: string | null
          field_name?: string
          id?: string
          modified_at?: string
          modified_by?: string
          new_value?: string | null
          old_value?: string | null
          payrun_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrun_audit_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "payruns"
            referencedColumns: ["id"]
          },
        ]
      }
      payrun_benefits: {
        Row: {
          amount: number
          benefit_type: string
          created_at: string
          description: string | null
          id: string
          payrun_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          benefit_type: string
          created_at?: string
          description?: string | null
          id?: string
          payrun_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          benefit_type?: string
          created_at?: string
          description?: string | null
          id?: string
          payrun_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payrun_drafts: {
        Row: {
          benefits: Json | null
          company_id: string
          created_at: string | null
          employee_id: string
          gross: number | null
          hourly_rate: number | null
          hours: number | null
          id: string
          net: number | null
          period_month: number
          period_year: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          benefits?: Json | null
          company_id: string
          created_at?: string | null
          employee_id: string
          gross?: number | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          net?: number | null
          period_month: number
          period_year: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          benefits?: Json | null
          company_id?: string
          created_at?: string | null
          employee_id?: string
          gross?: number | null
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          net?: number | null
          period_month?: number
          period_year?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payrun_drafts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrun_drafts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          avg_window: string | null
          avs_ai_apg_emp: number
          avs_ai_apg_er: number
          avs_number: string | null
          benefits_total: number | null
          birth_date: string | null
          company_car_private: boolean | null
          company_id: string
          computed_jsonb: Json | null
          created_at: string
          employee_id: string
          employer_cost: number
          event_type: string | null
          free_canteen: boolean | null
          free_lodging: boolean | null
          free_transport: boolean | null
          gross: number
          hourly_rate: number | null
          hours: number | null
          id: string
          indemnity_rate: number | null
          lpp_emp: number
          lpp_er: number
          lpp_status: string | null
          mode: string
          modification_notes: string | null
          modified_at: string | null
          modified_by: string | null
          monthly_gross: number | null
          net: number
          net_calculation_mode: boolean | null
          notes: string | null
          other_benefits: boolean | null
          payment_date: string | null
          payment_method: string | null
          pdf_path: string | null
          period_from: string | null
          period_month: number
          period_to: string | null
          period_year: number
          r1_salary: number | null
          r10_1_lpp_ordinary: number | null
          r10_2_lpp_purchase: number | null
          r11_net_determinant: number | null
          r12_withholding_tax: number | null
          r13_1_1_travel_expenses: number | null
          r13_1_2_other_expenses: number | null
          r13_2_1_representation: number | null
          r13_2_2_car_expenses: number | null
          r13_2_3_other_deductible: number | null
          r13_3_performance_bonus: number | null
          r14_other_non_valuable: string | null
          r15_observations: string | null
          r2_1_pension: number | null
          r2_2_car_private: number | null
          r2_3_other_benefits: number | null
          r3_non_periodic: number | null
          r4_capital: number | null
          r5_participation: number | null
          r6_director_fees: number | null
          r7_other_compensation: number | null
          r8_gross_total: number | null
          r9_social_deductions: number | null
          sent_at: string | null
          status: string | null
          thirteenth_amount: number | null
          thirteenth_fraction: number | null
          updated_at: string
          user_id: string
          waiting_days: number | null
        }
        Insert: {
          aanp_emp?: number
          aap_er?: number
          ac_emp?: number
          ac_er?: number
          af_er?: number
          avg_window?: string | null
          avs_ai_apg_emp?: number
          avs_ai_apg_er?: number
          avs_number?: string | null
          benefits_total?: number | null
          birth_date?: string | null
          company_car_private?: boolean | null
          company_id: string
          computed_jsonb?: Json | null
          created_at?: string
          employee_id: string
          employer_cost?: number
          event_type?: string | null
          free_canteen?: boolean | null
          free_lodging?: boolean | null
          free_transport?: boolean | null
          gross?: number
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          indemnity_rate?: number | null
          lpp_emp?: number
          lpp_er?: number
          lpp_status?: string | null
          mode: string
          modification_notes?: string | null
          modified_at?: string | null
          modified_by?: string | null
          monthly_gross?: number | null
          net?: number
          net_calculation_mode?: boolean | null
          notes?: string | null
          other_benefits?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          pdf_path?: string | null
          period_from?: string | null
          period_month: number
          period_to?: string | null
          period_year: number
          r1_salary?: number | null
          r10_1_lpp_ordinary?: number | null
          r10_2_lpp_purchase?: number | null
          r11_net_determinant?: number | null
          r12_withholding_tax?: number | null
          r13_1_1_travel_expenses?: number | null
          r13_1_2_other_expenses?: number | null
          r13_2_1_representation?: number | null
          r13_2_2_car_expenses?: number | null
          r13_2_3_other_deductible?: number | null
          r13_3_performance_bonus?: number | null
          r14_other_non_valuable?: string | null
          r15_observations?: string | null
          r2_1_pension?: number | null
          r2_2_car_private?: number | null
          r2_3_other_benefits?: number | null
          r3_non_periodic?: number | null
          r4_capital?: number | null
          r5_participation?: number | null
          r6_director_fees?: number | null
          r7_other_compensation?: number | null
          r8_gross_total?: number | null
          r9_social_deductions?: number | null
          sent_at?: string | null
          status?: string | null
          thirteenth_amount?: number | null
          thirteenth_fraction?: number | null
          updated_at?: string
          user_id: string
          waiting_days?: number | null
        }
        Update: {
          aanp_emp?: number
          aap_er?: number
          ac_emp?: number
          ac_er?: number
          af_er?: number
          avg_window?: string | null
          avs_ai_apg_emp?: number
          avs_ai_apg_er?: number
          avs_number?: string | null
          benefits_total?: number | null
          birth_date?: string | null
          company_car_private?: boolean | null
          company_id?: string
          computed_jsonb?: Json | null
          created_at?: string
          employee_id?: string
          employer_cost?: number
          event_type?: string | null
          free_canteen?: boolean | null
          free_lodging?: boolean | null
          free_transport?: boolean | null
          gross?: number
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          indemnity_rate?: number | null
          lpp_emp?: number
          lpp_er?: number
          lpp_status?: string | null
          mode?: string
          modification_notes?: string | null
          modified_at?: string | null
          modified_by?: string | null
          monthly_gross?: number | null
          net?: number
          net_calculation_mode?: boolean | null
          notes?: string | null
          other_benefits?: boolean | null
          payment_date?: string | null
          payment_method?: string | null
          pdf_path?: string | null
          period_from?: string | null
          period_month?: number
          period_to?: string | null
          period_year?: number
          r1_salary?: number | null
          r10_1_lpp_ordinary?: number | null
          r10_2_lpp_purchase?: number | null
          r11_net_determinant?: number | null
          r12_withholding_tax?: number | null
          r13_1_1_travel_expenses?: number | null
          r13_1_2_other_expenses?: number | null
          r13_2_1_representation?: number | null
          r13_2_2_car_expenses?: number | null
          r13_2_3_other_deductible?: number | null
          r13_3_performance_bonus?: number | null
          r14_other_non_valuable?: string | null
          r15_observations?: string | null
          r2_1_pension?: number | null
          r2_2_car_private?: number | null
          r2_3_other_benefits?: number | null
          r3_non_periodic?: number | null
          r4_capital?: number | null
          r5_participation?: number | null
          r6_director_fees?: number | null
          r7_other_compensation?: number | null
          r8_gross_total?: number | null
          r9_social_deductions?: number | null
          sent_at?: string | null
          status?: string | null
          thirteenth_amount?: number | null
          thirteenth_fraction?: number | null
          updated_at?: string
          user_id?: string
          waiting_days?: number | null
        }
        Relationships: []
      }
      payslip_items: {
        Row: {
          amount: number
          created_at: string
          hours: number | null
          id: string
          kind: string
          meta: Json | null
          payrun_id: string
          rate: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          hours?: number | null
          id?: string
          kind: string
          meta?: Json | null
          payrun_id: string
          rate?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          hours?: number | null
          id?: string
          kind?: string
          meta?: Json | null
          payrun_id?: string
          rate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslip_items_payrun_id_fkey"
            columns: ["payrun_id"]
            isOneToOne: false
            referencedRelation: "payruns"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          payrun_id: string
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          payrun_id: string
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          payrun_id?: string
          pdf_url?: string | null
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
      time_entries: {
        Row: {
          company_id: string
          created_at: string
          date: string
          employee_id: string
          hourly_rate_override: number | null
          hourly_rate_snapshot: number
          hours: number
          id: string
          multiplier: number
          task_label: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date: string
          employee_id: string
          hourly_rate_override?: number | null
          hourly_rate_snapshot?: number
          hours?: number
          id?: string
          multiplier?: number
          task_label?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date?: string
          employee_id?: string
          hourly_rate_override?: number | null
          hourly_rate_snapshot?: number
          hours?: number
          id?: string
          multiplier?: number
          task_label?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          ai_api_key: string | null
          ai_mode: string | null
          ai_provider: string
          auto_process: boolean | null
          company_id: string
          created_at: string
          default_accounts: Json | null
          id: string
          ollama_enabled: boolean | null
          ollama_model: string | null
          ollama_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_api_key?: string | null
          ai_mode?: string | null
          ai_provider?: string
          auto_process?: boolean | null
          company_id: string
          created_at?: string
          default_accounts?: Json | null
          id?: string
          ollama_enabled?: boolean | null
          ollama_model?: string | null
          ollama_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_api_key?: string | null
          ai_mode?: string | null
          ai_provider?: string
          auto_process?: boolean | null
          company_id?: string
          created_at?: string
          default_accounts?: Json | null
          id?: string
          ollama_enabled?: boolean | null
          ollama_model?: string | null
          ollama_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vendor_templates: {
        Row: {
          company_id: string
          confidence_boost: number | null
          created_at: string | null
          default_account_code: string | null
          extraction_rules: Json
          id: string
          last_used_at: string | null
          signature_patterns: Json
          success_rate: number | null
          updated_at: string | null
          usage_count: number | null
          user_id: string
          vendor_key: string
          vendor_name: string
        }
        Insert: {
          company_id: string
          confidence_boost?: number | null
          created_at?: string | null
          default_account_code?: string | null
          extraction_rules?: Json
          id?: string
          last_used_at?: string | null
          signature_patterns?: Json
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
          vendor_key: string
          vendor_name: string
        }
        Update: {
          company_id?: string
          confidence_boost?: number | null
          created_at?: string | null
          default_account_code?: string | null
          extraction_rules?: Json
          id?: string
          last_used_at?: string | null
          signature_patterns?: Json
          success_rate?: number | null
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
          vendor_key?: string
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mat_view_document_confidence: {
        Row: {
          avg_confidence: number | null
          company_id: string | null
          document_type: string | null
          high_confidence: number | null
          low_confidence: number | null
          medium_confidence: number | null
          parsed_ai: number | null
          parsed_deterministic: number | null
          parsed_manual: number | null
          period_month: string | null
          total_documents: number | null
        }
        Relationships: []
      }
      mat_view_invoices_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          company_id: string | null
          invoice_count: number | null
          month: string | null
          total_invoiced: number | null
          total_paid: number | null
          total_unpaid: number | null
          user_id: string | null
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
      mat_view_kpis_monthly: {
        Row: {
          cashflow_gross: number | null
          company_id: string | null
          month: string | null
          result_net: number | null
          user_id: string | null
          vat_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mat_view_monthly_totals: {
        Row: {
          company_id: string | null
          expense_gross: number | null
          expense_net: number | null
          income_gross: number | null
          income_net: number | null
          month: string | null
          user_id: string | null
          vat_input: number | null
          vat_output: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mat_view_payroll_monthly: {
        Row: {
          company_id: string | null
          employee_count: number | null
          payslip_count: number | null
          period_month: number | null
          period_year: number | null
          total_employer_cost: number | null
          total_gross: number | null
          total_net: number | null
          user_id: string | null
        }
        Relationships: []
      }
      view_account_ledger: {
        Row: {
          account_code: string | null
          account_name: string | null
          company_id: string | null
          credit: number | null
          debit: number | null
          description: string | null
          entry_date: string | null
          running_balance: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_invoices_summary: {
        Row: {
          client_id: string | null
          client_name: string | null
          company_id: string | null
          invoice_count: number | null
          month: string | null
          total_invoiced: number | null
          total_paid: number | null
          total_unpaid: number | null
          user_id: string | null
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
      view_kpis_monthly: {
        Row: {
          cashflow_gross: number | null
          company_id: string | null
          month: string | null
          result_net: number | null
          user_id: string | null
          vat_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_monthly_totals: {
        Row: {
          company_id: string | null
          expense_gross: number | null
          expense_net: number | null
          income_gross: number | null
          income_net: number | null
          month: string | null
          user_id: string | null
          vat_input: number | null
          vat_output: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      view_payroll_monthly: {
        Row: {
          company_id: string | null
          employee_count: number | null
          payslip_count: number | null
          period_month: number | null
          period_year: number | null
          total_employer_cost: number | null
          total_gross: number | null
          total_net: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      account_has_entries: {
        Args: { p_account_code: string; p_company_id: string }
        Returns: boolean
      }
      can_modify_payrun: {
        Args: { p_payrun_id: string; p_user_id: string }
        Returns: Json
      }
      compute_hourly_allowances: {
        Args: {
          p_employee_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      create_default_rates_for_user: { Args: never; Returns: undefined }
      create_session_direct: {
        Args: { p_client_id: string; p_started_at?: string }
        Returns: string
      }
      get_user_role_in_company: {
        Args: { p_company_id: string; p_user_id: string }
        Returns: string
      }
      has_app_access: {
        Args: {
          p_app_name: Database["public"]["Enums"]["app_name"]
          p_company_id: string
        }
        Returns: boolean
      }
      is_member_company: { Args: { c_id: string }; Returns: boolean }
      refresh_all_materialized_views: { Args: never; Returns: undefined }
      refresh_coaching_materialized_views: { Args: never; Returns: undefined }
      refresh_compta_materialized_views: { Args: never; Returns: undefined }
      refresh_paie_materialized_views: { Args: never; Returns: undefined }
      rpc_create_session: {
        Args: { p_client_id: string; p_started_at?: string }
        Returns: string
      }
      rpc_finalize_session: {
        Args: { p_ended_at?: string; p_session_id: string; p_title?: string }
        Returns: undefined
      }
      rpc_invoice_from_session: {
        Args: {
          p_product_id?: string
          p_quantity?: number
          p_session_id: string
          p_unit_price?: number
        }
        Returns: string
      }
      rpc_record_payment: {
        Args: {
          p_amount: number
          p_fee_amount?: number
          p_invoice_id: string
          p_method: string
          p_paid_at?: string
          p_reference?: string
        }
        Returns: string
      }
    }
    Enums: {
      account_nature: "Actif" | "Passif" | "Charge" | "Produit" | "Ordre"
      app_name: "compta" | "coaching" | "rh_paie"
      entry_type: "income" | "expense" | "transfer" | "opening" | "closing"
      subscription_status: "active" | "trial" | "suspended" | "cancelled"
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
    Enums: {
      account_nature: ["Actif", "Passif", "Charge", "Produit", "Ordre"],
      app_name: ["compta", "coaching", "rh_paie"],
      entry_type: ["income", "expense", "transfer", "opening", "closing"],
      subscription_status: ["active", "trial", "suspended", "cancelled"],
    },
  },
} as const
