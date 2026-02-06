import { useState } from 'react';
import { TestingResult, TestResult } from '@/hooks/useTestingChecklist';
import { TestItem, getTestItemsByCategory } from '@/lib/testing-definitions';
import { TestingItemRow } from './TestingItemRow';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TestingCategorySectionProps {
  category: string;
  results: TestingResult[];
  onUpdate: (featureKey: string, result: TestResult, notes?: string) => void;
}

export function TestingCategorySection({ category, results, onUpdate }: TestingCategorySectionProps) {
  const [expanded, setExpanded] = useState(true);
  
  const items = getTestItemsByCategory(category);
  
  // Calculate category stats
  const passed = results.filter(r => r.result === 'pass').length;
  const failed = results.filter(r => r.result === 'fail').length;
  const total = items.length;
  const tested = results.filter(r => r.result !== 'untested').length;
  
  const getResultForItem = (key: string) => results.find(r => r.feature_key === key);

  return (
    <div className="border rounded-lg overflow-hidden">
      <Button
        variant="ghost"
        className="w-full justify-start p-4 h-auto hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 w-full">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          
          <span className="font-semibold text-lg">{category}</span>
          
          <div className="flex items-center gap-2 ml-auto">
            {passed > 0 && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                {passed}
              </Badge>
            )}
            {failed > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                <XCircle className="h-3 w-3 mr-1" />
                {failed}
              </Badge>
            )}
            <Badge variant="secondary">
              <Circle className="h-3 w-3 mr-1" />
              {tested}/{total}
            </Badge>
          </div>
        </div>
      </Button>

      {expanded && (
        <div className="p-4 pt-0 space-y-2">
          {items.map((item) => (
            <TestingItemRow
              key={item.key}
              item={item}
              result={getResultForItem(item.key)}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
