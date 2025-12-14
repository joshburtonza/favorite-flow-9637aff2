-- ACCOUNTANT permissions (Abdul - financial docs, invoicing)
INSERT INTO public.role_permissions (role, permission) VALUES
('accountant', 'view_dashboard'),
('accountant', 'view_shipments'),
('accountant', 'view_clients'),
('accountant', 'view_suppliers'),
('accountant', 'view_payments'),
('accountant', 'view_documents'),
('accountant', 'view_supplier_invoices'),
('accountant', 'view_packing_lists'),
('accountant', 'manage_payments')
ON CONFLICT DO NOTHING;

-- SHIPPING permissions (Marissa - shipping documents)
INSERT INTO public.role_permissions (role, permission) VALUES
('shipping', 'view_dashboard'),
('shipping', 'view_shipments'),
('shipping', 'manage_shipments'),
('shipping', 'view_documents'),
('shipping', 'manage_documents'),
('shipping', 'view_shipping_documents'),
('shipping', 'view_packing_lists')
ON CONFLICT DO NOTHING;

-- FILE_COSTING permissions (Shamima - costing docs)
INSERT INTO public.role_permissions (role, permission) VALUES
('file_costing', 'view_dashboard'),
('file_costing', 'view_shipments'),
('file_costing', 'view_documents'),
('file_costing', 'view_transport_invoices'),
('file_costing', 'view_clearing_invoices')
ON CONFLICT DO NOTHING;

-- OPERATIONS permissions (Paint shop - read-only tracking)
INSERT INTO public.role_permissions (role, permission) VALUES
('operations', 'view_dashboard'),
('operations', 'view_shipments')
ON CONFLICT DO NOTHING;