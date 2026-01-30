-- Phase 2.2: User Channel Mapping and Notification Log Tables

-- =====================================================
-- TABLE: user_channel_identities
-- Maps external channel identities (Telegram/WhatsApp) to Supabase users
-- =====================================================
CREATE TABLE public.user_channel_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  channel TEXT NOT NULL CHECK (channel IN ('telegram', 'whatsapp', 'slack', 'web')),
  channel_user_id TEXT NOT NULL,  -- Telegram chat_id or phone number
  
  display_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Notification preferences per channel
  receive_alerts BOOLEAN DEFAULT true,
  receive_briefings BOOLEAN DEFAULT true,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(channel, channel_user_id)
);

CREATE INDEX idx_user_channels_lookup ON user_channel_identities(channel, channel_user_id);
CREATE INDEX idx_user_channels_user ON user_channel_identities(user_id);

ALTER TABLE user_channel_identities ENABLE ROW LEVEL SECURITY;

-- Users can manage their own channel identities
CREATE POLICY "Users manage own channels" ON user_channel_identities FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all channel identities
CREATE POLICY "Admins view all channel identities" ON user_channel_identities FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role has full access for edge functions
CREATE POLICY "Service role full access on user_channel_identities" ON user_channel_identities FOR ALL
  USING (true);

-- =====================================================
-- TABLE: notification_log
-- Tracks all notifications sent via any channel
-- =====================================================
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID REFERENCES auth.users(id),
  channel TEXT NOT NULL,
  channel_user_id TEXT NOT NULL,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN ('alert', 'briefing', 'update', 'reminder', 'message')),
  
  alert_id UUID REFERENCES proactive_alerts(id),
  
  title TEXT,
  message TEXT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message TEXT,
  
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);
CREATE INDEX idx_notification_log_alert ON notification_log(alert_id);
CREATE INDEX idx_notification_log_status ON notification_log(status, created_at);
CREATE INDEX idx_notification_log_channel ON notification_log(channel, created_at DESC);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users view own notifications" ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all notifications
CREATE POLICY "Admins view all notifications" ON notification_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Service role has full access for edge functions
CREATE POLICY "Service role full access on notification_log" ON notification_log FOR ALL
  USING (true);

-- =====================================================
-- Function: Get user by channel identity
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_user_by_channel(
  p_channel TEXT,
  p_channel_user_id TEXT
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  email TEXT,
  is_verified BOOLEAN,
  receive_alerts BOOLEAN,
  receive_briefings BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uci.user_id,
    uci.display_name,
    p.email,
    uci.is_verified,
    uci.receive_alerts,
    uci.receive_briefings
  FROM user_channel_identities uci
  LEFT JOIN profiles p ON p.id = uci.user_id
  WHERE uci.channel = p_channel 
    AND uci.channel_user_id = p_channel_user_id
    AND uci.is_active = true
  LIMIT 1;
$$;

-- =====================================================
-- Function: Get all notification recipients for alerts
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_alert_recipients()
RETURNS TABLE (
  user_id UUID,
  channel TEXT,
  channel_user_id TEXT,
  display_name TEXT,
  quiet_hours_start TIME,
  quiet_hours_end TIME
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    uci.user_id,
    uci.channel,
    uci.channel_user_id,
    uci.display_name,
    uci.quiet_hours_start,
    uci.quiet_hours_end
  FROM user_channel_identities uci
  INNER JOIN user_roles ur ON ur.user_id = uci.user_id
  WHERE uci.is_active = true 
    AND uci.receive_alerts = true
    AND ur.role = 'admin';
$$;