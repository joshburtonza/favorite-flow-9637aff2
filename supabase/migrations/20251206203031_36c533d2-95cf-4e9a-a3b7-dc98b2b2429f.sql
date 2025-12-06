-- Create enum types for status
CREATE TYPE shipment_status AS ENUM ('pending', 'in-transit', 'documents-submitted', 'completed');
CREATE TYPE currency_type AS ENUM ('USD', 'EUR', 'ZAR');
CREATE TYPE ledger_type AS ENUM ('debit', 'credit');
CREATE TYPE payment_status AS ENUM ('pending', 'completed');

-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  currency currency_type NOT NULL DEFAULT 'USD',
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  commodity TEXT,
  eta DATE,
  status shipment_status NOT NULL DEFAULT 'pending',
  document_submitted BOOLEAN NOT NULL DEFAULT false,
  document_submitted_date DATE,
  telex_released BOOLEAN NOT NULL DEFAULT false,
  telex_released_date DATE,
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipment_costs table with auto-calculated fields
CREATE TABLE public.shipment_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL UNIQUE REFERENCES public.shipments(id) ON DELETE CASCADE,
  source_currency currency_type NOT NULL DEFAULT 'USD',
  supplier_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  freight_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  clearing_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  transport_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_foreign DECIMAL(15, 2) GENERATED ALWAYS AS (supplier_cost + freight_cost + clearing_cost + transport_cost) STORED,
  fx_spot_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  fx_applied_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  fx_spread DECIMAL(10, 4) GENERATED ALWAYS AS (fx_spot_rate - fx_applied_rate) STORED,
  total_zar DECIMAL(15, 2) GENERATED ALWAYS AS ((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate) STORED,
  client_invoice_zar DECIMAL(15, 2) NOT NULL DEFAULT 0,
  bank_charges DECIMAL(15, 2) NOT NULL DEFAULT 0,
  gross_profit_zar DECIMAL(15, 2) GENERATED ALWAYS AS (client_invoice_zar - ((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate)) STORED,
  fx_commission_zar DECIMAL(15, 2) GENERATED ALWAYS AS (((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate) * 0.014) STORED,
  fx_spread_profit_zar DECIMAL(15, 2) GENERATED ALWAYS AS ((supplier_cost + freight_cost + clearing_cost + transport_cost) * (fx_spot_rate - fx_applied_rate)) STORED,
  net_profit_zar DECIMAL(15, 2) GENERATED ALWAYS AS (
    (client_invoice_zar - ((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate)) 
    + (((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate) * 0.014)
    + ((supplier_cost + freight_cost + clearing_cost + transport_cost) * (fx_spot_rate - fx_applied_rate))
    - bank_charges
  ) STORED,
  profit_margin DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN client_invoice_zar > 0 THEN
      ((
        (client_invoice_zar - ((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate)) 
        + (((supplier_cost + freight_cost + clearing_cost + transport_cost) * fx_applied_rate) * 0.014)
        + ((supplier_cost + freight_cost + clearing_cost + transport_cost) * (fx_spot_rate - fx_applied_rate))
        - bank_charges
      ) / client_invoice_zar) * 100
    ELSE 0 END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier_ledger table
CREATE TABLE public.supplier_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_number TEXT,
  description TEXT,
  ledger_type ledger_type NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  currency currency_type NOT NULL DEFAULT 'ZAR',
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payment_schedule table
CREATE TABLE public.payment_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount_foreign DECIMAL(15, 2) NOT NULL,
  currency currency_type NOT NULL DEFAULT 'USD',
  fx_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
  amount_zar DECIMAL(15, 2) GENERATED ALWAYS AS (amount_foreign * fx_rate) STORED,
  commission_earned DECIMAL(15, 2) GENERATED ALWAYS AS (amount_foreign * fx_rate * 0.014) STORED,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fx_rates table for historical tracking
CREATE TABLE public.fx_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency currency_type NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  spot_rate DECIMAL(10, 4) NOT NULL,
  applied_rate DECIMAL(10, 4),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - All authenticated users have full access for MVP
CREATE POLICY "Authenticated users can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert suppliers" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update suppliers" ON public.suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete suppliers" ON public.suppliers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view shipments" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert shipments" ON public.shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shipments" ON public.shipments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete shipments" ON public.shipments FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view shipment_costs" ON public.shipment_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert shipment_costs" ON public.shipment_costs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update shipment_costs" ON public.shipment_costs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete shipment_costs" ON public.shipment_costs FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view supplier_ledger" ON public.supplier_ledger FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert supplier_ledger" ON public.supplier_ledger FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update supplier_ledger" ON public.supplier_ledger FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete supplier_ledger" ON public.supplier_ledger FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view bank_accounts" ON public.bank_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bank_accounts" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bank_accounts" ON public.bank_accounts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete bank_accounts" ON public.bank_accounts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view payment_schedule" ON public.payment_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert payment_schedule" ON public.payment_schedule FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update payment_schedule" ON public.payment_schedule FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete payment_schedule" ON public.payment_schedule FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view fx_rates" ON public.fx_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fx_rates" ON public.fx_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update fx_rates" ON public.fx_rates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete fx_rates" ON public.fx_rates FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

-- Create trigger for profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update supplier balance after ledger entry
CREATE OR REPLACE FUNCTION public.update_supplier_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_balance DECIMAL(15, 2);
BEGIN
  SELECT COALESCE(SUM(CASE WHEN ledger_type = 'debit' THEN amount ELSE -amount END), 0)
  INTO new_balance
  FROM public.supplier_ledger
  WHERE supplier_id = NEW.supplier_id;
  
  UPDATE public.suppliers
  SET current_balance = new_balance, updated_at = now()
  WHERE id = NEW.supplier_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for supplier balance updates
CREATE TRIGGER update_supplier_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_supplier_balance();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shipment_costs_updated_at BEFORE UPDATE ON public.shipment_costs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_schedule_updated_at BEFORE UPDATE ON public.payment_schedule FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default bank accounts
INSERT INTO public.bank_accounts (name, currency, current_balance) VALUES
  ('SWISS - OURS', 'USD', 0),
  ('FNB', 'ZAR', 0),
  ('OBEID', 'USD', 0);

-- Create indexes for better performance
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_shipments_eta ON public.shipments(eta);
CREATE INDEX idx_shipments_supplier ON public.shipments(supplier_id);
CREATE INDEX idx_shipments_client ON public.shipments(client_id);
CREATE INDEX idx_supplier_ledger_supplier ON public.supplier_ledger(supplier_id);
CREATE INDEX idx_supplier_ledger_date ON public.supplier_ledger(transaction_date);
CREATE INDEX idx_payment_schedule_supplier ON public.payment_schedule(supplier_id);
CREATE INDEX idx_payment_schedule_status ON public.payment_schedule(status);