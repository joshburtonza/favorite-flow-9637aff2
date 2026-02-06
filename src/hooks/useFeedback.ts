import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type FeedbackCategory = 'bug' | 'suggestion' | 'question' | 'other';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'dismissed';

export interface StaffFeedback {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  affected_area: string | null;
  current_url: string | null;
  title: string;
  description: string;
  status: FeedbackStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
}

export interface CreateFeedbackData {
  category: FeedbackCategory;
  priority: FeedbackPriority;
  affected_area?: string;
  title: string;
  description: string;
}

export function useFeedback() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch user's own feedback
  const { data: myFeedback = [], isLoading: loadingMyFeedback } = useQuery({
    queryKey: ['my-feedback', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('staff_feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as StaffFeedback[];
    },
    enabled: !!user,
  });

  // Fetch all feedback (admin only)
  const { data: allFeedback = [], isLoading: loadingAllFeedback, refetch: refetchAll } = useQuery({
    queryKey: ['all-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_feedback')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get user profiles for display
      const userIds = [...new Set(data.map(f => f.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return data.map(feedback => ({
        ...feedback,
        user_email: profileMap.get(feedback.user_id)?.email,
        user_name: profileMap.get(feedback.user_id)?.full_name,
      })) as StaffFeedback[];
    },
  });

  // Create new feedback
  const createFeedback = useMutation({
    mutationFn: async (data: CreateFeedbackData) => {
      if (!user) throw new Error('Must be logged in');
      
      const currentUrl = window.location.pathname;
      
      const { data: feedback, error } = await supabase
        .from('staff_feedback')
        .insert({
          user_id: user.id,
          category: data.category,
          priority: data.priority,
          affected_area: data.affected_area || null,
          current_url: currentUrl,
          title: data.title,
          description: data.description,
        })
        .select()
        .single();
      
      if (error) throw error;
      return feedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
      toast({ title: 'Feedback submitted', description: 'Thank you for your feedback!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error submitting feedback', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update feedback status (admin)
  const updateFeedback = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      admin_notes 
    }: { 
      id: string; 
      status?: FeedbackStatus; 
      admin_notes?: string;
    }) => {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (status) {
        updateData.status = status;
        if (status === 'resolved') {
          updateData.resolved_by = user?.id;
          updateData.resolved_at = new Date().toISOString();
        }
      }
      if (admin_notes !== undefined) {
        updateData.admin_notes = admin_notes;
      }
      
      const { error } = await supabase
        .from('staff_feedback')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast({ title: 'Feedback updated' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating feedback', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Delete feedback (admin)
  const deleteFeedback = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('staff_feedback')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['my-feedback'] });
      toast({ title: 'Feedback deleted' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error deleting feedback', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Get feedback stats
  const stats = {
    total: allFeedback.length,
    new: allFeedback.filter(f => f.status === 'new').length,
    inProgress: allFeedback.filter(f => f.status === 'in_progress').length,
    resolved: allFeedback.filter(f => f.status === 'resolved').length,
    bugs: allFeedback.filter(f => f.category === 'bug').length,
    critical: allFeedback.filter(f => f.priority === 'critical').length,
  };

  return {
    myFeedback,
    allFeedback,
    loadingMyFeedback,
    loadingAllFeedback,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    refetchAll,
    stats,
  };
}
