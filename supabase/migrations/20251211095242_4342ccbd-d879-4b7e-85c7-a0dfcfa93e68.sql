-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shipment_costs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.supplier_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE public.automation_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;