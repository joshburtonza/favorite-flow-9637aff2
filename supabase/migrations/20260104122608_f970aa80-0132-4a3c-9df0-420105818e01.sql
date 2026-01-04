-- Fix infinite recursion in RLS: event_participants policy referenced itself
DROP POLICY IF EXISTS "Users can view event participants" ON public.event_participants;

CREATE POLICY "Users can view event participants"
ON public.event_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.team_events e
    WHERE e.id = event_participants.event_id
      AND (
        e.visibility IN ('public'::public.event_visibility, 'team'::public.event_visibility)
        OR e.created_by = auth.uid()
        OR event_participants.user_id = auth.uid()
      )
  )
);

-- Allow normal authenticated users to create tasks (assigned_by must be themselves)
DROP POLICY IF EXISTS "Admins can insert tasks" ON public.tasks;

CREATE POLICY "Users can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND assigned_by IS NOT NULL
  AND (
    assigned_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  )
);
