import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

export function useTypingIndicator(conversationId: string | null) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Clean up stale typing indicators (older than 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => prev.filter(u => now - u.timestamp < 3000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Subscribe to typing events
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`typing-${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user.id) return;
        
        setTypingUsers(prev => {
          const existing = prev.find(u => u.userId === payload.userId);
          if (existing) {
            return prev.map(u => 
              u.userId === payload.userId 
                ? { ...u, timestamp: Date.now() }
                : u
            );
          }
          return [...prev, { 
            userId: payload.userId, 
            userName: payload.userName,
            timestamp: Date.now() 
          }];
        });
      })
      .on('broadcast', { event: 'stop_typing' }, ({ payload }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, user]);

  const sendTyping = useCallback(async (userName: string) => {
    if (!conversationId || !user || !channelRef.current) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    await channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, userName }
    });

    // Auto-stop after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [conversationId, user]);

  const stopTyping = useCallback(async () => {
    if (!conversationId || !user || !channelRef.current) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    await channelRef.current.send({
      type: 'broadcast',
      event: 'stop_typing',
      payload: { userId: user.id }
    });
  }, [conversationId, user]);

  // Filter out current user
  const otherTypingUsers = typingUsers.filter(u => u.userId !== user?.id);

  const typingText = otherTypingUsers.length === 0 
    ? null
    : otherTypingUsers.length === 1
      ? `${otherTypingUsers[0].userName} is typing...`
      : otherTypingUsers.length === 2
        ? `${otherTypingUsers[0].userName} and ${otherTypingUsers[1].userName} are typing...`
        : 'Several people are typing...';

  return {
    typingUsers: otherTypingUsers,
    typingText,
    sendTyping,
    stopTyping,
    isTyping: otherTypingUsers.length > 0
  };
}
