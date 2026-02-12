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
      ai_tool_executions: {
        Row: {
          affected_entities: Json | null
          completed_at: string | null
          conversation_id: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          input_params: Json
          output_result: Json | null
          started_at: string | null
          success: boolean
          tool_category: string
          tool_name: string
          user_id: string | null
        }
        Insert: {
          affected_entities?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json
          output_result?: Json | null
          started_at?: string | null
          success?: boolean
          tool_category: string
          tool_name: string
          user_id?: string | null
        }
        Update: {
          affected_entities?: Json | null
          completed_at?: string | null
          conversation_id?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          input_params?: Json
          output_result?: Json | null
          started_at?: string | null
          success?: boolean
          tool_category?: string
          tool_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tool_executions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation_memory"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_memory: {
        Row: {
          channel: string
          channel_id: string | null
          content: string
          created_at: string | null
          entities_referenced: Json | null
          id: string
          response_time_ms: number | null
          role: string
          tokens_used: number | null
          tools_used: Json | null
          user_id: string | null
        }
        Insert: {
          channel: string
          channel_id?: string | null
          content: string
          created_at?: string | null
          entities_referenced?: Json | null
          id?: string
          response_time_ms?: number | null
          role: string
          tokens_used?: number | null
          tools_used?: Json | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          channel_id?: string | null
          content?: string
          created_at?: string | null
          entities_referenced?: Json | null
          id?: string
          response_time_ms?: number | null
          role?: string
          tokens_used?: number | null
          tools_used?: Json | null
          user_id?: string | null
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
          row_index: number
          table_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          row_index?: number
          table_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          row_index?: number
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
      document_chunks: {
        Row: {
          chunk_index: number | null
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index?: number | null
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number | null
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extraction_queue: {
        Row: {
          auto_actions_taken: Json | null
          confidence_score: number | null
          created_at: string | null
          document_type: string | null
          error_message: string | null
          extracted_data: Json | null
          extracted_text: string | null
          id: string
          matched_client_id: string | null
          matched_shipment_id: string | null
          matched_supplier_id: string | null
          needs_human_review: boolean | null
          original_file_path: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          processing_time_ms: number | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_reference: string | null
          source_type: string
          status: string | null
        }
        Insert: {
          auto_actions_taken?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          extracted_text?: string | null
          id?: string
          matched_client_id?: string | null
          matched_shipment_id?: string | null
          matched_supplier_id?: string | null
          needs_human_review?: boolean | null
          original_file_path?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_reference?: string | null
          source_type: string
          status?: string | null
        }
        Update: {
          auto_actions_taken?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          extracted_text?: string | null
          id?: string
          matched_client_id?: string | null
          matched_shipment_id?: string | null
          matched_supplier_id?: string | null
          needs_human_review?: boolean | null
          original_file_path?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          processing_time_ms?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extraction_queue_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_queue_matched_shipment_id_fkey"
            columns: ["matched_shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_queue_matched_shipment_id_fkey"
            columns: ["matched_shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_queue_matched_supplier_id_fkey"
            columns: ["matched_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extraction_queue_matched_supplier_id_fkey"
            columns: ["matched_supplier_id"]
            isOneToOne: false
            referencedRelation: "v_creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      document_folders: {
        Row: {
          assigned_staff_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          department_id: string | null
          folder_type: Database["public"]["Enums"]["folder_type"]
          icon: string | null
          id: string
          is_favorite: boolean | null
          name: string
          order_position: number | null
          parent_id: string | null
          shipment_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_staff_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"]
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          name: string
          order_position?: number | null
          parent_id?: string | null
          shipment_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_staff_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          department_id?: string | null
          folder_type?: Database["public"]["Enums"]["folder_type"]
          icon?: string | null
          id?: string
          is_favorite?: boolean | null
          name?: string
          order_position?: number | null
          parent_id?: string | null
          shipment_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_folders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "document_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_folders_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "v_shipments_full"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          color_scheme: Json | null
          created_at: string | null
          created_by: string | null
          document_type: string
          field_mappings: Json | null
          fonts: Json | null
          format_rules: Json | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          template_data: Json | null
          template_file_path: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          color_scheme?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_type: string
          field_mappings?: Json | null
          fonts?: Json | null
          format_rules?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          template_data?: Json | null
          template_file_path?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          color_scheme?: Json | null
          created_at?: string | null
          created_by?: string | null
          document_type?: string
          field_mappings?: Json | null
          fonts?: Json | null
          format_rules?: Json | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          template_data?: Json | null
          template_file_path?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      document_type_definitions: {
        Row: {
          created_at: string | null
          display_name: string
          document_type: string
          extraction_rules: Json
          field_mapping: Json
          id: string
          is_active: boolean | null
          recognition_patterns: Json
          updated_at: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          created_at?: string | null
          display_name: string
          document_type: string
          extraction_rules?: Json
          field_mapping?: Json
          id?: string
          is_active?: boolean | null
          recognition_patterns?: Json
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string
          document_type?: string
          extraction_rules?: Json
          field_mapping?: Json
          id?: string
          is_active?: boolean | null
          recognition_patterns?: Json
          updated_at?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_type_definitions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_type_definitions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "v_creditors"
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
      file_access_log: {
        Row: {
          accessed_at: string | null
          action_type: string | null
          document_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          accessed_at?: string | null
          action_type?: string | null
          document_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          accessed_at?: string | null
          action_type?: string | null
          document_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      file_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          item_id: string | null
          item_name: string | null
          item_type: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          item_id?: string | null
          item_name?: string | null
          item_type?: string
          user_id?: string | null
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
      file_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          document_id: string
          file_hash: string | null
          file_path: string
          file_size: number | null
          id: string
          is_current: boolean | null
          notes: string | null
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          document_id: string
          file_hash?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          document_id?: string
          file_hash?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_current?: boolean | null
          notes?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "file_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uploaded_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_templates: {
        Row: {
          created_at: string
          folder_structure: Json
          id: string
          is_active: boolean
          name: string
          template_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_structure?: Json
          id?: string
          is_active?: boolean
          name: string
          template_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_structure?: Json
          id?: string
          is_active?: boolean
          name?: string
          template_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fx_rate_history: {
        Row: {
          applied_rate: number | null
          captured_at: string | null
          currency_pair: string
          id: string
          lot_number: string | null
          provider: string
          shipment_id: string | null
          source: string | null
          spot_rate: number
          spread: number | null
        }
        Insert: {
          applied_rate?: number | null
          captured_at?: string | null
          currency_pair: string
          id?: string
          lot_number?: string | null
          provider: string
          shipment_id?: string | null
          source?: string | null
          spot_rate: number
          spread?: number | null
        }
        Update: {
          applied_rate?: number | null
          captured_at?: string | null
          currency_pair?: string
          id?: string
          lot_number?: string | null
          provider?: string
          shipment_id?: string | null
          source?: string | null
          spot_rate?: number
          spread?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fx_rate_history_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fx_rate_history_shipment_id_fkey"
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
      notification_log: {
        Row: {
          alert_id: string | null
          channel: string
          channel_user_id: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          sent_at: string | null
          status: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          channel: string
          channel_user_id: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          channel?: string
          channel_user_id?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "proactive_alerts"
            referencedColumns: ["id"]
          },
        ]
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
      proactive_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          action_required: boolean | null
          alert_type: string
          created_at: string | null
          entity_id: string | null
          entity_reference: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          notified_at: string | null
          notified_via: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["alert_severity"]
          status: Database["public"]["Enums"]["alert_status"]
          suggested_action: string | null
          target_role: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_required?: boolean | null
          alert_type: string
          created_at?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notified_at?: string | null
          notified_via?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_action?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          action_required?: boolean | null
          alert_type?: string
          created_at?: string | null
          entity_id?: string | null
          entity_reference?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notified_at?: string | null
          notified_via?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["alert_severity"]
          status?: Database["public"]["Enums"]["alert_status"]
          suggested_action?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
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
      rollback_checkpoints: {
        Row: {
          action_type: string
          ai_conversation_id: string | null
          ai_query: string | null
          can_rollback: boolean | null
          created_at: string | null
          entity_id: string | null
          entity_ids: string[] | null
          entity_type: string
          id: string
          is_rolled_back: boolean | null
          new_state: Json | null
          previous_state: Json
          rollback_expires_at: string | null
          rolled_back_at: string | null
          rolled_back_by: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          ai_conversation_id?: string | null
          ai_query?: string | null
          can_rollback?: boolean | null
          created_at?: string | null
          entity_id?: string | null
          entity_ids?: string[] | null
          entity_type: string
          id?: string
          is_rolled_back?: boolean | null
          new_state?: Json | null
          previous_state: Json
          rollback_expires_at?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          ai_conversation_id?: string | null
          ai_query?: string | null
          can_rollback?: boolean | null
          created_at?: string | null
          entity_id?: string | null
          entity_ids?: string[] | null
          entity_type?: string
          id?: string
          is_rolled_back?: boolean | null
          new_state?: Json | null
          previous_state?: Json
          rollback_expires_at?: string | null
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_channel: string
          delivery_target: string
          id: string
          is_active: boolean | null
          last_run_at: string | null
          last_run_status: string | null
          next_run_at: string | null
          report_name: string
          report_params: Json | null
          report_type: string
          run_count: number | null
          schedule_cron: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_channel: string
          delivery_target: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          report_name: string
          report_params?: Json | null
          report_type: string
          run_count?: number | null
          schedule_cron: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_channel?: string
          delivery_target?: string
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          last_run_status?: string | null
          next_run_at?: string | null
          report_name?: string
          report_params?: Json | null
          report_type?: string
          run_count?: number | null
          schedule_cron?: string
          timezone?: string | null
          updated_at?: string | null
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
      shares: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_public: boolean | null
          item_id: string
          item_type: string
          permission: string
          share_token: string | null
          shared_with_email: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          item_id: string
          item_type: string
          permission?: string
          share_token?: string | null
          shared_with_email?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          item_id?: string
          item_type?: string
          permission?: string
          share_token?: string | null
          shared_with_email?: string | null
        }
        Relationships: []
      }
      shipment_costs: {
        Row: {
          agency_fee: number | null
          bank_charges: number
          cargo_dues: number | null
          clearing_cost: number
          client_invoice_zar: number
          container_landing: number | null
          created_at: string
          customs_duty: number | null
          customs_vat: number | null
          freight_cost: number
          freight_usd: number | null
          freight_zar: number | null
          fx_applied_rate: number
          fx_client_rate: number | null
          fx_commission_zar: number | null
          fx_spot_rate: number
          fx_spread: number | null
          fx_spread_profit_zar: number | null
          gross_profit_zar: number | null
          handover_fee: number | null
          id: string
          net_profit_zar: number | null
          profit_margin: number | null
          shipment_id: string
          source_currency: Database["public"]["Enums"]["currency_type"]
          supplier_cost: number
          total_foreign: number | null
          total_zar: number | null
          transport_cost: number
          transport_surcharges: number | null
          transport_total: number | null
          updated_at: string
        }
        Insert: {
          agency_fee?: number | null
          bank_charges?: number
          cargo_dues?: number | null
          clearing_cost?: number
          client_invoice_zar?: number
          container_landing?: number | null
          created_at?: string
          customs_duty?: number | null
          customs_vat?: number | null
          freight_cost?: number
          freight_usd?: number | null
          freight_zar?: number | null
          fx_applied_rate?: number
          fx_client_rate?: number | null
          fx_commission_zar?: number | null
          fx_spot_rate?: number
          fx_spread?: number | null
          fx_spread_profit_zar?: number | null
          gross_profit_zar?: number | null
          handover_fee?: number | null
          id?: string
          net_profit_zar?: number | null
          profit_margin?: number | null
          shipment_id: string
          source_currency?: Database["public"]["Enums"]["currency_type"]
          supplier_cost?: number
          total_foreign?: number | null
          total_zar?: number | null
          transport_cost?: number
          transport_surcharges?: number | null
          transport_total?: number | null
          updated_at?: string
        }
        Update: {
          agency_fee?: number | null
          bank_charges?: number
          cargo_dues?: number | null
          clearing_cost?: number
          client_invoice_zar?: number
          container_landing?: number | null
          created_at?: string
          customs_duty?: number | null
          customs_vat?: number | null
          freight_cost?: number
          freight_usd?: number | null
          freight_zar?: number | null
          fx_applied_rate?: number
          fx_client_rate?: number | null
          fx_commission_zar?: number | null
          fx_spot_rate?: number
          fx_spread?: number | null
          fx_spread_profit_zar?: number | null
          gross_profit_zar?: number | null
          handover_fee?: number | null
          id?: string
          net_profit_zar?: number | null
          profit_margin?: number | null
          shipment_id?: string
          source_currency?: Database["public"]["Enums"]["currency_type"]
          supplier_cost?: number
          total_foreign?: number | null
          total_zar?: number | null
          transport_cost?: number
          transport_surcharges?: number | null
          transport_total?: number | null
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
          bl_number: string | null
          client_id: string | null
          commodity: string | null
          container_number: string | null
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
          vessel_name: string | null
        }
        Insert: {
          ai_summary?: string | null
          bl_number?: string | null
          client_id?: string | null
          commodity?: string | null
          container_number?: string | null
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
          vessel_name?: string | null
        }
        Update: {
          ai_summary?: string | null
          bl_number?: string | null
          client_id?: string | null
          commodity?: string | null
          container_number?: string | null
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
          vessel_name?: string | null
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
      staff_feedback: {
        Row: {
          admin_notes: string | null
          affected_area: string | null
          category: Database["public"]["Enums"]["feedback_category"]
          created_at: string
          current_url: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["feedback_priority"]
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["feedback_status"]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          affected_area?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          current_url?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["feedback_priority"]
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          affected_area?: string | null
          category?: Database["public"]["Enums"]["feedback_category"]
          created_at?: string
          current_url?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["feedback_priority"]
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["feedback_status"]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_interview_responses: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          question_key: string
          question_text: string
          response_type: Database["public"]["Enums"]["interview_response_type"]
          response_value: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          question_key: string
          question_text: string
          response_type?: Database["public"]["Enums"]["interview_response_type"]
          response_value?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          question_key?: string
          question_text?: string
          response_type?: Database["public"]["Enums"]["interview_response_type"]
          response_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_interview_responses_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "staff_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_interviews: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string
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
      storage_plans: {
        Row: {
          id: string
          is_default: boolean | null
          name: string
          storage_limit_bytes: number
        }
        Insert: {
          id?: string
          is_default?: boolean | null
          name: string
          storage_limit_bytes: number
        }
        Update: {
          id?: string
          is_default?: boolean | null
          name?: string
          storage_limit_bytes?: number
        }
        Relationships: []
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
      testing_results: {
        Row: {
          category: string
          created_at: string
          feature_key: string
          id: string
          notes: string | null
          result: Database["public"]["Enums"]["test_result"]
          run_id: string
          tested_at: string | null
          tester_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          feature_key: string
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["test_result"]
          run_id: string
          tested_at?: string | null
          tester_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          feature_key?: string
          id?: string
          notes?: string | null
          result?: Database["public"]["Enums"]["test_result"]
          run_id?: string
          tested_at?: string | null
          tester_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testing_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "testing_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      testing_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          started_at: string | null
          status: Database["public"]["Enums"]["testing_run_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["testing_run_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["testing_run_status"]
          updated_at?: string
        }
        Relationships: []
      }
      uploaded_documents: {
        Row: {
          access_count: number | null
          ai_classification: string | null
          ai_confidence: number | null
          approved_at: string | null
          approved_by: string | null
          auto_applied: boolean | null
          auto_linked: boolean | null
          auto_route_enabled: boolean | null
          client_name: string | null
          corrected_fields: string[] | null
          department_id: string | null
          description: string | null
          destination_folder: string | null
          display_name: string | null
          document_type: string | null
          extracted_data: Json | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          format_metadata: Json | null
          id: string
          is_favorite: boolean | null
          is_latest_version: boolean | null
          last_accessed_at: string | null
          lot_number: string | null
          original_folder: string | null
          original_name: string | null
          parent_document: string | null
          parsed_structure: Json | null
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
          tags: string[] | null
          template_id: string | null
          thumbnail_path: string | null
          updated_at: string | null
          uploaded_at: string | null
          uploaded_by: string | null
          user_corrected: boolean | null
          version: number | null
          workflow_history: Json | null
          workflow_status: Database["public"]["Enums"]["workflow_status"] | null
        }
        Insert: {
          access_count?: number | null
          ai_classification?: string | null
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_applied?: boolean | null
          auto_linked?: boolean | null
          auto_route_enabled?: boolean | null
          client_name?: string | null
          corrected_fields?: string[] | null
          department_id?: string | null
          description?: string | null
          destination_folder?: string | null
          display_name?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          format_metadata?: Json | null
          id?: string
          is_favorite?: boolean | null
          is_latest_version?: boolean | null
          last_accessed_at?: string | null
          lot_number?: string | null
          original_folder?: string | null
          original_name?: string | null
          parent_document?: string | null
          parsed_structure?: Json | null
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
          tags?: string[] | null
          template_id?: string | null
          thumbnail_path?: string | null
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
          access_count?: number | null
          ai_classification?: string | null
          ai_confidence?: number | null
          approved_at?: string | null
          approved_by?: string | null
          auto_applied?: boolean | null
          auto_linked?: boolean | null
          auto_route_enabled?: boolean | null
          client_name?: string | null
          corrected_fields?: string[] | null
          department_id?: string | null
          description?: string | null
          destination_folder?: string | null
          display_name?: string | null
          document_type?: string | null
          extracted_data?: Json | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          format_metadata?: Json | null
          id?: string
          is_favorite?: boolean | null
          is_latest_version?: boolean | null
          last_accessed_at?: string | null
          lot_number?: string | null
          original_folder?: string | null
          original_name?: string | null
          parent_document?: string | null
          parsed_structure?: Json | null
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
          tags?: string[] | null
          template_id?: string | null
          thumbnail_path?: string | null
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
            foreignKeyName: "uploaded_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "uploaded_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_channel_identities: {
        Row: {
          channel: string
          channel_user_id: string
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          receive_alerts: boolean | null
          receive_briefings: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel: string
          channel_user_id: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          receive_alerts?: boolean | null
          receive_briefings?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          channel_user_id?: string
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          receive_alerts?: boolean | null
          receive_briefings?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
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
      user_preferences: {
        Row: {
          auto_calculate_profit: boolean | null
          confirm_dangerous_ops: boolean | null
          created_at: string | null
          daily_briefing_time: string | null
          include_profit_in_briefing: boolean | null
          language: string | null
          low_margin_threshold: number | null
          notify_low_margin: boolean | null
          notify_new_shipment: boolean | null
          notify_payment_due: boolean | null
          notify_status_change: boolean | null
          preferred_channel: string | null
          response_verbosity: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_calculate_profit?: boolean | null
          confirm_dangerous_ops?: boolean | null
          created_at?: string | null
          daily_briefing_time?: string | null
          include_profit_in_briefing?: boolean | null
          language?: string | null
          low_margin_threshold?: number | null
          notify_low_margin?: boolean | null
          notify_new_shipment?: boolean | null
          notify_payment_due?: boolean | null
          notify_status_change?: boolean | null
          preferred_channel?: string | null
          response_verbosity?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_calculate_profit?: boolean | null
          confirm_dangerous_ops?: boolean | null
          created_at?: string | null
          daily_briefing_time?: string | null
          include_profit_in_briefing?: boolean | null
          language?: string | null
          low_margin_threshold?: number | null
          notify_low_margin?: boolean | null
          notify_new_shipment?: boolean | null
          notify_payment_due?: boolean | null
          notify_status_change?: boolean | null
          preferred_channel?: string | null
          response_verbosity?: string | null
          timezone?: string | null
          updated_at?: string | null
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
      user_storage: {
        Row: {
          file_count: number | null
          id: string
          updated_at: string | null
          used_bytes: number | null
          user_id: string
        }
        Insert: {
          file_count?: number | null
          id?: string
          updated_at?: string | null
          used_bytes?: number | null
          user_id: string
        }
        Update: {
          file_count?: number | null
          id?: string
          updated_at?: string | null
          used_bytes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      voice_messages: {
        Row: {
          audio_duration_seconds: number | null
          audio_file_path: string | null
          audio_format: string | null
          channel: string
          channel_user_id: string | null
          created_at: string | null
          flair_response: string | null
          id: string
          tools_used: string[] | null
          transcription: string | null
          transcription_confidence: number | null
          user_id: string | null
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_file_path?: string | null
          audio_format?: string | null
          channel: string
          channel_user_id?: string | null
          created_at?: string | null
          flair_response?: string | null
          id?: string
          tools_used?: string[] | null
          transcription?: string | null
          transcription_confidence?: number | null
          user_id?: string | null
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_file_path?: string | null
          audio_format?: string | null
          channel?: string
          channel_user_id?: string | null
          created_at?: string | null
          flair_response?: string | null
          id?: string
          tools_used?: string[] | null
          transcription?: string | null
          transcription_confidence?: number | null
          user_id?: string | null
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
      v_latest_fx_rates: {
        Row: {
          applied_rate: number | null
          captured_at: string | null
          currency_pair: string | null
          provider: string | null
          spot_rate: number | null
        }
        Relationships: []
      }
      v_pending_payments: {
        Row: {
          amount_foreign: number | null
          amount_zar: number | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          fx_rate: number | null
          id: string | null
          lot_number: string | null
          notes: string | null
          payment_date: string | null
          shipment_id: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          supplier_id: string | null
          supplier_name: string | null
        }
        Relationships: [
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
      cleanup_old_conversations: { Args: never; Returns: undefined }
      generate_invoice_number: { Args: never; Returns: string }
      get_alert_recipients: {
        Args: never
        Returns: {
          channel: string
          channel_user_id: string
          display_name: string
          quiet_hours_end: string
          quiet_hours_start: string
          user_id: string
        }[]
      }
      get_mtd_totals: {
        Args: { month_start: string }
        Returns: {
          shipment_count: number
          total_profit: number
          total_revenue: number
        }[]
      }
      get_pending_payments_with_urgency: {
        Args: never
        Returns: {
          amount: number
          currency: string
          days_until_due: number
          due_date: string
          id: string
          is_overdue: boolean
          lot_number: string
          supplier_name: string
        }[]
      }
      get_shipments_with_age: {
        Args: { limit_count?: number }
        Returns: {
          client_invoice_zar: number
          client_name: string
          commodity: string
          days_since_eta: number
          document_submitted: boolean
          eta: string
          id: string
          lot_number: string
          net_profit_zar: number
          profit_margin: number
          status: string
          supplier_cost: number
          supplier_name: string
          telex_released: boolean
        }[]
      }
      get_suppliers_summary: {
        Args: never
        Returns: {
          active_shipments: number
          currency: string
          current_balance: number
          days_since_payment: number
          id: string
          last_payment_date: string
          name: string
        }[]
      }
      get_user_by_channel: {
        Args: { p_channel: string; p_channel_user_id: string }
        Returns: {
          display_name: string
          email: string
          is_verified: boolean
          receive_alerts: boolean
          receive_briefings: boolean
          user_id: string
        }[]
      }
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
      is_event_participant: {
        Args: { _event_id: string; _user_id: string }
        Returns: boolean
      }
      match_documents: {
        Args: {
          filter_department_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      alert_severity: "info" | "warning" | "urgent" | "critical"
      alert_status: "active" | "acknowledged" | "resolved" | "dismissed"
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
        | "view_file_costing"
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
      document_status: "new" | "in_progress" | "finalized" | "deleted"
      event_type:
        | "meeting"
        | "reminder"
        | "deadline"
        | "leave"
        | "shipment"
        | "other"
      event_visibility: "private" | "team" | "public"
      feedback_category: "bug" | "suggestion" | "question" | "other"
      feedback_priority: "low" | "medium" | "high" | "critical"
      feedback_status: "new" | "in_progress" | "resolved" | "dismissed"
      file_costing_status: "draft" | "pending_review" | "finalized"
      folder_type: "system" | "staff" | "clearing_agent" | "custom"
      interview_response_type:
        | "text"
        | "rating"
        | "multiple_choice"
        | "checklist"
      interview_status: "pending" | "in_progress" | "completed"
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
      test_result: "untested" | "pass" | "fail" | "skip" | "needs_review"
      testing_run_status: "active" | "completed" | "archived"
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
      alert_severity: ["info", "warning", "urgent", "critical"],
      alert_status: ["active", "acknowledged", "resolved", "dismissed"],
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
        "view_file_costing",
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
      document_status: ["new", "in_progress", "finalized", "deleted"],
      event_type: [
        "meeting",
        "reminder",
        "deadline",
        "leave",
        "shipment",
        "other",
      ],
      event_visibility: ["private", "team", "public"],
      feedback_category: ["bug", "suggestion", "question", "other"],
      feedback_priority: ["low", "medium", "high", "critical"],
      feedback_status: ["new", "in_progress", "resolved", "dismissed"],
      file_costing_status: ["draft", "pending_review", "finalized"],
      folder_type: ["system", "staff", "clearing_agent", "custom"],
      interview_response_type: [
        "text",
        "rating",
        "multiple_choice",
        "checklist",
      ],
      interview_status: ["pending", "in_progress", "completed"],
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
      test_result: ["untested", "pass", "fail", "skip", "needs_review"],
      testing_run_status: ["active", "completed", "archived"],
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
