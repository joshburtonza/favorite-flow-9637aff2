import { useState, useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useConversations, useMessages, Conversation } from '@/hooks/useMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MentionInput } from '@/components/messages/MentionInput';
import { MessageContent } from '@/components/messages/MessageContent';
import { MessageSquare, Plus, Send, ArrowLeft, Users, Search, Paperclip, X, FileIcon } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

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
  const { typingText, sendTyping, stopTyping, isTyping } = useTypingIndicator(selectedConversation?.id || null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch all team members for new conversation and mentions
  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['all-team-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Team members excluding current user (for new conversations)
  const teamMembers = allTeamMembers.filter(m => m.id !== user?.id);

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
    if (!newMessage.trim() && attachments.length === 0) return;
    
    let uploadedAttachments: { name: string; url: string; type: string; size: number }[] = [];
    
    // Upload attachments if any
    if (attachments.length > 0) {
      for (const file of attachments) {
        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(`messages/${selectedConversation?.id}/${fileName}`, file);
        
        if (error) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(data.path);
        
        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          type: file.type,
          size: file.size
        });
      }
    }
    
    await sendMessage.mutateAsync({ 
      content: newMessage || (uploadedAttachments.length > 0 ? '📎 Attachment' : ''),
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
    });
    setNewMessage('');
    setAttachments([]);
    stopTyping();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleMentionChange = (value: string) => {
    setNewMessage(value);
    const userName = user?.user_metadata?.full_name || user?.email || 'Someone';
    sendTyping(userName);
  };


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files].slice(0, 5)); // Max 5 files
    }
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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
                              <MessageContent content={message.content} />
                              
                              {/* Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((att: any, i: number) => (
                                    <a
                                      key={i}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        'flex items-center gap-2 text-xs p-2 rounded',
                                        isMine ? 'bg-primary-foreground/10' : 'bg-background'
                                      )}
                                    >
                                      <FileIcon className="h-4 w-4" />
                                      <span className="truncate">{att.name}</span>
                                    </a>
                                  ))}
                                </div>
                              )}
                              
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

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="px-4 py-2 text-xs text-muted-foreground animate-pulse">
                    {typingText}
                  </div>
                )}

                {/* Message Input */}
                <div className="p-4 border-t bg-card space-y-2">
                  {/* Attachment Preview */}
                  {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((file, i) => (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm"
                        >
                          <FileIcon className="h-4 w-4" />
                          <span className="truncate max-w-32">{file.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeAttachment(i)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <MentionInput
                      value={newMessage}
                      onChange={handleMentionChange}
                      onKeyPress={handleKeyPress}
                      onBlur={stopTyping}
                      teamMembers={allTeamMembers}
                      placeholder="Type a message... Use @ to mention"
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={(!newMessage.trim() && attachments.length === 0) || sendMessage.isPending}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Select a team member to start a conversation.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            <div className="space-y-2">
              {teamMembers.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No team members available</p>
                  <p className="text-sm">Add team members to start conversations.</p>
                </div>
              ) : (
                teamMembers.map(member => (
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
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
