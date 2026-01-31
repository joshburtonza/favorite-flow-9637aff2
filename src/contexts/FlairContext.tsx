import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface FlairMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context_summary?: {
    active_shipments?: number;
    total_supplier_balance?: number;
    mtd_profit?: number;
  };
  update_result?: {
    success: boolean;
    lot_number: string;
    updates: Record<string, any>;
  };
  tools_used?: string[];
}

interface FlairContextValue {
  messages: FlairMessage[];
  isOpen: boolean;
  isLoading: boolean;
  setIsOpen: (open: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  lastResponse: FlairMessage | null;
}

const FlairContext = createContext<FlairContextValue | null>(null);

export function FlairProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<FlairMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load conversation history from session storage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('flair_messages');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Persist messages to session storage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('flair_messages', JSON.stringify(messages));
    }
  }, [messages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: FlairMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('flair-orchestrator', {
        body: {
          message: content,
          channel: 'web',
          channel_id: user?.id,
        },
      });

      if (error) throw error;

      const assistantMessage: FlairMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response || 'Request processed.',
        timestamp: new Date(),
        context_summary: data.context_summary,
        tools_used: data.tools_used,
      };

      // Check if any tool execution resulted in an update
      if (data.tool_results?.some((r: any) => r.success && r.action)) {
        const updateResult = data.tool_results.find((r: any) => r.success && r.lot_number);
        if (updateResult) {
          assistantMessage.update_result = {
            success: true,
            lot_number: updateResult.lot_number,
            updates: updateResult,
          };
        }
      }

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('FLAIR error:', error);
      const errorMessage: FlairMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, user?.id]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    sessionStorage.removeItem('flair_messages');
  }, []);

  const lastResponse = messages.filter(m => m.role === 'assistant').pop() || null;

  return (
    <FlairContext.Provider
      value={{
        messages,
        isOpen,
        isLoading,
        setIsOpen,
        sendMessage,
        clearMessages,
        lastResponse,
      }}
    >
      {children}
    </FlairContext.Provider>
  );
}

export function useFlair() {
  const context = useContext(FlairContext);
  if (!context) {
    throw new Error('useFlair must be used within a FlairProvider');
  }
  return context;
}
