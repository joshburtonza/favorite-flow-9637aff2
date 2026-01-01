import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, ArrowRight } from 'lucide-react';
import { useConversations, Conversation } from '@/hooks/useMessages';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

export function MessagesWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { conversations, isLoading, totalUnread } = useConversations();
  
  // Get conversations with unread messages
  const unreadConversations = conversations
    .filter(c => (c.unread_count || 0) > 0)
    .slice(0, 3);

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherParticipants = conv.participants?.filter(p => p.id !== user?.id) || [];
    return otherParticipants.map(p => p.full_name || p.email).join(', ') || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-14" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Messages
            {totalUnread > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 text-xs">
                {totalUnread}
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/messages')}
          >
            View All <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {unreadConversations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No unread messages
          </p>
        ) : (
          <div className="space-y-3">
            {unreadConversations.map(conv => {
              const name = getConversationName(conv);
              return (
                <div 
                  key={conv.id}
                  className="flex items-start gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate('/messages')}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{name}</span>
                      <Badge variant="destructive" className="h-4 text-xs shrink-0">
                        {conv.unread_count}
                      </Badge>
                    </div>
                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message.content}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
