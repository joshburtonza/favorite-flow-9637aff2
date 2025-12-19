import { useMyTasks, useUpdateTask, TaskPriority } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle2, Clock, AlertCircle, AlertTriangle, 
  Loader2, Package, Calendar, ArrowRight
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const priorityConfig: Record<TaskPriority, { icon: typeof Clock; color: string; label: string }> = {
  low: { icon: Clock, color: 'text-muted-foreground', label: 'Low' },
  medium: { icon: Clock, color: 'text-primary', label: 'Medium' },
  high: { icon: AlertCircle, color: 'text-warning', label: 'High' },
  urgent: { icon: AlertTriangle, color: 'text-destructive', label: 'Urgent' },
};

export function MyTasksWidget() {
  const { data: tasks, isLoading } = useMyTasks();
  const { mutate: updateTask } = useUpdateTask();
  const navigate = useNavigate();

  const handleComplete = (taskId: string) => {
    updateTask({ id: taskId, status: 'completed' });
  };

  const handleStartTask = (taskId: string) => {
    updateTask({ id: taskId, status: 'in_progress' });
  };

  const getDueDateColor = (dueDate: string | null) => {
    if (!dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-warning';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="glass-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between border-b border-glass-border pb-4 mb-4">
        <div className="card-label">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          My Tasks
        </div>
        <Badge variant="secondary" className="text-xs">
          {tasks?.length || 0} active
        </Badge>
      </div>

      {!tasks || tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No pending tasks</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </div>
      ) : (
        <ScrollArea className="h-[280px]">
          <div className="space-y-3">
            {tasks.map((task) => {
              const priority = priorityConfig[task.priority];
              const PriorityIcon = priority.icon;
              
              return (
                <div 
                  key={task.id}
                  className="p-3 rounded-lg border border-glass-border bg-background/50 hover:bg-background/80 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleComplete(task.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{task.title}</p>
                        <PriorityIcon className={`h-3.5 w-3.5 shrink-0 ${priority.color}`} />
                      </div>
                      
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        {task.lot_number && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            LOT {task.lot_number}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${getDueDateColor(task.due_date)}`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'MMM dd')}
                          </span>
                        )}
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] h-4 ${
                            task.status === 'in_progress' 
                              ? 'bg-primary/10 border-primary/30 text-primary' 
                              : 'bg-muted/50'
                          }`}
                        >
                          {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    {task.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleStartTask(task.id)}
                      >
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <div className="pt-4 border-t border-glass-border mt-4">
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full gap-2 text-xs"
          onClick={() => navigate('/tasks')}
        >
          View All Tasks
          <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
