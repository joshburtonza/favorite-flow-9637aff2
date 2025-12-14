import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Ship, 
  RefreshCw, 
  FileCheck, 
  Link2, 
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Bot,
  Filter,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAIEvents } from '@/hooks/useAIIntelligence';
import { supabase } from '@/integrations/supabase/client';

interface AIEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  timestamp: string;
  before_state?: any;
  after_state?: any;
  changes?: any;
  related_entities?: any;
  metadata?: any;
  ai_classification?: string;
  ai_extracted_data?: any;
  ai_confidence?: number;
  ai_summary?: string;
  user_email?: string;
}

function getNavigationTarget(event: AIEvent): string | null {
  const relatedEntities = event.related_entities || {};
  
  if (event.entity_type === 'shipment' && event.entity_id) {
    return `/shipments/${event.entity_id}`;
  }
  
  if (event.entity_type === 'document' && relatedEntities.shipment_id) {
    return `/shipments/${relatedEntities.shipment_id}`;
  }
  
  if (event.event_type === 'relationship_created' && relatedEntities.shipment_id) {
    return `/shipments/${relatedEntities.shipment_id}`;
  }
  
  if (event.entity_type === 'document') {
    return '/documents';
  }
  
  return null;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  document_uploaded: <FileText className="h-4 w-4" />,
  document_updated: <FileCheck className="h-4 w-4" />,
  shipment_created: <Ship className="h-4 w-4" />,
  shipment_updated: <RefreshCw className="h-4 w-4" />,
  shipment_status_changed: <Zap className="h-4 w-4" />,
  ai_extraction_completed: <Bot className="h-4 w-4" />,
  relationship_created: <Link2 className="h-4 w-4" />,
  ai_query: <Bot className="h-4 w-4" />,
  user_action: <User className="h-4 w-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  document_uploaded: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  document_updated: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  shipment_created: 'bg-green-500/20 text-green-600 dark:text-green-400',
  shipment_updated: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  shipment_status_changed: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  ai_extraction_completed: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  relationship_created: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
  ai_query: 'bg-violet-500/20 text-violet-600 dark:text-violet-400',
};

function getEventDescription(event: AIEvent): string {
  const meta = event.metadata || {};
  
  switch (event.event_type) {
    case 'document_uploaded':
      return `Document "${meta.file_name || 'Unknown'}" uploaded`;
    case 'ai_extraction_completed':
      return `AI classified document as ${event.ai_classification || 'unknown'} (${Math.round((event.ai_confidence || 0) * 100)}% confidence)`;
    case 'relationship_created':
      return `Document linked to shipment${meta.auto_linked ? ' (auto)' : ''}`;
    case 'shipment_created':
      return `Shipment LOT ${meta.lot_number || 'N/A'} created`;
    case 'shipment_updated':
      const changes = event.changes || {};
      const changedFields = Object.keys(changes).join(', ');
      return `Shipment LOT ${meta.lot_number || 'N/A'} updated: ${changedFields || 'fields changed'}`;
    case 'shipment_status_changed':
      const oldStatus = event.before_state?.status;
      const newStatus = event.after_state?.status;
      return `LOT ${meta.lot_number || 'N/A'} status: ${oldStatus || '?'} → ${newStatus || '?'}`;
    case 'ai_query':
      return `AI query processed`;
    default:
      return event.event_type.replace(/_/g, ' ');
  }
}

export function AIActivityFeed({ 
  className,
  maxHeight = 400,
  showFilters = true
}: { 
  className?: string;
  maxHeight?: number;
  showFilters?: boolean;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [events, setEvents] = useState<AIEvent[]>([]);
  const { data: initialEvents, isLoading, refetch } = useAIEvents(50);

  // Set initial events
  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents);
    }
  }, [initialEvents]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('ai-events-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_event_logs'
        },
        (payload) => {
          setEvents(prev => [payload.new as AIEvent, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.entity_type === filter || e.event_type.includes(filter));

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Activity Feed
          </CardTitle>
          <div className="flex items-center gap-2">
            {showFilters && (
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="shipment">Shipments</SelectItem>
                  <SelectItem value="ai">AI Actions</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }}>
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Loading activity...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Clock className="h-5 w-5 mx-auto mb-2" />
              No activity yet
            </div>
          ) : (
            <div className="divide-y">
              {filteredEvents.map((event) => {
                const navTarget = getNavigationTarget(event);
                const isClickable = !!navTarget;
                
                return (
                  <div 
                    key={event.id} 
                    onClick={() => isClickable && navigate(navTarget)}
                    className={cn(
                      "px-4 py-3 transition-colors",
                      isClickable 
                        ? "cursor-pointer hover:bg-primary/5" 
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg shrink-0',
                        EVENT_COLORS[event.event_type] || 'bg-muted'
                      )}>
                        {EVENT_ICONS[event.event_type] || <AlertCircle className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getEventDescription(event)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {event.entity_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        {event.ai_confidence && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-muted-foreground">
                              {Math.round(event.ai_confidence * 100)}% confidence
                            </span>
                          </div>
                        )}
                      </div>
                      {isClickable && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}