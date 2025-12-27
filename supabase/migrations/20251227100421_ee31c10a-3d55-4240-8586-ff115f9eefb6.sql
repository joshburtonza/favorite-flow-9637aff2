-- Create notifications table for Phase 7
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    priority TEXT NOT NULL DEFAULT 'normal',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- System/admins can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Add index for better performance
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;