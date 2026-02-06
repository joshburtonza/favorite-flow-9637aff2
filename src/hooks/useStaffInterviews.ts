import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { interviewQuestions } from '@/lib/testing-definitions';
import { Json } from '@/integrations/supabase/types';

export type InterviewStatus = 'pending' | 'in_progress' | 'completed';
export type ResponseType = 'text' | 'rating' | 'multiple_choice' | 'checklist';

export interface StaffInterview {
  id: string;
  user_id: string;
  assigned_by: string;
  status: InterviewStatus;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  assigned_by_name?: string;
}

export interface InterviewResponse {
  id: string;
  interview_id: string;
  question_key: string;
  question_text: string;
  response_type: ResponseType;
  response_value: unknown;
  created_at: string;
}

export function useStaffInterviews() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user's own interviews
  const { data: myInterviews = [], isLoading: loadingMyInterviews } = useQuery({
    queryKey: ['my-interviews', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('staff_interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StaffInterview[];
    },
    enabled: !!user,
  });

  // Get pending interview for current user
  const pendingInterview = myInterviews.find(i => i.status !== 'completed');

  // Fetch all interviews (admin)
  const { data: allInterviews = [], isLoading: loadingAllInterviews, refetch: refetchAll } = useQuery({
    queryKey: ['all-interviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_interviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(data.flatMap(i => [i.user_id, i.assigned_by]))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(interview => ({
        ...interview,
        user_email: profileMap.get(interview.user_id)?.email,
        user_name: profileMap.get(interview.user_id)?.full_name,
        assigned_by_name: profileMap.get(interview.assigned_by)?.full_name,
      })) as StaffInterview[];
    },
  });

  // Fetch responses for an interview
  const useInterviewResponses = (interviewId: string | null) => {
    return useQuery({
      queryKey: ['interview-responses', interviewId],
      queryFn: async () => {
        if (!interviewId) return [];
        
        const { data, error } = await supabase
          .from('staff_interview_responses')
          .select('*')
          .eq('interview_id', interviewId)
          .order('created_at');
        
        if (error) throw error;
        return data as InterviewResponse[];
      },
      enabled: !!interviewId,
    });
  };

  // Create interview assignment (admin)
  const createInterview = useMutation({
    mutationFn: async (data: { user_id: string; due_date?: string }) => {
      if (!user) throw new Error('Must be logged in');

      const { data: interview, error } = await supabase
        .from('staff_interviews')
        .insert({
          user_id: data.user_id,
          assigned_by: user.id,
          due_date: data.due_date || null,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return interview;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-interviews'] });
      toast({ title: 'Interview assigned', description: 'Staff member will be notified.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error assigning interview', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Start interview (updates status)
  const startInterview = useMutation({
    mutationFn: async (interviewId: string) => {
      const { error } = await supabase
        .from('staff_interviews')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', interviewId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-interviews'] });
    },
  });

  // Submit interview responses
  const submitResponses = useMutation({
    mutationFn: async ({ 
      interviewId, 
      responses 
    }: { 
      interviewId: string; 
      responses: Record<string, unknown>;
    }) => {
      // Delete existing responses
      await supabase
        .from('staff_interview_responses')
        .delete()
        .eq('interview_id', interviewId);

      // Insert new responses
      const responsesToInsert = Object.entries(responses).map(([key, value]) => {
        const question = interviewQuestions.find(q => q.key === key);
        return {
          interview_id: interviewId,
          question_key: key,
          question_text: question?.question || key,
          response_type: question?.type || 'text',
          response_value: JSON.parse(JSON.stringify(value)) as Json,
        };
      });

      const { error: insertError } = await supabase
        .from('staff_interview_responses')
        .insert(responsesToInsert);
      
      if (insertError) throw insertError;

      // Mark interview as completed
      const { error: updateError } = await supabase
        .from('staff_interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', interviewId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['all-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['interview-responses'] });
      toast({ title: 'Interview submitted!', description: 'Thank you for your responses.' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error submitting interview', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Delete interview (admin)
  const deleteInterview = useMutation({
    mutationFn: async (interviewId: string) => {
      const { error } = await supabase
        .from('staff_interviews')
        .delete()
        .eq('id', interviewId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      toast({ title: 'Interview deleted' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error deleting interview', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Get interview stats
  const stats = {
    total: allInterviews.length,
    pending: allInterviews.filter(i => i.status === 'pending').length,
    inProgress: allInterviews.filter(i => i.status === 'in_progress').length,
    completed: allInterviews.filter(i => i.status === 'completed').length,
  };

  return {
    myInterviews,
    pendingInterview,
    allInterviews,
    loadingMyInterviews,
    loadingAllInterviews,
    refetchAll,
    useInterviewResponses,
    createInterview,
    startInterview,
    submitResponses,
    deleteInterview,
    interviewQuestions,
    stats,
  };
}
