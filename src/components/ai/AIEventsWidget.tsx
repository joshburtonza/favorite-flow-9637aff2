import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, 
  Ship, 
  RefreshCw, 
  Bot,
  Link2,
  Zap,
  ArrowRight,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAIEvents } from '@/hooks/useAIIntelligence';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { DocumentPreviewModal } from '@/components/documents/DocumentPreviewModal';

interface AIEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id?: string;
  timestamp: string;
  ai_classification?: string;
  ai_confidence?: number;
  metadata?: any;
  related_entities?: any;
}

function isDocumentEvent(event: AIEvent): boolean {
  return event.entity_type === 'document' || 
         event.event_type === 'document_uploaded' || 
         event.event_type === 'ai_extraction_completed' ||
         event.event_type === 'relationship_created';
}

function getNavigationTarget(event: AIEvent): string | null {
  // Document events will use modal instead
  if (isDocumentEvent(event)) {
    return null;
  }
  
  // For shipment events, navigate to shipment detail
  if (event.entity_type === 'shipment' && event.entity_id) {
    return `/shipments/${event.entity_id}`;
  }
  
  return null;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  document_uploaded: <FileText className="h-3.5 w-3.5" />,
  shipment_created: <Ship className="h-3.5 w-3.5" />,
  shipment_updated: <RefreshCw className="h-3.5 w-3.5" />,
  shipment_status_changed: <Zap className="h-3.5 w-3.5" />,
  ai_extraction_completed: <Bot className="h-3.5 w-3.5" />,
  relationship_created: <Link2 className="h-3.5 w-3.5" />,
};

const EVENT_COLORS: Record<string, string> = {
  document_uploaded: 'bg-blue-500/20 text-blue-400',
  shipment_created: 'bg-green-500/20 text-green-400',
  shipment_updated: 'bg-yellow-500/20 text-yellow-400',
  shipment_status_changed: 'bg-purple-500/20 text-purple-400',
  ai_extraction_completed: 'bg-indigo-500/20 text-indigo-400',
  relationship_created: 'bg-pink-500/20 text-pink-400',
};

function getEventDescription(event: AIEvent): string {
  const meta = event.metadata || {};
  
  switch (event.event_type) {
    case 'document_uploaded':
      return `Document "${meta.file_name?.slice(0, 20) || 'file'}..." uploaded`;
    case 'ai_extraction_completed':
      return `AI: ${event.ai_classification || 'classified'} (${Math.round((event.ai_confidence || 0) * 100)}%)`;
    case 'relationship_created':
      return `Doc linked to shipment`;
    case 'shipment_created':
      return `LOT ${meta.lot_number || 'N/A'} created`;
    case 'shipment_updated':
      return `LOT ${meta.lot_number || 'N/A'} updated`;
    case 'shipment_status_changed':
      return `LOT ${meta.lot_number || 'N/A'} status changed`;
    default:
      return event.event_type.replace(/_/g, ' ');
  }
}

export function AIEventsWidget({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AIEvent[]>([]);
  const { data: initialEvents, isLoading } = useAIEvents(5);
  
  // Document preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [previewShipmentId, setPreviewShipmentId] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvents) {
      setEvents(initialEvents.slice(0, 5));
    }
  }, [initialEvents]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('ai-events-widget')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_event_logs'
        },
        (payload) => {
          setEvents(prev => [payload.new as AIEvent, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEventClick = (event: AIEvent) => {
    // Document events open the preview modal
    if (isDocumentEvent(event)) {
      const relatedEntities = event.related_entities || {};
      setPreviewDocId(event.entity_id || null);
      setPreviewShipmentId(relatedEntities.shipment_id || null);
      setPreviewOpen(true);
      return;
    }
    
    // Other events navigate
    const navTarget = getNavigationTarget(event);
    if (navTarget) {
      navigate(navTarget);
    }
  };

  return (
    <>
      <div className={cn('glass-card', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="card-label">
            <Bot className="h-4 w-4 text-primary" />
            AI Activity
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2"
            onClick={() => navigate('/')}
          >
            View All
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No AI activity yet
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const isDocument = isDocumentEvent(event);
              const navTarget = getNavigationTarget(event);
              const isClickable = isDocument || !!navTarget;
              
              return (
                <div 
                  key={event.id} 
                  onClick={() => handleEventClick(event)}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-xl transition-colors",
                    isClickable 
                      ? "cursor-pointer hover:bg-primary/10 hover:border-primary/20 border border-transparent" 
                      : "hover:bg-glass-surface"
                  )}
                >
                  <div className={cn(
                    'p-1.5 rounded-lg shrink-0',
                    EVENT_COLORS[event.event_type] || 'bg-muted text-muted-foreground'
                  )}>
                    {EVENT_ICONS[event.event_type] || <Zap className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {getEventDescription(event)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-glass-border">
                      {event.entity_type}
                    </Badge>
                    {isDocument ? (
                      <Eye className="h-3 w-3 text-muted-foreground" />
                    ) : isClickable ? (
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        documentId={previewDocId}
        shipmentId={previewShipmentId}
      />
    </>
  );
}