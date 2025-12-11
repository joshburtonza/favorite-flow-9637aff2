-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Shipments with full details
CREATE OR REPLACE VIEW v_shipments_full AS
SELECT 
    s.id,
    s.lot_number,
    s.commodity,
    s.eta,
    s.delivery_date,
    s.status,
    s.document_submitted,
    s.telex_released,
    sup.name AS supplier_name,
    sup.currency AS supplier_currency,
    c.name AS client_name,
    sc.supplier_cost,
    sc.freight_cost,
    sc.clearing_cost,
    sc.transport_cost,
    sc.total_foreign,
    sc.source_currency,
    sc.fx_spot_rate,
    sc.fx_applied_rate,
    sc.fx_spread,
    sc.total_zar,
    sc.client_invoice_zar,
    sc.gross_profit_zar,
    sc.fx_commission_zar,
    sc.fx_spread_profit_zar,
    sc.net_profit_zar,
    sc.profit_margin,
    sc.bank_charges,
    s.notes,
    s.created_at,
    s.updated_at
FROM shipments s
LEFT JOIN suppliers sup ON s.supplier_id = sup.id
LEFT JOIN clients c ON s.client_id = c.id
LEFT JOIN shipment_costs sc ON s.id = sc.shipment_id
ORDER BY s.eta DESC NULLS LAST;

-- View: Creditors list (suppliers with balances)
CREATE OR REPLACE VIEW v_creditors AS
SELECT 
    sup.id,
    sup.name AS supplier_name,
    sup.currency,
    sup.current_balance,
    sup.contact_person,
    sup.email,
    sup.phone,
    COUNT(DISTINCT sl.id) AS transaction_count,
    MAX(sl.transaction_date) AS last_transaction_date,
    COUNT(DISTINCT sh.id) AS shipment_count,
    sup.created_at,
    sup.updated_at
FROM suppliers sup
LEFT JOIN supplier_ledger sl ON sup.id = sl.supplier_id
LEFT JOIN shipments sh ON sup.id = sh.supplier_id
GROUP BY sup.id, sup.name, sup.currency, sup.current_balance, 
         sup.contact_person, sup.email, sup.phone, sup.created_at, sup.updated_at
ORDER BY sup.current_balance DESC;

-- View: Pending payments summary
CREATE OR REPLACE VIEW v_pending_payments AS
SELECT 
    ps.id,
    ps.payment_date,
    sup.name AS supplier_name,
    sh.lot_number,
    ps.amount_foreign,
    ps.currency,
    ps.fx_rate,
    ps.amount_zar,
    ps.commission_earned,
    ba.name AS bank_account_name,
    ps.status,
    ps.notes,
    ps.created_at
FROM payment_schedule ps
LEFT JOIN suppliers sup ON ps.supplier_id = sup.id
LEFT JOIN shipments sh ON ps.shipment_id = sh.id
LEFT JOIN bank_accounts ba ON ps.bank_account_id = ba.id
WHERE ps.status = 'pending'
ORDER BY ps.payment_date ASC;

-- View: Automation activity summary
CREATE OR REPLACE VIEW v_automation_summary AS
SELECT 
    DATE(created_at) AS date,
    source,
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE success = true) AS success_count,
    COUNT(*) FILTER (WHERE success = false) AS failed_count,
    COUNT(DISTINCT lot_number) AS unique_lots
FROM automation_logs
GROUP BY DATE(created_at), source
ORDER BY DATE(created_at) DESC, source;

-- ============================================================================
-- ENHANCED PROFIT CALCULATION FUNCTION
-- ============================================================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_calculate_profit ON shipment_costs;

-- Create enhanced calculation function
CREATE OR REPLACE FUNCTION public.calculate_shipment_profit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Calculate total foreign currency cost
    NEW.total_foreign := COALESCE(NEW.supplier_cost, 0) + 
                         COALESCE(NEW.freight_cost, 0) + 
                         COALESCE(NEW.clearing_cost, 0) + 
                         COALESCE(NEW.transport_cost, 0);
    
    -- Calculate FX spread (spot rate - applied rate)
    IF NEW.fx_spot_rate IS NOT NULL AND NEW.fx_applied_rate IS NOT NULL THEN
        NEW.fx_spread := NEW.fx_spot_rate - NEW.fx_applied_rate;
    ELSE
        NEW.fx_spread := 0;
    END IF;
    
    -- Calculate total ZAR cost
    IF NEW.fx_applied_rate IS NOT NULL AND NEW.fx_applied_rate > 0 THEN
        NEW.total_zar := NEW.total_foreign * NEW.fx_applied_rate;
    ELSE
        NEW.total_zar := 0;
    END IF;
    
    -- Calculate FX spread profit (profit from rate difference)
    NEW.fx_spread_profit_zar := NEW.total_foreign * COALESCE(NEW.fx_spread, 0);
    
    -- Calculate FX commission (1.4% of total ZAR)
    NEW.fx_commission_zar := COALESCE(NEW.total_zar, 0) * 0.014;
    
    -- Calculate gross profit (client invoice - total costs)
    NEW.gross_profit_zar := COALESCE(NEW.client_invoice_zar, 0) - COALESCE(NEW.total_zar, 0);
    
    -- Calculate net profit
    -- Net = Gross Profit + FX Commission + FX Spread Profit - Bank Charges
    NEW.net_profit_zar := COALESCE(NEW.gross_profit_zar, 0) + 
                          COALESCE(NEW.fx_commission_zar, 0) + 
                          COALESCE(NEW.fx_spread_profit_zar, 0) - 
                          COALESCE(NEW.bank_charges, 0);
    
    -- Calculate profit margin percentage
    IF COALESCE(NEW.client_invoice_zar, 0) > 0 THEN
        NEW.profit_margin := (NEW.net_profit_zar / NEW.client_invoice_zar) * 100;
    ELSE
        NEW.profit_margin := 0;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate trigger for profit calculations
CREATE TRIGGER trigger_calculate_profit
    BEFORE INSERT OR UPDATE ON shipment_costs
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_shipment_profit();

-- ============================================================================
-- INDEXES FOR PERFORMANCE (if not exists)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_shipments_supplier ON shipments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_shipments_client ON shipments(client_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_eta ON shipments(eta);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_supplier ON supplier_ledger(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ledger_shipment ON supplier_ledger(shipment_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_supplier ON payment_schedule(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedule_date ON payment_schedule(payment_date);
CREATE INDEX IF NOT EXISTS idx_automation_logs_date ON automation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_logs_success ON automation_logs(success);