import { TestResult } from '@/hooks/useTestingChecklist';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, HelpCircle, SkipForward, Circle } from 'lucide-react';

interface TestingProgressProps {
  progress: {
    total: number;
    tested: number;
    passed: number;
    failed: number;
    skipped: number;
    needsReview: number;
    percentage: number;
  };
}

export function TestingProgress({ progress }: TestingProgressProps) {
  const items = [
    { label: 'Passed', value: progress.passed, color: 'text-green-500', Icon: CheckCircle },
    { label: 'Failed', value: progress.failed, color: 'text-red-500', Icon: XCircle },
    { label: 'Needs Review', value: progress.needsReview, color: 'text-orange-500', Icon: HelpCircle },
    { label: 'Skipped', value: progress.skipped, color: 'text-muted-foreground', Icon: SkipForward },
    { label: 'Untested', value: progress.total - progress.tested, color: 'text-muted-foreground/50', Icon: Circle },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold">{progress.percentage}%</span>
          <span className="text-muted-foreground ml-2">Complete</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {progress.tested} of {progress.total} tests completed
        </div>
      </div>
      
      <Progress value={progress.percentage} className="h-3" />
      
      <div className="flex flex-wrap gap-4">
        {items.map(({ label, value, color, Icon }) => (
          <div key={label} className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', color)} />
            <span className="text-sm">
              <span className="font-medium">{value}</span>{' '}
              <span className="text-muted-foreground">{label}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
