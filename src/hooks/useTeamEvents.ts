import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export type EventType = 'meeting' | 'reminder' | 'deadline' | 'leave' | 'shipment' | 'other';
export type EventVisibility = 'private' | 'team' | 'public';
export type RSVPStatus = 'pending' | 'accepted' | 'declined' | 'tentative';

export interface TeamEvent {
  id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  recurring_rule: any | null;
  color: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  visibility: EventVisibility;
  created_at: string;
  updated_at: string;
  creator?: { full_name: string | null; email: string | null };
  participants?: EventParticipant[];
  my_rsvp?: RSVPStatus;
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: RSVPStatus;
  responded_at: string | null;
  user?: { full_name: string | null; email: string | null };
}

export interface CreateEventInput {
  title: string;
  description?: string;
  event_type?: EventType;
  event_date: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  color?: string;
  visibility?: EventVisibility;
  participant_ids?: string[];
}

export function useTeamEvents(selectedDate?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const monthStart = selectedDate ? format(startOfMonth(selectedDate), 'yyyy-MM-dd') : undefined;
  const monthEnd = selectedDate ? format(endOfMonth(selectedDate), 'yyyy-MM-dd') : undefined;

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['team-events', monthStart, monthEnd],
    queryFn: async () => {
      let query = supabase
        .from('team_events')
        .select('*')
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (monthStart && monthEnd) {
        query = query.gte('event_date', monthStart).lte('event_date', monthEnd);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get creator profiles
      const creatorIds = [...new Set(data?.map(e => e.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', creatorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get participants for each event
      const eventIds = data?.map(e => e.id) || [];
      const { data: participants } = await supabase
        .from('event_participants')
        .select('*')
        .in('event_id', eventIds);

      const participantsByEvent = new Map<string, EventParticipant[]>();
      participants?.forEach(p => {
        if (!participantsByEvent.has(p.event_id)) {
          participantsByEvent.set(p.event_id, []);
        }
        participantsByEvent.get(p.event_id)!.push(p);
      });

      return (data || []).map(e => ({
        ...e,
        creator: e.created_by ? profileMap.get(e.created_by) : undefined,
        participants: participantsByEvent.get(e.id) || [],
        my_rsvp: participants?.find(p => p.event_id === e.id && p.user_id === user?.id)?.status
      })) as TeamEvent[];
    },
    enabled: !!user
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('team-events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_events' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const createEvent = useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const { participant_ids, ...eventData } = input;
      
      const { data, error } = await supabase
        .from('team_events')
        .insert({
          ...eventData,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add participants if provided
      if (participant_ids?.length) {
        await supabase
          .from('event_participants')
          .insert(participant_ids.map(userId => ({
            event_id: data.id,
            user_id: userId
          })));
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events'] });
      toast.success('Event created');
    },
    onError: (error) => {
      toast.error('Failed to create event: ' + error.message);
    }
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...input }: Partial<TeamEvent> & { id: string }) => {
      const { data, error } = await supabase
        .from('team_events')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events'] });
      toast.success('Event updated');
    },
    onError: (error) => {
      toast.error('Failed to update event: ' + error.message);
    }
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('team_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events'] });
      toast.success('Event deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete event: ' + error.message);
    }
  });

  const updateRSVP = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: RSVPStatus }) => {
      const { error } = await supabase
        .from('event_participants')
        .upsert({
          event_id: eventId,
          user_id: user?.id,
          status,
          responded_at: new Date().toISOString()
        }, { onConflict: 'event_id,user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-events'] });
      toast.success('RSVP updated');
    },
    onError: (error) => {
      toast.error('Failed to update RSVP: ' + error.message);
    }
  });

  // Get today's events
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayEvents = events.filter(e => e.event_date === today);

  return {
    events,
    todayEvents,
    isLoading,
    createEvent,
    updateEvent,
    deleteEvent,
    updateRSVP,
    refetch
  };
}
