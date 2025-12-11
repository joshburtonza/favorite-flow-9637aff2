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
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string
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
          client_id: string | null
          commodity: string | null
          created_at: string
          delivery_date: string | null
          document_submitted: boolean
          document_submitted_date: string | null
          eta: string | null
          id: string
          lot_number: string
          notes: string | null
          status: Database["public"]["Enums"]["shipment_status"]
          supplier_id: string | null
          telex_released: boolean
          telex_released_date: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          delivery_date?: string | null
          document_submitted?: boolean
          document_submitted_date?: string | null
          eta?: string | null
          id?: string
          lot_number: string
          notes?: string | null
          status?: Database["public"]["Enums"]["shipment_status"]
          supplier_id?: string | null
          telex_released?: boolean
          telex_released_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          commodity?: string | null
          created_at?: string
          delivery_date?: string | null
          document_submitted?: boolean
          document_submitted_date?: string | null
          eta?: string | null
          id?: string
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
      [_ in never]: never
    }
    Enums: {
      currency_type: "USD" | "EUR" | "ZAR"
      ledger_type: "debit" | "credit"
      payment_status: "pending" | "completed"
      shipment_status:
        | "pending"
        | "in-transit"
        | "documents-submitted"
        | "completed"
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
      currency_type: ["USD", "EUR", "ZAR"],
      ledger_type: ["debit", "credit"],
      payment_status: ["pending", "completed"],
      shipment_status: [
        "pending",
        "in-transit",
        "documents-submitted",
        "completed",
      ],
    },
  },
} as const
