import { AppLayout } from '@/components/layout/AppLayout';
import { TestingChecklist as TestingChecklistComponent } from '@/components/testing/TestingChecklist';
import { ClipboardCheck } from 'lucide-react';

export default function TestingChecklist() {
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
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Testing Checklist</h1>
            <p className="text-muted-foreground">Systematically validate all platform features</p>
          </div>
        </div>

        <TestingChecklistComponent />
      </div>
    </AppLayout>
  );
}
