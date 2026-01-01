
-- =============================================
-- PHASE 1: ANNOUNCEMENTS
-- =============================================

-- Priority enum for announcements
CREATE TYPE public.announcement_priority AS ENUM ('urgent', 'high', 'normal', 'low');

-- Target audience enum
CREATE TYPE public.target_audience AS ENUM ('all', 'admin', 'staff', 'moderator', 'accountant', 'shipping', 'file_costing', 'operations');

-- Announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority announcement_priority NOT NULL DEFAULT 'normal',
  target_audience target_audience NOT NULL DEFAULT 'all',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Announcement reads tracking
CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID REFERENCES public.announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- =============================================
-- PHASE 2: INTERNAL MESSAGING
-- =============================================

-- Conversation type enum
CREATE TYPE public.conversation_type AS ENUM ('direct', 'group');

-- Team conversations table
CREATE TABLE public.team_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL DEFAULT 'direct',
  name TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  participant_ids UUID[] NOT NULL DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Team messages table
CREATE TABLE public.team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.team_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  read_by UUID[] NOT NULL DEFAULT '{}',
  reply_to_id UUID REFERENCES public.team_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- PHASE 3: TEAM CALENDAR
-- =============================================

-- Event type enum
CREATE TYPE public.event_type AS ENUM ('meeting', 'reminder', 'deadline', 'leave', 'shipment', 'other');

-- Event visibility enum
CREATE TYPE public.event_visibility AS ENUM ('private', 'team', 'public');

-- RSVP status enum
CREATE TYPE public.rsvp_status AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- Team events table
CREATE TABLE public.team_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_type event_type NOT NULL DEFAULT 'other',
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN NOT NULL DEFAULT false,
  recurring_rule JSONB,
  color TEXT DEFAULT '#3b82f6',
  related_entity_type TEXT,
  related_entity_id UUID,
  visibility event_visibility NOT NULL DEFAULT 'team',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event participants table
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.team_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status rsvp_status NOT NULL DEFAULT 'pending',
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(event_id, user_id)
);

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: ANNOUNCEMENTS
-- =============================================

-- All authenticated users can view non-expired announcements
CREATE POLICY "Authenticated users can view announcements"
ON public.announcements FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (expires_at IS NULL OR expires_at > now())
);

-- Admins and moderators can create announcements
CREATE POLICY "Admins can create announcements"
ON public.announcements FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Admins and moderators can update announcements
CREATE POLICY "Admins can update announcements"
ON public.announcements FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Admins can delete announcements
CREATE POLICY "Admins can delete announcements"
ON public.announcements FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can manage their own read status
CREATE POLICY "Users can view their read status"
ON public.announcement_reads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark announcements as read"
ON public.announcement_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their read status"
ON public.announcement_reads FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- RLS POLICIES: MESSAGING
-- =============================================

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON public.team_conversations FOR SELECT
USING (auth.uid() = ANY(participant_ids));

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON public.team_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = ANY(participant_ids));

-- Users can update conversations they're in
CREATE POLICY "Users can update their conversations"
ON public.team_conversations FOR UPDATE
USING (auth.uid() = ANY(participant_ids));

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.team_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_conversations
    WHERE id = team_messages.conversation_id
    AND auth.uid() = ANY(participant_ids)
  )
);

-- Users can send messages to conversations they're in
CREATE POLICY "Users can send messages"
ON public.team_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.team_conversations
    WHERE id = conversation_id
    AND auth.uid() = ANY(participant_ids)
  )
);

-- Users can update messages (for read status)
CREATE POLICY "Users can update message read status"
ON public.team_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.team_conversations
    WHERE id = team_messages.conversation_id
    AND auth.uid() = ANY(participant_ids)
  )
);

-- =============================================
-- RLS POLICIES: CALENDAR
-- =============================================

-- Users can view events based on visibility
CREATE POLICY "Users can view events"
ON public.team_events FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    visibility = 'public' OR
    visibility = 'team' OR
    (visibility = 'private' AND created_by = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_id = team_events.id AND user_id = auth.uid()
    )
  )
);

-- Users can create events
CREATE POLICY "Users can create events"
ON public.team_events FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Users can update their own events or admins can update any
CREATE POLICY "Users can update their events"
ON public.team_events FOR UPDATE
USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can delete their own events or admins can delete any
CREATE POLICY "Users can delete their events"
ON public.team_events FOR DELETE
USING (
  auth.uid() = created_by OR has_role(auth.uid(), 'admin'::app_role)
);

-- Event participants policies
CREATE POLICY "Users can view event participants"
ON public.event_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_events
    WHERE id = event_participants.event_id
    AND (
      visibility IN ('public', 'team') OR
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM public.event_participants ep WHERE ep.event_id = team_events.id AND ep.user_id = auth.uid())
    )
  )
);

CREATE POLICY "Event creators can manage participants"
ON public.event_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.team_events
    WHERE id = event_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id
);

CREATE POLICY "Users can update their RSVP"
ON public.event_participants FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Event creators can remove participants"
ON public.event_participants FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_events
    WHERE id = event_id AND created_by = auth.uid()
  ) OR auth.uid() = user_id
);

-- =============================================
-- TRIGGERS
-- =============================================

-- Updated at triggers
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_conversations_updated_at
  BEFORE UPDATE ON public.team_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_events_updated_at
  BEFORE UPDATE ON public.team_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update conversation last_message_at when new message is sent
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.team_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.team_messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- =============================================
-- ENABLE REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_events;
