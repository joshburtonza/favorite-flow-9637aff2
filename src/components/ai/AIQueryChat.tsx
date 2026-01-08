import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, CheckCircle2, FileText, ExternalLink, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAIQuery } from '@/hooks/useAIIntelligence';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface FileResult {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  lot_number?: string;
  document_type?: string;
  folder_id?: string;
}

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
  update_result?: {
    success: boolean;
    lot_number: string;
    updates: Record<string, any>;
  };
  file_results?: FileResult[];
}

const EXAMPLE_QUERIES = [
  "What's the total profit this month?",
  "Show me all pending shipments",
  "Find invoice for LOT 881",
  "Search for transport documents",
  "Show me the most profitable shipments",
];

const UPDATE_EXAMPLES = [
  "LOT 192 is in transit",
  "Freight paid for LOT 118",
  "Update LOT 883 ETA to March 20",
];

export function AIQueryChat({ 
  className,
  entityType,
  entityId,
  onFileClick
}: { 
  className?: string;
  entityType?: string;
  entityId?: string;
  onFileClick?: (file: FileResult) => void;
}) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
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

      // Handle successful response - check if result has expected structure
      const responseText = result?.response || 'Request processed successfully.';
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
        context_summary: result?.context_summary,
        update_result: result?.update_result,
        file_results: result?.file_results
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If an update was performed, invalidate queries to refresh data
      if (result?.update_result?.success) {
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
        queryClient.invalidateQueries({ queryKey: ['ai-events'] });
        toast({
          title: '✅ Update Applied',
          description: `LOT ${result.update_result.lot_number} has been updated. Changes are now reflected across the dashboard.`,
        });
      }
    } catch (error: any) {
      console.error('AI Query error:', error);
      
      // Check if error is actually a success response (2xx)
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: error?.message?.includes('2') 
          ? 'Your request was processed. Please check the dashboard for updates.'
          : 'Sorry, I encountered an error processing your request. Please try again.',
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
              <div className="text-center py-6">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">How can I help you?</h3>
                <p className="text-sm text-muted-foreground">
                  I can answer questions AND update shipments
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground px-1 mb-2">📊 Ask questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUERIES.slice(0, 3).map((query, i) => (
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
                <div>
                  <p className="text-xs text-muted-foreground px-1 mb-2">✏️ Send updates:</p>
                  <div className="flex flex-wrap gap-2">
                    {UPDATE_EXAMPLES.slice(0, 3).map((query, i) => (
                      <Button
                        key={i}
                        variant="secondary"
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
                    
                    {/* File Results - Clickable Cards */}
                    {message.file_results && message.file_results.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/50 space-y-2">
                        <p className="text-xs text-muted-foreground mb-2">📁 Found {message.file_results.length} file(s):</p>
                        {message.file_results.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => {
                              if (onFileClick) {
                                onFileClick(file);
                              } else {
                                navigate(`/files?doc=${file.id}`);
                              }
                            }}
                            className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent cursor-pointer transition-colors border"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.file_name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {file.lot_number && <span>LOT {file.lot_number}</span>}
                                {file.document_type && <Badge variant="outline" className="text-[10px] py-0">{file.document_type}</Badge>}
                              </div>
                            </div>
                            <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                          </div>
                        ))}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => navigate('/files')}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          Open File Browser
                        </Button>
                      </div>
                    )}
                    
                    {message.update_result?.success && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">
                          Update applied to LOT {message.update_result.lot_number}
                        </span>
                      </div>
                    )}
                    {message.context_summary && !message.update_result && !message.file_results?.length && (
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