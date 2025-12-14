-- Create activity_logs table to track all changes
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_type TEXT NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', 'import'
  entity_type TEXT NOT NULL, -- 'shipment', 'supplier', 'client', 'payment', 'document', etc.
  entity_id UUID,
  entity_name TEXT, -- Human readable name like LOT number or supplier name
  old_values JSONB,
  new_values JSONB,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view activity logs"
ON public.activity_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete logs
CREATE POLICY "Admins can delete activity logs"
ON public.activity_logs FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;