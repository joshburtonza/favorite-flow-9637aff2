import { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIQueryChat } from './AIQueryChat';

export function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full',
          'flex items-center justify-center',
          'bg-primary text-primary-foreground',
          'shadow-lg hover:shadow-xl transition-all duration-300',
          'hover:scale-110 active:scale-95',
          'animate-pulse-glow'
        )}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(239 84% 67%))',
          boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
        }}
        title="AI Assistant"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              AI Assistant
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <AIQueryChat />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
