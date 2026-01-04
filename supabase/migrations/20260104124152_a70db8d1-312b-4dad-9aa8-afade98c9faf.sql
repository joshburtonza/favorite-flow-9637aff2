-- Fix infinite recursion in RLS policy for public.team_events
-- Root cause: team_events SELECT policy queries event_participants, whose own policies reference team_events.

-- 1) Helper function that bypasses RLS (SECURITY DEFINER) to check participation
CREATE OR REPLACE FUNCTION public.is_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_participants ep
    WHERE ep.event_id = _event_id
      AND ep.user_id = _user_id
  );
$$;

-- 2) Replace the recursive SELECT policy with one that uses the function
DROP POLICY IF EXISTS "Users can view events" ON public.team_events;

CREATE POLICY "Users can view events"
ON public.team_events
FOR SELECT
TO authenticated
USING (
  (visibility = 'public'::public.event_visibility)
  OR (visibility = 'team'::public.event_visibility)
  OR ((visibility = 'private'::public.event_visibility) AND (created_by = auth.uid()))
  OR public.is_event_participant(id, auth.uid())
);

-- 3) (Optional hardening) Ensure the INSERT policy is scoped to authenticated
--     (keeps the same logic, just a tighter role target)
DROP POLICY IF EXISTS "Users can create events" ON public.team_events;

CREATE POLICY "Users can create events"
ON public.team_events
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND (created_by = auth.uid())
);
