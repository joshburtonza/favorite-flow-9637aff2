import { AppLayout } from '@/components/layout/AppLayout';
import { FeedbackList } from '@/components/feedback/FeedbackList';
import { MessageSquarePlus } from 'lucide-react';

export default function Feedback() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
            }}
          >
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Feedback Management</h1>
            <p className="text-muted-foreground">Review and manage staff feedback</p>
          </div>
        </div>

        <FeedbackList />
      </div>
    </AppLayout>
  );
}
