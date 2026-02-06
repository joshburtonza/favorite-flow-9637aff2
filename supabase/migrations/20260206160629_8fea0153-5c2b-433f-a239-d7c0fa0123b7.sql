-- Create enums for the new tables
CREATE TYPE public.feedback_category AS ENUM ('bug', 'suggestion', 'question', 'other');
CREATE TYPE public.feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.feedback_status AS ENUM ('new', 'in_progress', 'resolved', 'dismissed');
CREATE TYPE public.interview_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE public.interview_response_type AS ENUM ('text', 'rating', 'multiple_choice', 'checklist');
CREATE TYPE public.testing_run_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE public.test_result AS ENUM ('untested', 'pass', 'fail', 'skip', 'needs_review');

-- =====================================================
-- Table 1: staff_feedback - Feedback Collection System
-- =====================================================
CREATE TABLE public.staff_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category feedback_category NOT NULL DEFAULT 'other',
  priority feedback_priority NOT NULL DEFAULT 'medium',
  affected_area TEXT,
  current_url TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status feedback_status NOT NULL DEFAULT 'new',
  admin_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.staff_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.staff_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.staff_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update feedback
CREATE POLICY "Admins can update feedback"
ON public.staff_feedback
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON public.staff_feedback
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Table 2: staff_interviews - Interview assignments
-- =====================================================
CREATE TABLE public.staff_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  status interview_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_interviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own interviews
CREATE POLICY "Users can view own interviews"
ON public.staff_interviews
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own interviews
CREATE POLICY "Users can update own interviews"
ON public.staff_interviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can do everything with interviews
CREATE POLICY "Admins can manage interviews"
ON public.staff_interviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Table 3: staff_interview_responses - Interview answers
-- =====================================================
CREATE TABLE public.staff_interview_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.staff_interviews(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_type interview_response_type NOT NULL DEFAULT 'text',
  response_value JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_interview_responses ENABLE ROW LEVEL SECURITY;

-- Users can view responses for their own interviews
CREATE POLICY "Users can view own responses"
ON public.staff_interview_responses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff_interviews
    WHERE id = interview_id AND user_id = auth.uid()
  )
);

-- Users can insert responses for their own interviews
CREATE POLICY "Users can insert own responses"
ON public.staff_interview_responses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.staff_interviews
    WHERE id = interview_id AND user_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "Admins can manage responses"
ON public.staff_interview_responses
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Table 4: testing_runs - Test run tracking
-- =====================================================
CREATE TABLE public.testing_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  status testing_run_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testing_runs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view testing runs
CREATE POLICY "Users can view testing runs"
ON public.testing_runs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage testing runs
CREATE POLICY "Admins can manage testing runs"
ON public.testing_runs
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Table 5: testing_results - Individual test results
-- =====================================================
CREATE TABLE public.testing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.testing_runs(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  category TEXT NOT NULL,
  tester_id UUID,
  result test_result NOT NULL DEFAULT 'untested',
  notes TEXT,
  tested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(run_id, feature_key)
);

ALTER TABLE public.testing_results ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view and update testing results
CREATE POLICY "Users can view testing results"
ON public.testing_results
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert testing results
CREATE POLICY "Users can insert testing results"
ON public.testing_results
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Authenticated users can update testing results
CREATE POLICY "Users can update testing results"
ON public.testing_results
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Admins can delete testing results
CREATE POLICY "Admins can delete testing results"
ON public.testing_results
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Table 6: folder_templates - Template definitions
-- =====================================================
CREATE TABLE public.folder_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'shipment',
  folder_structure JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.folder_templates ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view templates
CREATE POLICY "Users can view folder templates"
ON public.folder_templates
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Admins can manage templates
CREATE POLICY "Admins can manage folder templates"
ON public.folder_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- Add shipment_id column to document_folders
-- =====================================================
ALTER TABLE public.document_folders
ADD COLUMN shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_document_folders_shipment_id ON public.document_folders(shipment_id);

-- =====================================================
-- Insert default shipment folder template
-- =====================================================
INSERT INTO public.folder_templates (name, template_type, folder_structure, is_active)
VALUES (
  'Shipment Default',
  'shipment',
  '["Documents", "Invoices", "Customs", "Payment Proofs", "Correspondence"]',
  true
);