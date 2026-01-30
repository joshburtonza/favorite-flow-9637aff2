-- Context loading functions for FLAIR Orchestrator

-- Get shipments with calculated age
CREATE OR REPLACE FUNCTION get_shipments_with_age(limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
  id UUID, lot_number TEXT, status TEXT, supplier_name TEXT, client_name TEXT,
  commodity TEXT, eta DATE, supplier_cost DECIMAL, client_invoice_zar DECIMAL,
  net_profit_zar DECIMAL, profit_margin DECIMAL, document_submitted BOOLEAN,
  telex_released BOOLEAN, days_since_eta INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.lot_number, s.status::TEXT, sup.name, cli.name, s.commodity, s.eta,
    COALESCE(sc.supplier_cost, 0), COALESCE(sc.client_invoice_zar, 0),
    COALESCE(sc.net_profit_zar, 0), COALESCE(sc.profit_margin, 0),
    s.document_submitted, s.telex_released,
    CASE WHEN s.eta IS NOT NULL THEN (CURRENT_DATE - s.eta)::INTEGER ELSE 0 END
  FROM shipments s
  LEFT JOIN suppliers sup ON s.supplier_id = sup.id
  LEFT JOIN clients cli ON s.client_id = cli.id
  LEFT JOIN shipment_costs sc ON sc.shipment_id = s.id
  ORDER BY s.created_at DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Get suppliers summary with activity
CREATE OR REPLACE FUNCTION get_suppliers_summary()
RETURNS TABLE (
  id UUID, name TEXT, currency TEXT, current_balance DECIMAL,
  active_shipments BIGINT, last_payment_date DATE, days_since_payment INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT sup.id, sup.name, sup.currency::TEXT, sup.current_balance,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status NOT IN ('completed', 'cancelled')),
    MAX(sl.transaction_date) FILTER (WHERE sl.ledger_type = 'credit'),
    CASE WHEN MAX(sl.transaction_date) FILTER (WHERE sl.ledger_type = 'credit') IS NOT NULL
      THEN (CURRENT_DATE - MAX(sl.transaction_date) FILTER (WHERE sl.ledger_type = 'credit'))::INTEGER
      ELSE NULL END
  FROM suppliers sup
  LEFT JOIN shipments s ON s.supplier_id = sup.id
  LEFT JOIN supplier_ledger sl ON sl.supplier_id = sup.id
  GROUP BY sup.id ORDER BY sup.current_balance DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Get pending payments with urgency indicators
CREATE OR REPLACE FUNCTION get_pending_payments_with_urgency()
RETURNS TABLE (
  id UUID, supplier_name TEXT, amount DECIMAL, currency TEXT,
  due_date DATE, days_until_due INTEGER, lot_number TEXT, is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT ps.id, sup.name, ps.amount_foreign, ps.currency::TEXT, ps.payment_date,
    (ps.payment_date - CURRENT_DATE)::INTEGER, s.lot_number,
    ps.payment_date < CURRENT_DATE
  FROM payment_schedule ps
  JOIN suppliers sup ON ps.supplier_id = sup.id
  LEFT JOIN shipments s ON ps.shipment_id = s.id
  WHERE ps.status = 'pending' ORDER BY ps.payment_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Get MTD totals for dashboard
CREATE OR REPLACE FUNCTION get_mtd_totals(month_start DATE)
RETURNS TABLE (total_revenue DECIMAL, total_profit DECIMAL, shipment_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(SUM(sc.client_invoice_zar), 0), COALESCE(SUM(sc.net_profit_zar), 0), COUNT(*)
  FROM shipments s JOIN shipment_costs sc ON sc.shipment_id = s.id
  WHERE s.status = 'completed' AND s.delivery_date >= month_start;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;