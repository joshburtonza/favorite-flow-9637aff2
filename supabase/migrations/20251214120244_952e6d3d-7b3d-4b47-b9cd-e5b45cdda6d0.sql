-- Create security_requests table for download/export approvals
CREATE TABLE public.security_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email TEXT NOT NULL,
  request_type TEXT NOT NULL, -- 'download', 'export', 'bulk_export'
  entity_type TEXT NOT NULL, -- 'document', 'shipment', 'report', etc.
  entity_id UUID,
  entity_name TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  expires_at TIMESTAMPTZ, -- Approval expires after certain time
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create indexes
CREATE INDEX idx_security_requests_status ON public.security_requests(status);
CREATE INDEX idx_security_requests_user ON public.security_requests(user_id);
CREATE INDEX idx_security_requests_created ON public.security_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.security_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own security requests"
ON public.security_requests FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all security requests"
ON public.security_requests FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can create requests
CREATE POLICY "Users can create security requests"
ON public.security_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can update requests (approve/deny)
CREATE POLICY "Admins can update security requests"
ON public.security_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.security_requests;

-- Create admin_notifications table for security alerts
CREATE TABLE public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL, -- 'screenshot_attempt', 'download_request', 'security_alert'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications FOR INSERT
WITH CHECK (true);

-- Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;