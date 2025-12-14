-- Add 'staff' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff';

-- Create policy for admins to update roles (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_roles' AND policyname = 'Admins can update roles'
    ) THEN
        CREATE POLICY "Admins can update roles" 
        ON public.user_roles 
        FOR UPDATE 
        USING (has_role(auth.uid(), 'admin'));
    END IF;
END $$;