import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, RefreshCw, X, Maximize2, Minimize2, Wand2, BarChart3, Filter, ArrowUpDown, Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceContext {
  tableName?: string;
  columns?: { id: string; name: string; type: string }[];
  rowCount?: number;
  selectedCells?: { count: number; sum?: number; avg?: number };
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: WorkspaceAction;
}

export interface WorkspaceAction {
  type: 'sort' | 'filter' | 'highlight' | 'sum' | 'format';
  columnId?: string;
  direction?: 'asc' | 'desc';
  condition?: string;
  value?: any;
}

interface WorkspaceAIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  context: WorkspaceContext;
  onAction?: (action: WorkspaceAction) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const QUICK_ACTIONS = [
  { label: 'Sort A-Z', icon: ArrowUpDown, action: { type: 'sort' as const, direction: 'asc' as const } },
  { label: 'Sum Selection', icon: BarChart3, action: { type: 'sum' as const } },
  { label: 'Filter Empty', icon: Filter, action: { type: 'filter' as const, condition: 'not_empty' } },
  { label: 'Highlight', icon: Highlighter, action: { type: 'highlight' as const } },
];

export function WorkspaceAIPanel({ 
  isOpen, 
  onClose, 
  context, 
  onAction,
  isExpanded = false,
  onToggleExpand
}: WorkspaceAIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const parseWorkspaceCommand = (query: string): WorkspaceAction | null => {
    const lowerQuery = query.toLowerCase();
    
    // Sort commands
    if (/sort.*by\s+(\w+)/i.test(lowerQuery)) {
      const match = lowerQuery.match(/sort.*by\s+(\w+)/i);
      const direction = /desc|descending|z-a|high|big/i.test(lowerQuery) ? 'desc' : 'asc';
      return { type: 'sort', columnId: match?.[1], direction };
    }
    
    // Highlight commands
    if (/highlight.*(?:above|greater|more)\s+(\d+)/i.test(lowerQuery)) {
      const match = lowerQuery.match(/(\d+)/);
      return { type: 'highlight', condition: 'gt', value: parseFloat(match?.[1] || '0') };
    }
    if (/highlight.*(?:below|less|under)\s+(\d+)/i.test(lowerQuery)) {
      const match = lowerQuery.match(/(\d+)/);
      return { type: 'highlight', condition: 'lt', value: parseFloat(match?.[1] || '0') };
    }
    
    // Filter commands
    if (/filter.*where\s+(.+)/i.test(lowerQuery)) {
      const match = lowerQuery.match(/filter.*where\s+(.+)/i);
      return { type: 'filter', condition: match?.[1] };
    }
    
    // Sum commands
    if (/(?:sum|total|add).*column\s+(\w+)/i.test(lowerQuery) || /(?:sum|total)/i.test(lowerQuery)) {
      const match = lowerQuery.match(/column\s+(\w+)/i);
      return { type: 'sum', columnId: match?.[1] };
    }
    
    return null;
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const query = input;
    setInput('');
    setIsLoading(true);

    try {
      // First, try to parse as a workspace command
      const action = parseWorkspaceCommand(query);
      
      if (action && onAction) {
        // Execute the action
        onAction(action);
        
        const actionDescriptions: Record<string, string> = {
          'sort': `Sorting ${action.direction === 'desc' ? 'descending' : 'ascending'}...`,
          'filter': `Applying filter: ${action.condition}`,
          'highlight': `Highlighting cells ${action.condition} ${action.value}`,
          'sum': 'Calculating sum of selected cells...',
          'format': 'Applying formatting...'
        };
        
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `✅ ${actionDescriptions[action.type] || 'Action applied!'}\n\nI've applied the changes to your spreadsheet.`,
          timestamp: new Date(),
          action
        }]);
      } else {
        // Use AI to understand the query
        const { data, error } = await supabase.functions.invoke('ai-intelligence', {
          body: { 
            action: 'query', 
            query: `Workspace context: Table "${context.tableName}" with ${context.rowCount} rows and columns: ${context.columns?.map(c => c.name).join(', ')}. 
            
User question: ${query}

Please help with this spreadsheet-related request.`
          }
        });

        if (error) throw error;

        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data?.response || 'I can help you with sorting, filtering, highlighting, and analyzing your data. Try commands like "sort by column A" or "highlight values above 1000".',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('AI error:', error);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I can help you with spreadsheet commands. Try:\n• "Sort by [column name]"\n• "Highlight values above 1000"\n• "Filter where status is pending"\n• "Sum column A"',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: WorkspaceAction) => {
    if (onAction) {
      onAction(action);
    }
  };

  if (!isOpen) return null;

  return (
    <Card className={cn(
      'fixed right-4 bottom-4 z-50 flex flex-col shadow-xl border-2',
      isExpanded ? 'w-[400px] h-[600px]' : 'w-[340px] h-[450px]'
    )}>
      <CardHeader className="pb-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Workspace AI
          </CardTitle>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessages([])}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {onToggleExpand && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Context info */}
        <div className="flex flex-wrap gap-1 mt-2">
          {context.tableName && (
            <Badge variant="secondary" className="text-xs">{context.tableName}</Badge>
          )}
          {context.rowCount !== undefined && (
            <Badge variant="outline" className="text-xs">{context.rowCount} rows</Badge>
          )}
          {context.selectedCells && context.selectedCells.count > 1 && (
            <Badge variant="outline" className="text-xs">
              {context.selectedCells.count} selected
              {context.selectedCells.sum !== undefined && ` • Σ ${context.selectedCells.sum.toLocaleString()}`}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col min-h-0 overflow-hidden">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="space-y-3">
              <div className="text-center py-4">
                <Wand2 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Ask me to help with your spreadsheet</p>
              </div>
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map((qa, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 justify-start"
                    onClick={() => handleQuickAction(qa.action)}
                  >
                    <qa.icon className="h-3 w-3 mr-1.5" />
                    {qa.label}
                  </Button>
                ))}
              </div>
              
              <p className="text-xs text-muted-foreground text-center mt-3">
                Try: "Sort by amount" or "Highlight values above 10000"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-2',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3 py-2',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-xs whitespace-pre-wrap">{message.content}</p>
                    {message.action && (
                      <Badge variant="secondary" className="text-[10px] mt-1.5">
                        {message.action.type}
                      </Badge>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t shrink-0">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Ask about your data..."
              disabled={isLoading}
              className="flex-1 h-8 text-sm"
            />
            <Button 
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-8 w-8"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
