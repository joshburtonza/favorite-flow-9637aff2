import { useState } from 'react';
import { useTestingChecklist, TestResult } from '@/hooks/useTestingChecklist';
import { testCategories } from '@/lib/testing-definitions';
import { TestingProgress } from './TestingProgress';
import { TestingCategorySection } from './TestingCategorySection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Plus, PlayCircle, CheckCircle, Archive, Loader2 } from 'lucide-react';

export function TestingChecklist() {
  const {
    testRuns,
    activeRun,
    loadingRuns,
    useTestResults,
    createTestRun,
    updateTestResult,
    completeTestRun,
    archiveTestRun,
    calculateProgress,
    groupResultsByCategory,
    testCategories: categories,
  } = useTestingChecklist();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRunName, setNewRunName] = useState('');
  const [newRunDescription, setNewRunDescription] = useState('');
  const [selectedRunId, setSelectedRunId] = useState<string | null>(activeRun?.id || null);
  const [isCreating, setIsCreating] = useState(false);

  // Get results for selected run
  const { data: results = [], isLoading: loadingResults } = useTestResults(selectedRunId);

  const progress = calculateProgress(results);
  const groupedResults = groupResultsByCategory(results);

  const handleCreateRun = async () => {
    if (!newRunName.trim()) return;
    setIsCreating(true);
    try {
      const run = await createTestRun.mutateAsync({
        name: newRunName,
        description: newRunDescription,
      });
      setSelectedRunId(run.id);
      setCreateDialogOpen(false);
      setNewRunName('');
      setNewRunDescription('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateResult = (featureKey: string, result: TestResult, notes?: string) => {
    if (!selectedRunId) return;
    updateTestResult.mutate({ runId: selectedRunId, featureKey, result, notes });
  };

  const handleCompleteRun = () => {
    if (!selectedRunId) return;
    if (confirm('Are you sure you want to mark this test run as complete?')) {
      completeTestRun.mutate(selectedRunId);
    }
  };

  const handleArchiveRun = (runId: string) => {
    if (confirm('Are you sure you want to archive this test run?')) {
      archiveTestRun.mutate(runId);
      if (selectedRunId === runId) {
        setSelectedRunId(null);
      }
    }
  };

  const selectedRun = testRuns.find(r => r.id === selectedRunId);

  if (loadingRuns) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-4">
        <Select
          value={selectedRunId || ''}
          onValueChange={(value) => setSelectedRunId(value || null)}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select a test run..." />
          </SelectTrigger>
          <SelectContent>
            {testRuns.filter(r => r.status !== 'archived').map((run) => (
              <SelectItem key={run.id} value={run.id}>
                <div className="flex items-center gap-2">
                  {run.status === 'active' ? (
                    <PlayCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{run.name}</span>
                  <Badge variant="outline" className="ml-2">
                    {run.status}
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Test Run
        </Button>

        {selectedRun?.status === 'active' && (
          <Button variant="outline" onClick={handleCompleteRun}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete Run
          </Button>
        )}

        {selectedRun && selectedRun.status !== 'archived' && (
          <Button variant="ghost" onClick={() => handleArchiveRun(selectedRun.id)}>
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        )}
      </div>

      {/* Selected Run Info */}
      {selectedRun && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{selectedRun.name}</CardTitle>
              <Badge variant={selectedRun.status === 'active' ? 'default' : 'secondary'}>
                {selectedRun.status}
              </Badge>
            </div>
            {selectedRun.description && (
              <p className="text-sm text-muted-foreground">{selectedRun.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 text-sm text-muted-foreground mb-4">
              <span>Started: {format(new Date(selectedRun.started_at || selectedRun.created_at), 'PPp')}</span>
              {selectedRun.completed_at && (
                <span>Completed: {format(new Date(selectedRun.completed_at), 'PPp')}</span>
              )}
            </div>
            <TestingProgress progress={progress} />
          </CardContent>
        </Card>
      )}

      {/* Test Categories */}
      {selectedRunId && !loadingResults && (
        <div className="space-y-4">
          {categories.map((category) => (
            <TestingCategorySection
              key={category}
              category={category}
              results={groupedResults[category] || []}
              onUpdate={handleUpdateResult}
            />
          ))}
        </div>
      )}

      {!selectedRunId && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No Test Run Selected</h3>
          <p className="text-muted-foreground mb-4">
            Select an existing test run or create a new one to start testing.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Test Run
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test Run</DialogTitle>
            <DialogDescription>
              Start a new testing session to validate platform features.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Pre-Launch Test Run 1"
                value={newRunName}
                onChange={(e) => setNewRunName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="What are you testing in this run?"
                value={newRunDescription}
                onChange={(e) => setNewRunDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRun} disabled={!newRunName.trim() || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create & Start Testing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
