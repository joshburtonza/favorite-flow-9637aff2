-- Create automation_logs table for tracking all API calls
CREATE TABLE public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'whatsapp', 'email', 'manual'
  action TEXT NOT NULL, -- 'create_shipment', 'update_status', 'add_costs', etc
  lot_number TEXT,
  request_body JSONB,
  response JSONB,
  success BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view logs
CREATE POLICY "Authenticated users can view automation logs"
ON public.automation_logs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow service role (edge functions) to insert logs
CREATE POLICY "Service role can insert automation logs"
ON public.automation_logs
FOR INSERT
WITH CHECK (true);

-- Create index for common queries
CREATE INDEX idx_automation_logs_lot_number ON public.automation_logs(lot_number);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_source ON public.automation_logs(source);