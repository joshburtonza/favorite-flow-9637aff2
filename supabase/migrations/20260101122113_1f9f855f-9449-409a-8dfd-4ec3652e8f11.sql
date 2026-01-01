-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  lead_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policies for departments
CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage departments"
  ON public.departments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add department_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;

-- Create staff invites table
CREATE TABLE public.staff_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'staff'::app_role,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;

-- Policies for staff invites
CREATE POLICY "Admins can manage invites"
  ON public.staff_invites FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can view and create invites"
  ON public.staff_invites FOR SELECT
  USING (has_role(auth.uid(), 'moderator'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Moderators can insert invites"
  ON public.staff_invites FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Allow public read of invites by token (for accepting invite flow)
CREATE POLICY "Anyone can read invite by token"
  ON public.staff_invites FOR SELECT
  USING (true);

-- Add trigger to update updated_at
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_invites_updated_at
  BEFORE UPDATE ON public.staff_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments based on existing roles
INSERT INTO public.departments (name, description) VALUES
  ('Administration', 'Full system access and management'),
  ('Accounts', 'Finance, invoicing, and payment management'),
  ('Shipping', 'Shipment tracking and logistics'),
  ('File Costing', 'Document costing and clearing'),
  ('Operations', 'General operations and tracking');

-- Create index for faster lookups
CREATE INDEX idx_staff_invites_token ON public.staff_invites(token);
CREATE INDEX idx_staff_invites_email ON public.staff_invites(email);
CREATE INDEX idx_profiles_department ON public.profiles(department_id);