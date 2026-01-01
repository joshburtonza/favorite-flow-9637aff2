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
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: string
          severity: string
          title: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: string
          severity?: string
          title: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: string
          severity?: string
          title?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_event_logs: {
        Row: {
          after_state: Json | null
          ai_classification: string | null
          ai_confidence: number | null
          ai_extracted_data: Json | null
          ai_summary: string | null
          before_state: Json | null
          changes: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_type: string
          id: string
          metadata: Json | null
          related_entities: Json | null
          timestamp: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          after_state?: Json | null
          ai_classification?: string | null
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          before_state?: Json | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_type: string
          id?: string
          metadata?: Json | null
          related_entities?: Json | null
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          after_state?: Json | null
          ai_classification?: string | null
          ai_confidence?: number | null
          ai_extracted_data?: Json | null
          ai_summary?: string | null
          before_state?: Json | null
          changes?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          related_entities?: Json | null
          timestamp?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          failed_at: string | null
          id: string
          job_type: string
          max_attempts: number
          params: Json
          priority: number
          result: Json | null
          started_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_at?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          params?: Json
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          failed_at?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          params?: Json
          priority?: number
          result?: Json | null
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean
          priority: Database["public"]["Enums"]["announcement_priority"]
          target_audience: Database["public"]["Enums"]["target_audience"]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: Database["public"]["Enums"]["announcement_priority"]
          target_audience?: Database["public"]["Enums"]["target_audience"]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean
          priority?: Database["public"]["Enums"]["announcement_priority"]
          target_audience?: Database["public"]["Enums"]["target_audience"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          action: string
          created_at: string | null
          error: string | null
          id: string
          lot_number: string | null
          request_body: Json | null
          response: Json | null
          source: string
          success: boolean | null
        }
        Insert: {
          action: string
          created_at?: string | null
          error?: string | null
          id?: string
          lot_number?: string | null
          request_body?: Json | null
          response?: Json | null
          source: string
          success?: boolean | null
        }
        Update: {
          action?: string
          created_at?: string | null
          error?: string | null
          id?: string
          lot_number?: string | null
          request_body?: Json | null
          response?: Json | null
          source?: string
          success?: boolean | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          csv_data: string | null
          document_count: number | null
          id: string
          imported_count: number | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          csv_data?: string | null
          document_count?: number | null
          id?: string
          imported_count?: number | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          csv_data?: string | null
          document_count?: number | null
          id?: string
          imported_count?: number | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_invoices: {
        Row: {
          amount_zar: number
          client_id: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          line_items: Json | null
          lot_number: string | null
          notes: string | null
          paid_date: string | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          total_amount: number | null
          updated_at: string
          vat_amount: number | null
        }
        Insert: {
          amount_zar?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          line_items?: Json | null
          lot_number?: string | null
          notes?: string | null
          paid_date?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Update: {
          amount_zar?: number
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          line_items?: Json | null
          lot_number?: string | null
          notes?: string | null
          paid_date?: string | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          total_amount?: number | null
          updated_at?: string
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_invoices_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_type: Database["public"]["Enums"]["column_type"]
          created_at: string
          default_value: string | null
          id: string
          is_required: boolean | null
          name: string
          options: Json | null
          order_position: number | null
          table_id: string
          width: number | null
        }
        Insert: {
          column_type?: Database["public"]["Enums"]["column_type"]
          created_at?: string
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          options?: Json | null
          order_position?: number | null
          table_id: string
          width?: number | null
        }
        Update: {
          column_type?: Database["public"]["Enums"]["column_type"]
          created_at?: string
          default_value?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          options?: Json | null
          order_position?: number | null
          table_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_columns_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_rows: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          table_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_rows_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "custom_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tables: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          is_system: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lead_user_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lead_user_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_folders: {
        Row: {
          assigned_staff_id: string | null
          created_at: string
          created_by: string | null
          folder_type: Database["public"]["Enums"]["folder_type"]
          id: string
          name: string
          order_position: number | null
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"]
          id?: string
          name: string
          order_position?: number | null
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string
          created_by?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"]
          id?: string
          name?: string
          order_position?: number | null
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      duplicate_detection_settings: {
        Row: {
          auto_block_exact_duplicates: boolean | null
          check_invoice_numbers: boolean | null
          created_at: string | null
          duplicate_check_days: number | null
          duplicate_detection_enabled: boolean | null
          filename_similarity_threshold: number | null
          id: string
          updated_at: string | null
        }
        Insert: {
          auto_block_exact_duplicates?: boolean | null
          check_invoice_numbers?: boolean | null
          created_at?: string | null
          duplicate_check_days?: number | null
          duplicate_detection_enabled?: boolean | null
          filename_similarity_threshold?: number | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          auto_block_exact_duplicates?: boolean | null
          check_invoice_numbers?: boolean | null
          created_at?: string | null
          duplicate_check_days?: number | null
          duplicate_detection_enabled?: boolean | null
          filename_similarity_threshold?: number | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          event_id: string
          id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "team_events"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_corrections: {
        Row: {
          ai_extracted_value: string | null
          corrected_at: string | null
          corrected_by: string | null
          correction_context: Json | null
          created_at: string | null
          document_id: string | null
          document_type: string | null
          field_name: string
          id: string
          user_corrected_value: string | null
        }
        Insert: {
          ai_extracted_value?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_context?: Json | null
          created_at?: string | null
          document_id?: string | null
          document_type?: string | null
          field_name: string
          id?: string
          user_corrected_value?: string | null
        }
        Update: {
          ai_extracted_value?: string | null
          corrected_at?: string | null
          corrected_by?: string | null
          correction_context?: Json | null
          created_at?: string | null
          document_id?: string | null
          document_type?: string | null
          field_name?: string
          id?: string
          user_corrected_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "extraction_corrections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_stats: {
        Row: {
          accuracy_rate: number | null
          corrections_count: number | null
          created_at: string | null
          document_type: string
          field_name: string
          id: string
          total_extractions: number | null
          updated_at: string | null
        }
        Insert: {
          accuracy_rate?: number | null
          corrections_count?: number | null
          created_at?: string | null
          document_type: string
          field_name: string
          id?: string
          total_extractions?: number | null
          updated_at?: string | null
        }
        Update: {
          accuracy_rate?: number | null
          corrections_count?: number | null
          created_at?: string | null
          document_type?: string
          field_name?: string
          id?: string
          total_extractions?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      file_costings: {
        Row: {
          clearing_cost_zar: number | null
          clearing_documents: Json | null
          created_at: string | null
          created_by: string | null
          finalized_at: string | null
          finalized_by: string | null
          grand_total_zar: number | null
          id: string
          lot_number: string | null
          notes: string | null
          other_costs_zar: number | null
          other_documents: Json | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["file_costing_status"] | null
          transport_cost_zar: number | null
          transport_documents: Json | null
          updated_at: string | null
        }
        Insert: {
          clearing_cost_zar?: number | null
          clearing_documents?: Json | null
          created_at?: string | null
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total_zar?: number | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          other_costs_zar?: number | null
          other_documents?: Json | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["file_costing_status"] | null
          transport_cost_zar?: number | null
          transport_documents?: Json | null
          updated_at?: string | null
        }
        Update: {
          clearing_cost_zar?: number | null
          clearing_documents?: Json | null
          created_at?: string | null
          created_by?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          grand_total_zar?: number | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          other_costs_zar?: number | null
          other_documents?: Json | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["file_costing_status"] | null
          transport_cost_zar?: number | null
          transport_documents?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_costings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_costings_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_rates: {
        Row: {
          applied_rate: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          notes: string | null
          rate_date: string
          spot_rate: number
        }
        Insert: {
          applied_rate?: number | null
          created_at?: string
          currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          rate_date?: string
          spot_rate: number
        }
        Update: {
          applied_rate?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          rate_date?: string
          spot_rate?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          priority: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          priority?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_schedule: {
        Row: {
          amount_foreign: number
          amount_zar: number | null
          bank_account_id: string | null
          commission_earned: number | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          fx_rate: number
          id: string
          notes: string | null
          paid_date: string | null
          payment_date: string
          shipment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at: string
        }
        Insert: {
          amount_foreign: number
          amount_zar?: number | null
          bank_account_id?: string | null
          commission_earned?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          fx_rate?: number
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date: string
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id: string
          updated_at?: string
        }
        Update: {
          amount_foreign?: number
          amount_zar?: number | null
          bank_account_id?: string | null
          commission_earned?: number | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          fx_rate?: number
          id?: string
          notes?: string | null
          paid_date?: string | null
          payment_date?: string
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          supplier_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedule_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_schedule_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      security_requests: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          expires_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          request_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          request_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      shipment_costs: {
        Row: {
          bank_charges: number
          clearing_cost: number
          client_invoice_zar: number
          created_at: string
          freight_cost: number
          fx_applied_rate: number
          fx_commission_zar: number | null
          fx_spot_rate: number
          fx_spread: number | null
          fx_spread_profit_zar: number | null
          gross_profit_zar: number | null
          id: string
          net_profit_zar: number | null
          profit_margin: number | null
          shipment_id: string
          source_currency: Database["public"]["Enums"]["currency_type"]
          supplier_cost: number
          total_foreign: number | null
          total_zar: number | null
          transport_cost: number
          updated_at: string
        }
        Insert: {
          bank_charges?: number
          clearing_cost?: number
          client_invoice_zar?: number
          created_at?: string
          freight_cost?: number
          fx_applied_rate?: number
          fx_commission_zar?: number | null
          fx_spot_rate?: number
          fx_spread?: number | null
          fx_spread_profit_zar?: number | null
          gross_profit_zar?: number | null
          id?: string
          net_profit_zar?: number | null
          profit_margin?: number | null
          shipment_id: string
          source_currency?: Database["public"]["Enums"]["currency_type"]
          supplier_cost?: number
          total_foreign?: number | null
          total_zar?: number | null
          transport_cost?: number
          updated_at?: string
        }
        Update: {
          bank_charges?: number
          clearing_cost?: number
          client_invoice_zar?: number
          created_at?: string
          freight_cost?: number
          fx_applied_rate?: number
          fx_commission_zar?: number | null
          fx_spot_rate?: number
          fx_spread?: number | null
          fx_spread_profit_zar?: number | null
          gross_profit_zar?: number | null
          id?: string
          net_profit_zar?: number | null
          profit_margin?: number | null
          shipment_id?: string
          source_currency?: Database["public"]["Enums"]["currency_type"]
          supplier_cost?: number
          total_foreign?: number | null
          total_zar?: number | null
          transport_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipment_costs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_costs_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: true
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          ai_summary: string | null
          client_id: string | null
          commodity: string | null
          created_at: string
          delivery_date: string | null
          document_submitted: boolean
          document_submitted_date: string | null
          eta: string | null
          id: string
          last_updated_by: string | null
          lot_number: string
          notes: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          supplier_id: string | null
          telex_released: boolean
          telex_released_date: string | null
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          delivery_date?: string | null
          document_submitted?: boolean
          document_submitted_date?: string | null
          eta?: string | null
          id?: string
          last_updated_by?: string | null
          lot_number: string
          notes?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string | null
          telex_released?: boolean
          telex_released_date?: string | null
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          delivery_date?: string | null
          document_submitted?: boolean
          document_submitted_date?: string | null
          eta?: string | null
          id?: string
          last_updated_by?: string | null
          lot_number?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string | null
          telex_released?: boolean
          telex_released_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_document_access: {
        Row: {
          can_download: boolean | null
          can_view: boolean | null
          created_at: string | null
          document_type: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_download?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          document_type: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_download?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          document_type?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          department_id: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string | null
          id: string
          invoice_number: string | null
          ledger_type: Database["public"]["Enums"]["ledger_type"]
          notes: string | null
          shipment_id: string | null
          supplier_id: string
          transaction_date: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          ledger_type: Database["public"]["Enums"]["ledger_type"]
          notes?: string | null
          shipment_id?: string | null
          supplier_id: string
          transaction_date?: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string | null
          id?: string
          invoice_number?: string | null
          ledger_type?: Database["public"]["Enums"]["ledger_type"]
          notes?: string | null
          shipment_id?: string | null
          supplier_id?: string
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_ledger_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_ledger_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "v_creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_person: string | null
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          current_balance: number
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          current_balance?: number
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          document_id: string | null
          due_date: string | null
          id: string
          lot_number: string | null
          notes: string | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          id?: string
          lot_number?: string | null
          notes?: string | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      team_conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string | null
          name: string | null
          participant_ids: string[]
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          participant_ids?: string[]
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string | null
          name?: string | null
          participant_ids?: string[]
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      team_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          recurring_rule: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          start_time: string | null
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["event_visibility"]
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          recurring_rule?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          recurring_rule?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["event_visibility"]
        }
        Relationships: []
      }
      team_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_by: string[]
          reply_to_id: string | null
          sender_id: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_by?: string[]
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_by?: string[]
          reply_to_id?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "team_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_documents: {
        Row: {
          ai_classification: string | null
          ai_confidence: number | null
          approved_at: string | null
          approved_by: string | null
          auto_applied: boolean | null
          auto_linked: boolean | null
          auto_route_enabled: boolean | null
          client_name: string | null
          corrected_fields: string[] | null
          destination_folder: string | null
          document_type: string | null
          extracted_data: Json | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          is_latest_version: boolean | null
          lot_number: string | null
          original_folder: string | null
          parent_document: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          replaced_by: string | null
          requires_approval: boolean | null
          requires_manual_entry: boolean | null
          requires_manual_linking: boolean | null
          requires_user_review: boolean | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["document_status"] | null
          summary: string | null
          supplier_name: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          user_corrected: boolean | null
          version: number | null
          workflow_history: Json | null
          workflow_status: Database["public"]["Enums"]["workflow_status"] | null
        }
        Insert: {
          ai_classification?: string | null
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_applied?: boolean | null
          auto_linked?: boolean | null
          auto_route_enabled?: boolean | null
          client_name?: string | null
          corrected_fields?: string[] | null
          destination_folder?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          lot_number?: string | null
          original_folder?: string | null
          parent_document?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replaced_by?: string | null
          requires_approval?: boolean | null
          requires_manual_entry?: boolean | null
          requires_manual_linking?: boolean | null
          requires_user_review?: boolean | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          summary?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_corrected?: boolean | null
          version?: number | null
          workflow_history?: Json | null
          workflow_status?:
            | Database["public"]["Enums"]["workflow_status"]
            | null
        }
        Update: {
          ai_classification?: string | null
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_applied?: boolean | null
          auto_linked?: boolean | null
          auto_route_enabled?: boolean | null
          client_name?: string | null
          corrected_fields?: string[] | null
          destination_folder?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_latest_version?: boolean | null
          lot_number?: string | null
          original_folder?: string | null
          parent_document?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          replaced_by?: string | null
          requires_approval?: boolean | null
          requires_manual_entry?: boolean | null
          requires_manual_linking?: boolean | null
          requires_user_review?: boolean | null
          shipment_id?: string | null
          status?: Database["public"]["Enums"]["document_status"] | null
          summary?: string | null
          supplier_name?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          user_corrected?: boolean | null
          version?: number | null
          workflow_history?: Json | null
          workflow_status?:
            | Database["public"]["Enums"]["workflow_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_documents_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission: Database["public"]["Enums"]["app_permission"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["app_permission"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_automation_summary: {
        Row: {
          date: string | null
          failed_count: number | null
          source: string | null
          success_count: number | null
          total_count: number | null
          unique_lots: number | null
        }
        Relationships: []
      }
      v_creditors: {
        Row: {
          contact_person: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          current_balance: number | null
          email: string | null
          id: string | null
          last_transaction_date: string | null
          phone: string | null
          shipment_count: number | null
          supplier_name: string | null
          transaction_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_pending_payments: {
        Row: {
          amount_foreign: number | null
          amount_zar: number | null
          bank_account_name: string | null
          commission_earned: number | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          fx_rate: number | null
          id: string | null
          lot_number: string | null
          notes: string | null
          payment_date: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          supplier_name: string | null
        }
        Relationships: []
      }
      v_shipments_full: {
        Row: {
          bank_charges: number | null
          clearing_cost: number | null
          client_invoice_zar: number | null
          client_name: string | null
          commodity: string | null
          created_at: string | null
          delivery_date: string | null
          document_submitted: boolean | null
          eta: string | null
          freight_cost: number | null
          fx_applied_rate: number | null
          fx_commission_zar: number | null
          fx_spot_rate: number | null
          fx_spread: number | null
          fx_spread_profit_zar: number | null
          gross_profit_zar: number | null
          id: string | null
          lot_number: string | null
          net_profit_zar: number | null
          notes: string | null
          profit_margin: number | null
          source_currency: Database["public"]["Enums"]["currency_type"] | null
          status: Database["public"]["Enums"]["shipment_status"] | null
          supplier_cost: number | null
          supplier_currency: Database["public"]["Enums"]["currency_type"] | null
          supplier_name: string | null
          telex_released: boolean | null
          total_foreign: number | null
          total_zar: number | null
          transport_cost: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      has_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["app_permission"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      announcement_priority: "urgent" | "high" | "normal" | "low"
      app_permission:
        | "view_dashboard"
        | "manage_shipments"
        | "view_shipments"
        | "manage_suppliers"
        | "view_suppliers"
        | "manage_clients"
        | "view_clients"
        | "manage_payments"
        | "view_payments"
        | "view_financials"
        | "manage_documents"
        | "view_documents"
        | "manage_team"
        | "manage_bank_accounts"
        | "bulk_import"
        | "view_supplier_invoices"
        | "view_packing_lists"
        | "view_shipping_documents"
        | "view_transport_invoices"
        | "view_clearing_invoices"
        | "download_documents"
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "staff"
        | "accountant"
        | "shipping"
        | "file_costing"
        | "operations"
      column_type:
        | "text"
        | "number"
        | "date"
        | "select"
        | "multi_select"
        | "checkbox"
        | "currency"
        | "link"
        | "email"
        | "phone"
      conversation_type: "direct" | "group"
      currency_type: "USD" | "EUR" | "ZAR"
      document_status: "new" | "in_progress" | "finalized"
      event_type:
        | "meeting"
        | "reminder"
        | "deadline"
        | "leave"
        | "shipment"
        | "other"
      event_visibility: "private" | "team" | "public"
      file_costing_status: "draft" | "pending_review" | "finalized"
      folder_type: "system" | "staff" | "clearing_agent" | "custom"
      invoice_status: "draft" | "sent" | "paid" | "cancelled"
      ledger_type: "debit" | "credit"
      payment_status: "pending" | "completed"
      rsvp_status: "pending" | "accepted" | "declined" | "tentative"
      shipment_status:
        | "pending"
        | "in-transit"
        | "documents-submitted"
        | "completed"
      target_audience:
        | "all"
        | "admin"
        | "staff"
        | "moderator"
        | "accountant"
        | "shipping"
        | "file_costing"
        | "operations"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      workflow_status:
        | "draft"
        | "pending_review"
        | "approved"
        | "rejected"
        | "archived"
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
      announcement_priority: ["urgent", "high", "normal", "low"],
      app_permission: [
        "view_dashboard",
        "manage_shipments",
        "view_shipments",
        "manage_suppliers",
        "view_suppliers",
        "manage_clients",
        "view_clients",
        "manage_payments",
        "view_payments",
        "view_financials",
        "manage_documents",
        "view_documents",
        "manage_team",
        "manage_bank_accounts",
        "bulk_import",
        "view_supplier_invoices",
        "view_packing_lists",
        "view_shipping_documents",
        "view_transport_invoices",
        "view_clearing_invoices",
        "download_documents",
      ],
      app_role: [
        "admin",
        "moderator",
        "user",
        "staff",
        "accountant",
        "shipping",
        "file_costing",
        "operations",
      ],
      column_type: [
        "text",
        "number",
        "date",
        "select",
        "multi_select",
        "checkbox",
        "currency",
        "link",
        "email",
        "phone",
      ],
      conversation_type: ["direct", "group"],
      currency_type: ["USD", "EUR", "ZAR"],
      document_status: ["new", "in_progress", "finalized"],
      event_type: [
        "meeting",
        "reminder",
        "deadline",
        "leave",
        "shipment",
        "other",
      ],
      event_visibility: ["private", "team", "public"],
      file_costing_status: ["draft", "pending_review", "finalized"],
      folder_type: ["system", "staff", "clearing_agent", "custom"],
      invoice_status: ["draft", "sent", "paid", "cancelled"],
      ledger_type: ["debit", "credit"],
      payment_status: ["pending", "completed"],
      rsvp_status: ["pending", "accepted", "declined", "tentative"],
      shipment_status: [
        "pending",
        "in-transit",
        "documents-submitted",
        "completed",
      ],
      target_audience: [
        "all",
        "admin",
        "staff",
        "moderator",
        "accountant",
        "shipping",
        "file_costing",
        "operations",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      workflow_status: [
        "draft",
        "pending_review",
        "approved",
        "rejected",
        "archived",
      ],
    },
  },
} as const
