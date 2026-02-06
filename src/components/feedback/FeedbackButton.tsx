import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FeedbackDialog } from './FeedbackDialog';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className={cn(
          "fixed bottom-24 right-6 z-50 gap-2 shadow-lg",
          "bg-card/95 backdrop-blur-sm border-border hover:bg-accent",
          "md:bottom-6"
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Feedback</span>
      </Button>
      
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
