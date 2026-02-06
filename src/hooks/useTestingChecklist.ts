import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { testItems, testCategories } from '@/lib/testing-definitions';

export type TestResult = 'untested' | 'pass' | 'fail' | 'skip' | 'needs_review';
export type TestRunStatus = 'active' | 'completed' | 'archived';

export interface TestingRun {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  status: TestRunStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestingResult {
  id: string;
  run_id: string;
  feature_key: string;
  category: string;
  tester_id: string | null;
  result: TestResult;
  notes: string | null;
  tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useTestingChecklist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all test runs
  const { data: testRuns = [], isLoading: loadingRuns, refetch: refetchRuns } = useQuery({
    queryKey: ['testing-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('testing_runs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TestingRun[];
    },
  });

  // Get active test run
  const activeRun = testRuns.find(r => r.status === 'active');

  // Fetch results for a specific run
  const useTestResults = (runId: string | null) => {
    return useQuery({
      queryKey: ['testing-results', runId],
      queryFn: async () => {
        if (!runId) return [];
        
        const { data, error } = await supabase
          .from('testing_results')
          .select('*')
          .eq('run_id', runId);
        
        if (error) throw error;
        return data as TestingResult[];
      },
      enabled: !!runId,
    });
  };

  // Create a new test run
  const createTestRun = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!user) throw new Error('Must be logged in');

      // Create the test run
      const { data: run, error: runError } = await supabase
        .from('testing_runs')
        .insert({
          name: data.name,
          description: data.description || null,
          created_by: user.id,
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (runError) throw runError;

      // Initialize all test items as untested
      const testResultsToInsert = testItems.map(item => ({
        run_id: run.id,
        feature_key: item.key,
        category: item.category,
        result: 'untested' as TestResult,
      }));

      const { error: resultsError } = await supabase
        .from('testing_results')
        .insert(testResultsToInsert);
      
      if (resultsError) throw resultsError;

      return run;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing-runs'] });
      toast({ title: 'Test run created', description: 'You can now start testing!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error creating test run', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Update a test result
  const updateTestResult = useMutation({
    mutationFn: async ({ 
      runId,
      featureKey, 
      result, 
      notes 
    }: { 
      runId: string;
      featureKey: string; 
      result: TestResult; 
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('testing_results')
        .update({
          result,
          notes: notes || null,
          tester_id: user?.id,
          tested_at: result !== 'untested' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('run_id', runId)
        .eq('feature_key', featureKey);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['testing-results', variables.runId] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error updating result', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Complete a test run
  const completeTestRun = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from('testing_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing-runs'] });
      toast({ title: 'Test run completed!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error completing test run', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Archive a test run
  const archiveTestRun = useMutation({
    mutationFn: async (runId: string) => {
      const { error } = await supabase
        .from('testing_runs')
        .update({
          status: 'archived',
          updated_at: new Date().toISOString(),
        })
        .eq('id', runId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['testing-runs'] });
      toast({ title: 'Test run archived' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error archiving test run', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });

  // Calculate progress for a run
  const calculateProgress = (results: TestingResult[]) => {
    const total = results.length;
    if (total === 0) return { total: 0, tested: 0, passed: 0, failed: 0, skipped: 0, needsReview: 0, percentage: 0 };
    
    const tested = results.filter(r => r.result !== 'untested').length;
    const passed = results.filter(r => r.result === 'pass').length;
    const failed = results.filter(r => r.result === 'fail').length;
    const skipped = results.filter(r => r.result === 'skip').length;
    const needsReview = results.filter(r => r.result === 'needs_review').length;
    
    return {
      total,
      tested,
      passed,
      failed,
      skipped,
      needsReview,
      percentage: Math.round((tested / total) * 100),
    };
  };

  // Get results grouped by category
  const groupResultsByCategory = (results: TestingResult[]) => {
    const grouped: Record<string, TestingResult[]> = {};
    
    testCategories.forEach(category => {
      grouped[category] = results.filter(r => r.category === category);
    });
    
    return grouped;
  };

  return {
    testRuns,
    activeRun,
    loadingRuns,
    refetchRuns,
    useTestResults,
    createTestRun,
    updateTestResult,
    completeTestRun,
    archiveTestRun,
    calculateProgress,
    groupResultsByCategory,
    testItems,
    testCategories,
  };
}
