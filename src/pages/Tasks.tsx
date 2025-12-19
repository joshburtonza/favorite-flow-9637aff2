import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTasks, useUpdateTask, useDeleteTask, TaskPriority, TaskStatus } from '@/hooks/useTasks';
import { usePermissions } from '@/hooks/usePermissions';
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Plus, Search, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  Loader2, Package, Calendar, User, MoreVertical, Trash2, Play, Check
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

const priorityConfig: Record<TaskPriority, { icon: typeof Clock; color: string; bgColor: string }> = {
  low: { icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted/50' },
  medium: { icon: Clock, color: 'text-primary', bgColor: 'bg-primary/10' },
  high: { icon: AlertCircle, color: 'text-warning', bgColor: 'bg-warning/10' },
  urgent: { icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const statusConfig: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', color: 'bg-primary/20 text-primary' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-destructive/20 text-destructive' },
};

const Tasks = () => {
  const { isAdmin } = usePermissions();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');

  const { data: tasks, isLoading } = useTasks();
  const { mutate: updateTask } = useUpdateTask();
  const { mutate: deleteTask } = useDeleteTask();

  const filteredTasks = tasks?.filter(task => {
    const matchesSearch = searchQuery === '' ||
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.lot_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const taskStats = {
    total: tasks?.length || 0,
    pending: tasks?.filter(t => t.status === 'pending').length || 0,
    inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
    completed: tasks?.filter(t => t.status === 'completed').length || 0,
    overdue: tasks?.filter(t => t.due_date && isPast(new Date(t.due_date)) && t.status !== 'completed').length || 0,
  };

  const getDueDateColor = (dueDate: string | null, status: TaskStatus) => {
    if (status === 'completed' || status === 'cancelled') return 'text-muted-foreground';
    if (!dueDate) return 'text-muted-foreground';
    const date = new Date(dueDate);
    if (isPast(date) && !isToday(date)) return 'text-destructive';
    if (isToday(date)) return 'text-warning';
    return 'text-muted-foreground';
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Team Productivity</p>
            <h1 className="text-3xl font-semibold gradient-text">Task Management</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Task
            </Button>
          )}
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Total Tasks</p>
            <p className="text-2xl font-semibold mt-1">{taskStats.total}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-semibold mt-1 text-warning">{taskStats.pending}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-2xl font-semibold mt-1 text-primary">{taskStats.inProgress}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold mt-1 text-green-400">{taskStats.completed}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-semibold mt-1 text-destructive">{taskStats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="search-glass flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              className="bg-transparent border-0 p-0 h-auto focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as TaskStatus | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as TaskPriority | 'all')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Task List */}
        <div className="glass-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTasks?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium text-lg">No tasks found</p>
              <p className="text-sm mt-2">Create a new task to get started</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 p-1">
                {filteredTasks?.map((task) => {
                  const priority = priorityConfig[task.priority];
                  const status = statusConfig[task.status];
                  const PriorityIcon = priority.icon;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border border-glass-border bg-background/50 hover:bg-background/80 transition-all ${
                        task.status === 'completed' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Priority indicator */}
                        <div className={`p-2 rounded-lg ${priority.bgColor}`}>
                          <PriorityIcon className={`h-4 w-4 ${priority.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                              {task.title}
                            </h3>
                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                              {status.label}
                            </Badge>
                          </div>

                          {task.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                            {task.assigned_to_profile && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {task.assigned_to_profile.full_name || task.assigned_to_profile.email}
                              </span>
                            )}
                            {task.lot_number && (
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                LOT {task.lot_number}
                              </span>
                            )}
                            {task.due_date && (
                              <span className={`flex items-center gap-1 ${getDueDateColor(task.due_date, task.status)}`}>
                                <Calendar className="h-3 w-3" />
                                Due {format(new Date(task.due_date), 'MMM dd, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {task.status === 'pending' && (
                              <DropdownMenuItem onClick={() => updateTask({ id: task.id, status: 'in_progress' })}>
                                <Play className="h-4 w-4 mr-2" />
                                Start Task
                              </DropdownMenuItem>
                            )}
                            {task.status !== 'completed' && (
                              <DropdownMenuItem onClick={() => updateTask({ id: task.id, status: 'completed' })}>
                                <Check className="h-4 w-4 mr-2" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                            {isAdmin && (
                              <DropdownMenuItem 
                                onClick={() => deleteTask(task.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      <CreateTaskDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </AppLayout>
  );
};

export default Tasks;
