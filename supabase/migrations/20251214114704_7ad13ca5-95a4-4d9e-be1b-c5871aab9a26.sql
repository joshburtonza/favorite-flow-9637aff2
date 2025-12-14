-- Create permissions enum
CREATE TYPE public.app_permission AS ENUM (
  'view_dashboard',
  'manage_shipments',
  'view_shipments',
  'manage_suppliers',
  'view_suppliers',
  'manage_clients',
  'view_clients',
  'manage_payments',
  'view_payments',
  'view_financials',
  'manage_documents',
  'view_documents',
  'manage_team',
  'manage_bank_accounts',
  'bulk_import'
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission app_permission NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, permission)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for role_permissions
CREATE POLICY "Anyone can view role permissions"
ON public.role_permissions FOR SELECT
USING (true);

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  )
$$;

-- Insert default permissions for admin (all permissions)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('admin', 'view_dashboard'),
  ('admin', 'manage_shipments'),
  ('admin', 'view_shipments'),
  ('admin', 'manage_suppliers'),
  ('admin', 'view_suppliers'),
  ('admin', 'manage_clients'),
  ('admin', 'view_clients'),
  ('admin', 'manage_payments'),
  ('admin', 'view_payments'),
  ('admin', 'view_financials'),
  ('admin', 'manage_documents'),
  ('admin', 'view_documents'),
  ('admin', 'manage_team'),
  ('admin', 'manage_bank_accounts'),
  ('admin', 'bulk_import');

-- Insert default permissions for staff (view + limited manage)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('staff', 'view_dashboard'),
  ('staff', 'view_shipments'),
  ('staff', 'manage_shipments'),
  ('staff', 'view_suppliers'),
  ('staff', 'view_clients'),
  ('staff', 'view_payments'),
  ('staff', 'view_documents');

-- Insert default permissions for user role (view only)
INSERT INTO public.role_permissions (role, permission) VALUES
  ('user', 'view_dashboard'),
  ('user', 'view_shipments'),
  ('user', 'view_documents');

-- Update profiles RLS to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));