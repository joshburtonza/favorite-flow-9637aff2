import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIQuery } from '@/hooks/useAIIntelligence';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context_summary?: {
    total_shipments: number;
    total_revenue: number;
    total_profit: number;
    avg_margin: number;
  };
}

const EXAMPLE_QUERIES = [
  "What's the total profit this month?",
  "Show me all pending shipments",
  "Which suppliers have outstanding balances?",
  "What's the status of LOT 881?",
  "Which documents are missing for recent shipments?",
  "Show me the most profitable shipments",
];

export function AIQueryChat({ 
  className,
  entityType,
  entityId
}: { 
  className?: string;
  entityType?: string;
  entityId?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const aiQuery = useAIQuery();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (query: string) => {
    if (!query.trim() || aiQuery.isPending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const result = await aiQuery.mutateAsync({ 
        query, 
        entityType, 
        entityId 
      });

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
        context_summary: result.context_summary
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </CardTitle>
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setMessages([])}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Ask questions about shipments, documents, finances, and more
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">How can I help you?</h3>
                <p className="text-sm text-muted-foreground">
                  I have full awareness of your logistics system
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-1">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUERIES.slice(0, 4).map((query, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-1.5"
                      onClick={() => handleSubmit(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-4 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.context_summary && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                        <Badge variant="secondary" className="text-xs">
                          {message.context_summary.total_shipments} shipments
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {formatCurrency(message.context_summary.total_profit)} profit
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {message.context_summary.avg_margin.toFixed(1)}% avg margin
                        </Badge>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {aiQuery.isPending && (
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about shipments, documents, finances..."
              disabled={aiQuery.isPending}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || aiQuery.isPending}
              size="icon"
            >
              {aiQuery.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}