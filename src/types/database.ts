export type ShipmentStatus = 'pending' | 'in-transit' | 'documents-submitted' | 'completed';
export type CurrencyType = 'USD' | 'EUR' | 'ZAR';
export type LedgerType = 'debit' | 'credit';
export type PaymentStatus = 'pending' | 'completed';

export interface Supplier {
  id: string;
  name: string;
  currency: CurrencyType;
  current_balance: number;
  contact_person?: string;
  email?: string;
  phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  lot_number: string;
  supplier_id?: string;
  client_id?: string;
  commodity?: string;
  eta?: string;
  status: ShipmentStatus;
  document_submitted: boolean;
  document_submitted_date?: string;
  telex_released: boolean;
  telex_released_date?: string;
  delivery_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  supplier?: Supplier;
  client?: Client;
  costs?: ShipmentCosts;
}

export interface ShipmentCosts {
  id: string;
  shipment_id: string;
  source_currency: CurrencyType;
  supplier_cost: number;
  freight_cost: number;
  clearing_cost: number;
  transport_cost: number;
  total_foreign: number;
  fx_spot_rate: number;
  fx_applied_rate: number;
  fx_spread: number;
  total_zar: number;
  client_invoice_zar: number;
  bank_charges: number;
  gross_profit_zar: number;
  fx_commission_zar: number;
  fx_spread_profit_zar: number;
  net_profit_zar: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplier_id: string;
  shipment_id?: string;
  transaction_date: string;
  invoice_number?: string;
  description?: string;
  ledger_type: LedgerType;
  amount: number;
  balance_after?: number;
  notes?: string;
  created_at: string;
  // Joined data
  shipment?: Shipment;
}

export interface BankAccount {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
  currency: CurrencyType;
  current_balance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentScheduleEntry {
  id: string;
  supplier_id: string;
  shipment_id?: string;
  bank_account_id?: string;
  payment_date: string;
  amount_foreign: number;
  currency: CurrencyType;
  fx_rate: number;
  amount_zar: number;
  commission_earned: number;
  status: PaymentStatus;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  supplier?: Supplier;
  shipment?: Shipment;
  bank_account?: BankAccount;
}

export interface FxRate {
  id: string;
  currency: CurrencyType;
  rate_date: string;
  spot_rate: number;
  applied_rate?: number;
  notes?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}