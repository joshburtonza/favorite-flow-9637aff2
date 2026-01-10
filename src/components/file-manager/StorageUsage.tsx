import { useQuery } from '@tanstack/react-query';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StorageUsageProps {
  compact?: boolean;
}

export function StorageUsage({ compact = false }: StorageUsageProps) {
  const { data: storageData, isLoading } = useQuery({
    queryKey: ['user-storage'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user storage
      const { data: storage } = await supabase
        .from('user_storage')
        .select('used_bytes, file_count')
        .eq('user_id', user.id)
        .single();

      // Get default plan limit
      const { data: plan } = await supabase
        .from('storage_plans')
        .select('storage_limit_bytes, name')
        .eq('is_default', true)
        .single();

      return {
        used: storage?.used_bytes || 0,
        limit: plan?.storage_limit_bytes || 10737418240, // 10GB default
        fileCount: storage?.file_count || 0,
        planName: plan?.name || 'Standard',
      };
    },
  });

  if (isLoading || !storageData) return null;

  const { used, limit, fileCount, planName } = storageData;
  const percentage = Math.min((used / limit) * 100, 100);
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 95;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <HardDrive className={cn(
          'h-4 w-4',
          isCritical ? 'text-destructive' : isWarning ? 'text-warning' : 'text-muted-foreground'
        )} />
        <div className="flex-1 min-w-0">
          <Progress 
            value={percentage} 
            className={cn(
              'h-1.5',
              isCritical && '[&>div]:bg-destructive',
              isWarning && !isCritical && '[&>div]:bg-warning'
            )}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {formatBytes(used)}
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-xl bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HardDrive className={cn(
            'h-5 w-5',
            isCritical ? 'text-destructive' : isWarning ? 'text-warning' : 'text-muted-foreground'
          )} />
          <span className="font-medium">Storage</span>
        </div>
        {(isWarning || isCritical) && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            isCritical ? 'text-destructive' : 'text-warning'
          )}>
            <AlertTriangle className="h-3 w-3" />
            {isCritical ? 'Almost full' : 'Running low'}
          </div>
        )}
      </div>

      <Progress 
        value={percentage} 
        className={cn(
          'h-2 mb-2',
          isCritical && '[&>div]:bg-destructive',
          isWarning && !isCritical && '[&>div]:bg-warning'
        )}
      />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {formatBytes(used)} of {formatBytes(limit)} used
        </span>
        <span className="text-muted-foreground">
          {fileCount} files
        </span>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {planName} plan · {Math.round(percentage)}% used
      </div>
    </div>
  );
}
