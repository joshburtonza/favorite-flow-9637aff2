import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  created_by: string | null;
  participant_ids: string[];
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  participants?: { id: string; full_name: string | null; email: string | null }[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  attachments: any[];
  read_by: string[];
  reply_to_id: string | null;
  created_at: string;
  sender?: { full_name: string | null; email: string | null };
  reply_to?: Message;
}

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Get participant profiles
      const allParticipantIds = [...new Set(data?.flatMap(c => c.participant_ids) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', allParticipantIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get last messages and unread counts
      const conversationsWithDetails = await Promise.all((data || []).map(async (conv) => {
        const { data: messages } = await supabase
          .from('team_messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const lastMessage = messages?.[0];
        
        // Count unread messages
        const { count } = await supabase
          .from('team_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .not('read_by', 'cs', `{${user?.id}}`);

        return {
          ...conv,
          participants: conv.participant_ids.map(id => profileMap.get(id)).filter(Boolean),
          last_message: lastMessage,
          unread_count: count || 0
        };
      }));

      return conversationsWithDetails as Conversation[];
    },
    enabled: !!user
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('conversations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_conversations' }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_messages' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const createConversation = useMutation({
    mutationFn: async ({ participantIds, name, type = 'direct' }: { 
      participantIds: string[]; 
      name?: string; 
      type?: ConversationType 
    }) => {
      // For direct messages, check if conversation already exists
      if (type === 'direct' && participantIds.length === 1) {
        const allParticipants = [user!.id, ...participantIds].sort();
        const { data: existing } = await supabase
          .from('team_conversations')
          .select('*')
          .eq('type', 'direct')
          .contains('participant_ids', allParticipants);

        if (existing && existing.length > 0) {
          return existing[0];
        }
      }

      const { data, error } = await supabase
        .from('team_conversations')
        .insert({
          type,
          name,
          created_by: user?.id,
          participant_ids: [user!.id, ...participantIds]
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      toast.error('Failed to create conversation: ' + error.message);
    }
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return {
    conversations,
    isLoading,
    totalUnread,
    createConversation,
    refetch
  };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(data?.map(m => m.sender_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return (data || []).map(m => ({
        ...m,
        sender: m.sender_id ? profileMap.get(m.sender_id) : undefined
      })) as Message[];
    },
    enabled: !!conversationId && !!user
  });

  // Real-time subscription for this conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'team_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, refetch, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async ({ content, replyToId, attachments }: { 
      content: string; 
      replyToId?: string;
      attachments?: { name: string; url: string; type: string; size: number }[];
    }) => {
      if (!conversationId) throw new Error('No conversation selected');

      const { data, error } = await supabase
        .from('team_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user?.id,
          content,
          reply_to_id: replyToId,
          attachments: attachments || [],
          read_by: [user!.id]
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      toast.error('Failed to send message: ' + error.message);
    }
  });

  const markAsRead = useMutation({
    mutationFn: async () => {
      if (!conversationId || !user) return;

      // Get all unread messages
      const { data: unreadMessages } = await supabase
        .from('team_messages')
        .select('id, read_by')
        .eq('conversation_id', conversationId)
        .not('read_by', 'cs', `{${user.id}}`);

      if (!unreadMessages?.length) return;

      // Update each message to add current user to read_by
      await Promise.all(unreadMessages.map(msg =>
        supabase
          .from('team_messages')
          .update({ read_by: [...msg.read_by, user.id] })
          .eq('id', msg.id)
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }
  });

  return {
    messages,
    isLoading,
    sendMessage,
    markAsRead,
    refetch
  };
}
