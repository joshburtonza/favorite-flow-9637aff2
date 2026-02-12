import { useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, RefreshCw, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useFlair } from '@/contexts/FlairContext';
import { FLAIR_EXAMPLE_QUERIES, FLAIR_UPDATE_EXAMPLES } from '@/lib/flair-prompts';
import { useState } from 'react';

export function GlobalFlairChat() {
  const { messages, isOpen, isLoading, setIsOpen, sendMessage, clearMessages } = useFlair();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
    <>
      {/* Floating FLAIR Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed right-6 z-50 w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl transition-all duration-300',
          'hover:scale-110 active:scale-95',
          'animate-pulse-glow',
          isMobile ? 'bottom-24' : 'bottom-6'
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(217 91% 60%))',
          boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
        }}
        title="FLAIR - Your Operations Manager"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* FLAIR Chat Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-3 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">FLAIR</span>
                  <span className="text-xs text-muted-foreground font-normal">Favorite Logistics AI Resource</span>
                </div>
              </DialogTitle>
              {messages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearMessages}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
            <DialogDescription className="text-xs sr-only">
              Your intelligent logistics assistant for querying data and managing operations
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center mb-3">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Hello! I'm FLAIR</h3>
                  <p className="text-sm text-muted-foreground">
                    Your operations manager. I can query data AND update shipments.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground px-1 mb-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Ask questions:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FLAIR_EXAMPLE_QUERIES.slice(0, 3).map((query, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-1.5"
                          onClick={() => sendMessage(query)}
                        >
                          {query}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground px-1 mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Send updates:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {FLAIR_UPDATE_EXAMPLES.slice(0, 3).map((query, i) => (
                        <Button
                          key={i}
                          variant="secondary"
                          size="sm"
                          className="text-xs h-auto py-1.5"
                          onClick={() => sendMessage(query)}
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
                      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                        <Sparkles className="h-4 w-4 text-white" />
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

                      {/* Update Success */}
                      {message.update_result?.success && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50 text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            Update applied to LOT {message.update_result.lot_number}
                          </span>
                        </div>
                      )}

                      {/* Context Summary */}
                      {message.context_summary && !message.update_result && (
                        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                          {message.context_summary.active_shipments !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {message.context_summary.active_shipments} active
                            </Badge>
                          )}
                          {message.context_summary.mtd_profit !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              {formatCurrency(message.context_summary.mtd_profit)} MTD profit
                            </Badge>
                          )}
                          {message.context_summary.total_supplier_balance !== undefined && (
                            <Badge variant="secondary" className="text-xs">
                              ${message.context_summary.total_supplier_balance.toLocaleString()} owed
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Tools Used */}
                      {message.tools_used && message.tools_used.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                          {message.tools_used.map((tool, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] py-0">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-medium">You</span>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
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
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FLAIR about shipments, costs, suppliers..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
