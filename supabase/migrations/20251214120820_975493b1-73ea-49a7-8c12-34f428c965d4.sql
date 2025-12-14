-- Insert document permissions for admin (all access)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'view_supplier_invoices'),
  ('admin', 'view_packing_lists'),
  ('admin', 'view_shipping_documents'),
  ('admin', 'view_transport_invoices'),
  ('admin', 'view_clearing_invoices'),
  ('admin', 'download_documents')
ON CONFLICT DO NOTHING;

-- Staff gets view permissions only (no download without approval)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('staff', 'view_supplier_invoices'),
  ('staff', 'view_packing_lists'),
  ('staff', 'view_shipping_documents'),
  ('staff', 'view_transport_invoices'),
  ('staff', 'view_clearing_invoices')
ON CONFLICT DO NOTHING;