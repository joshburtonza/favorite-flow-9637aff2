-- FLAIR Phase 2: Complete Schema (v4)
-- Create all tables in proper order

-- Drop existing views that may conflict
DROP VIEW IF EXISTS v_pending_payments;
DROP VIEW IF EXISTS v_latest_fx_rates;

-- ============================================
-- 1. CONVERSATION MEMORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  channel_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  entities_referenced JSONB DEFAULT '[]',
  tools_used JSONB DEFAULT '[]',
  tokens_used INTEGER DEFAULT 0,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_memory_user_channel 
  ON conversation_memory(user_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_memory_channel_id 
  ON conversation_memory(channel_id, created_at DESC);

ALTER TABLE conversation_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON conversation_memory;
CREATE POLICY "Users can view own conversations"
  ON conversation_memory FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversations" ON conversation_memory;
CREATE POLICY "Users can insert own conversations"
  ON conversation_memory FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role full access on conversation_memory" ON conversation_memory;
CREATE POLICY "Service role full access on conversation_memory"
  ON conversation_memory FOR ALL USING (true);

-- ============================================
-- 2. AI TOOL EXECUTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversation_memory(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  tool_category TEXT NOT NULL,
  input_params JSONB NOT NULL DEFAULT '{}',
  output_result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  affected_entities JSONB DEFAULT '[]',
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tool_executions_conversation ON ai_tool_executions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_user ON ai_tool_executions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool ON ai_tool_executions(tool_name, started_at DESC);

ALTER TABLE ai_tool_executions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all tool executions" ON ai_tool_executions;
CREATE POLICY "Admins can view all tool executions"
  ON ai_tool_executions FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view own tool executions" ON ai_tool_executions;
CREATE POLICY "Users can view own tool executions"
  ON ai_tool_executions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on tool_executions" ON ai_tool_executions;
CREATE POLICY "Service role full access on tool_executions"
  ON ai_tool_executions FOR ALL USING (true);

-- ============================================
-- 3. PROACTIVE ALERTS
-- ============================================
DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'urgent', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.proactive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'info',
  status alert_status NOT NULL DEFAULT 'active',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_required BOOLEAN DEFAULT false,
  suggested_action TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_reference TEXT,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_role TEXT,
  notified_via JSONB DEFAULT '[]',
  notified_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON proactive_alerts(status, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON proactive_alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_target ON proactive_alerts(target_user_id, status);

ALTER TABLE proactive_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their alerts" ON proactive_alerts;
CREATE POLICY "Users can view their alerts"
  ON proactive_alerts FOR SELECT
  USING (target_user_id = auth.uid() OR target_user_id IS NULL OR 
         EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Service role full access on alerts" ON proactive_alerts;
CREATE POLICY "Service role full access on alerts"
  ON proactive_alerts FOR ALL USING (true);

-- ============================================
-- 4. SCHEDULED REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_params JSONB DEFAULT '{}',
  schedule_cron TEXT NOT NULL,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  is_active BOOLEAN DEFAULT true,
  delivery_channel TEXT NOT NULL,
  delivery_target TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_run_status TEXT,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scheduled reports" ON scheduled_reports;
CREATE POLICY "Admins can manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- ============================================
-- 5. FX RATE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS public.fx_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_pair TEXT NOT NULL,
  provider TEXT NOT NULL,
  spot_rate DECIMAL(10, 4) NOT NULL,
  applied_rate DECIMAL(10, 4),
  spread DECIMAL(10, 4),
  shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
  lot_number TEXT,
  captured_at TIMESTAMPTZ DEFAULT now(),
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_fx_history_pair_date ON fx_rate_history(currency_pair, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_fx_history_shipment ON fx_rate_history(shipment_id);

ALTER TABLE fx_rate_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view fx history" ON fx_rate_history;
CREATE POLICY "Authenticated users can view fx history"
  ON fx_rate_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role full access on fx_history" ON fx_rate_history;
CREATE POLICY "Service role full access on fx_history"
  ON fx_rate_history FOR ALL USING (true);

-- ============================================
-- 6. USER PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_channel TEXT DEFAULT 'telegram',
  language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  notify_new_shipment BOOLEAN DEFAULT true,
  notify_status_change BOOLEAN DEFAULT true,
  notify_payment_due BOOLEAN DEFAULT true,
  notify_low_margin BOOLEAN DEFAULT true,
  low_margin_threshold DECIMAL(5,2) DEFAULT 10.00,
  response_verbosity TEXT DEFAULT 'normal',
  confirm_dangerous_ops BOOLEAN DEFAULT true,
  auto_calculate_profit BOOLEAN DEFAULT true,
  daily_briefing_time TIME DEFAULT '08:00',
  include_profit_in_briefing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. VIEWS
-- ============================================
CREATE VIEW v_latest_fx_rates AS
SELECT DISTINCT ON (currency_pair, provider)
  currency_pair, provider, spot_rate, applied_rate, captured_at
FROM fx_rate_history
ORDER BY currency_pair, provider, captured_at DESC;

CREATE VIEW v_pending_payments AS
SELECT 
  ps.id, ps.supplier_id, s.name as supplier_name, ps.shipment_id, sh.lot_number,
  ps.amount_foreign, ps.currency, ps.fx_rate, ps.amount_zar, ps.payment_date, ps.status, ps.notes
FROM payment_schedule ps
LEFT JOIN suppliers s ON ps.supplier_id = s.id
LEFT JOIN shipments sh ON ps.shipment_id = sh.id
WHERE ps.status = 'pending'
ORDER BY ps.payment_date;

-- ============================================
-- 8. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
  DELETE FROM conversation_memory WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;