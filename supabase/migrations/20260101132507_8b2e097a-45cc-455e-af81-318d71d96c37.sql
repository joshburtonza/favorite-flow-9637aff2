-- Create individual user permissions table
CREATE TABLE public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission public.app_permission NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can manage user permissions
CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Update has_permission function to check both role and individual permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission app_permission)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check role-based permissions
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission = _permission
  ) OR EXISTS (
    -- Check individual user permissions
    SELECT 1
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
      AND up.permission = _permission
  )
$$;