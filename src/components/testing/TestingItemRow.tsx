import { useState } from 'react';
import { TestResult, TestingResult } from '@/hooks/useTestingChecklist';
import { TestItem } from '@/lib/testing-definitions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  SkipForward, 
  Circle,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';

interface TestingItemRowProps {
  item: TestItem;
  result: TestingResult | undefined;
  onUpdate: (featureKey: string, result: TestResult, notes?: string) => void;
}

const resultConfig: Record<TestResult, { icon: typeof Circle; color: string; bgColor: string }> = {
  untested: { icon: Circle, color: 'text-muted-foreground/50', bgColor: 'bg-muted/30' },
  pass: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  fail: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  skip: { icon: SkipForward, color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
  needs_review: { icon: HelpCircle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
};

export function TestingItemRow({ item, result, onUpdate }: TestingItemRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(result?.notes || '');
  
  const currentResult = result?.result || 'untested';
  const config = resultConfig[currentResult];
  const Icon = config.icon;

  const handleResultClick = (newResult: TestResult) => {
    onUpdate(item.key, newResult, notes);
  };

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes);
  };

  const handleNotesSave = () => {
    onUpdate(item.key, currentResult, notes);
    setExpanded(false);
  };

  return (
    <div className={cn('border rounded-lg transition-colors', config.bgColor)}>
      <div className="flex items-center gap-4 p-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0', config.color)} />
        
        <div className="flex-1 min-w-0">
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-muted-foreground truncate">{item.description}</div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={currentResult === 'pass' ? 'default' : 'outline'}
            className={cn(
              'h-8 px-2',
              currentResult === 'pass' && 'bg-green-600 hover:bg-green-700'
            )}
            onClick={() => handleResultClick('pass')}
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentResult === 'fail' ? 'default' : 'outline'}
            className={cn(
              'h-8 px-2',
              currentResult === 'fail' && 'bg-red-600 hover:bg-red-700'
            )}
            onClick={() => handleResultClick('fail')}
          >
            <XCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentResult === 'needs_review' ? 'default' : 'outline'}
            className={cn(
              'h-8 px-2',
              currentResult === 'needs_review' && 'bg-orange-600 hover:bg-orange-700'
            )}
            onClick={() => handleResultClick('needs_review')}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={currentResult === 'skip' ? 'default' : 'outline'}
            className="h-8 px-2"
            onClick={() => handleResultClick('skip')}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2"
          onClick={() => setExpanded(!expanded)}
        >
          {result?.notes && <MessageSquare className="h-3 w-3 mr-1" />}
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          <Textarea
            placeholder="Add notes about this test (issues found, etc.)"
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="min-h-[80px] text-sm"
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleNotesSave}>
              Save Notes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
