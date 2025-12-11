-- Fix Security Definer Views - Set to SECURITY INVOKER
-- This ensures views respect RLS policies of the querying user

ALTER VIEW v_shipments_full SET (security_invoker = true);
ALTER VIEW v_creditors SET (security_invoker = true);
ALTER VIEW v_pending_payments SET (security_invoker = true);
ALTER VIEW v_automation_summary SET (security_invoker = true);