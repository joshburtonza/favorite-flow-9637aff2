import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AIQueryChat } from './AIQueryChat';

export function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating FLAIR Button */}
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
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(217 91% 60%))',
          boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
        }}
        title="FLAIR - Operations Manager"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* FLAIR Chat Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="font-bold">FLAIR</span>
                <span className="text-muted-foreground font-normal ml-2">Operations Manager</span>
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Your intelligent logistics assistant - query data, update shipments, and get proactive insights
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <AIQueryChat />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
