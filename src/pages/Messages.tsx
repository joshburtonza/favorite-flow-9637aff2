import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useConversations, useMessages, Conversation } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus, Send, ArrowLeft, Users, Search } from 'lucide-react';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Messages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { conversations, isLoading: conversationsLoading, totalUnread, createConversation } = useConversations();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: messagesLoading, sendMessage, markAsRead } = useMessages(selectedConversation?.id || null);

  // Fetch all team members for new conversation
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .neq('id', user?.id || '');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      markAsRead.mutate();
    }
  }, [selectedConversation?.id, messages.length]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    await sendMessage.mutateAsync({ content: newMessage });
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const startNewConversation = async (participantId: string) => {
    const conversation = await createConversation.mutateAsync({ participantIds: [participantId] });
    setSelectedConversation(conversation as Conversation);
    setShowNewConversation(false);
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    const otherParticipants = conv.participants?.filter(p => p.id !== user?.id) || [];
    return otherParticipants.map(p => p.full_name || p.email).join(', ') || 'Unknown';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const name = getConversationName(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  // Mobile: show only conversation list or messages
  const showConversationList = !isMobile || !selectedConversation;
  const showMessages = !isMobile || selectedConversation;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)]">
        {/* Conversation List */}
        {showConversationList && (
          <div className={cn(
            'flex flex-col border-r bg-card',
            isMobile ? 'w-full' : 'w-80'
          )}>
            {/* Header */}
            <div className="p-4 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h1 className="font-semibold text-lg">Messages</h1>
                  {totalUnread > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center">
                      {totalUnread}
                    </Badge>
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => setShowNewConversation(true)}>
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No conversations yet</p>
                  <Button variant="link" onClick={() => setShowNewConversation(true)}>
                    Start a new conversation
                  </Button>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const name = getConversationName(conv);
                  const isSelected = selectedConversation?.id === conv.id;
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={cn(
                        'w-full p-4 flex items-start gap-3 hover:bg-accent transition-colors text-left border-b',
                        isSelected && 'bg-accent'
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {conv.type === 'group' ? <Users className="h-4 w-4" /> : getInitials(name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{name}</span>
                          {conv.last_message_at && (
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.last_message.content}
                          </p>
                        )}
                      </div>
                      {(conv.unread_count || 0) > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>
        )}

        {/* Messages Area */}
        {showMessages && (
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b flex items-center gap-3 bg-card">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setSelectedConversation(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedConversation.type === 'group' 
                        ? <Users className="h-4 w-4" /> 
                        : getInitials(getConversationName(selectedConversation))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">{getConversationName(selectedConversation)}</h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.participants?.length || 0} participant(s)
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-3/4" />)}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      <p>No messages yet. Say hello!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message, idx) => {
                        const isMine = message.sender_id === user?.id;
                        const showAvatar = idx === 0 || messages[idx - 1].sender_id !== message.sender_id;
                        
                        return (
                          <div
                            key={message.id}
                            className={cn('flex gap-2', isMine && 'flex-row-reverse')}
                          >
                            {showAvatar && !isMine ? (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-muted">
                                  {getInitials(message.sender?.full_name || message.sender?.email || 'U')}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-8" />
                            )}
                            <div className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2',
                              isMine 
                                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                                : 'bg-muted rounded-tl-sm'
                            )}>
                              {showAvatar && !isMine && (
                                <p className="text-xs font-medium mb-1 opacity-70">
                                  {message.sender?.full_name || message.sender?.email}
                                </p>
                              )}
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              <p className={cn(
                                'text-xs mt-1',
                                isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'
                              )}>
                                {format(new Date(message.created_at), 'HH:mm')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Message Input */}
                <div className="p-4 border-t bg-card">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim() || sendMessage.isPending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a conversation</p>
                  <p className="text-sm">or start a new one</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {teamMembers.map(member => (
                <button
                  key={member.id}
                  onClick={() => startNewConversation(member.id)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-accent rounded-lg transition-colors text-left"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.full_name || member.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.full_name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
