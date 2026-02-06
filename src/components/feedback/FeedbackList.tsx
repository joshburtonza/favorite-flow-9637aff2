import { useState } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFeedback, StaffFeedback, FeedbackStatus, FeedbackCategory, FeedbackPriority } from '@/hooks/useFeedback';
import { 
  Bug, 
  Lightbulb, 
  HelpCircle, 
  MessageCircle, 
  Trash2, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const categoryIcons: Record<FeedbackCategory, typeof Bug> = {
  bug: Bug,
  suggestion: Lightbulb,
  question: HelpCircle,
  other: MessageCircle,
};

const statusConfig: Record<FeedbackStatus, { label: string; color: string; icon: typeof Clock }> = {
  new: { label: 'New', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: AlertTriangle },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
  dismissed: { label: 'Dismissed', color: 'bg-muted text-muted-foreground border-muted', icon: XCircle },
};

const priorityConfig: Record<FeedbackPriority, { label: string; color: string }> = {
  low: { label: 'Low', color: 'bg-muted text-muted-foreground' },
  medium: { label: 'Medium', color: 'bg-blue-500/10 text-blue-500' },
  high: { label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  critical: { label: 'Critical', color: 'bg-red-500/10 text-red-500' },
};

export function FeedbackList() {
  const { allFeedback, loadingAllFeedback, updateFeedback, deleteFeedback, stats } = useFeedback();
  const [selectedFeedback, setSelectedFeedback] = useState<StaffFeedback | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filteredFeedback = allFeedback.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterCategory !== 'all' && f.category !== filterCategory) return false;
    return true;
  });

  const handleStatusChange = (id: string, status: FeedbackStatus) => {
    updateFeedback.mutate({ id, status });
  };

  const handleSaveNotes = () => {
    if (!selectedFeedback) return;
    updateFeedback.mutate({ id: selectedFeedback.id, admin_notes: adminNotes });
    setSelectedFeedback(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this feedback?')) {
      deleteFeedback.mutate(id);
    }
  };

  if (loadingAllFeedback) {
    return <div className="text-center py-8 text-muted-foreground">Loading feedback...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-500">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-500">Bugs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.bugs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="bug">Bugs</SelectItem>
            <SelectItem value="suggestion">Suggestions</SelectItem>
            <SelectItem value="question">Questions</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredFeedback.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No feedback found
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.map((feedback) => {
                const CategoryIcon = categoryIcons[feedback.category];
                const statusInfo = statusConfig[feedback.status];
                const priorityInfo = priorityConfig[feedback.priority];
                
                return (
                  <TableRow key={feedback.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="capitalize text-sm">{feedback.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{feedback.title}</div>
                      {feedback.affected_area && (
                        <div className="text-xs text-muted-foreground">{feedback.affected_area}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{feedback.user_name || feedback.user_email || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('border', priorityInfo.color)}>
                        {priorityInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={feedback.status}
                        onValueChange={(value) => handleStatusChange(feedback.id, value as FeedbackStatus)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(feedback.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedFeedback(feedback);
                            setAdminNotes(feedback.admin_notes || '');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(feedback.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFeedback && (
                <>
                  {(() => {
                    const Icon = categoryIcons[selectedFeedback.category];
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {selectedFeedback.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={priorityConfig[selectedFeedback.priority].color}>
                  {priorityConfig[selectedFeedback.priority].label} Priority
                </Badge>
                <Badge variant="outline" className={statusConfig[selectedFeedback.status].color}>
                  {statusConfig[selectedFeedback.status].label}
                </Badge>
                {selectedFeedback.affected_area && (
                  <Badge variant="secondary">{selectedFeedback.affected_area}</Badge>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedFeedback.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Submitted by:</span>{' '}
                  {selectedFeedback.user_name || selectedFeedback.user_email}
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{' '}
                  {format(new Date(selectedFeedback.created_at), 'PPpp')}
                </div>
                {selectedFeedback.current_url && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Page:</span>{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {selectedFeedback.current_url}
                    </code>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Admin Notes</h4>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this feedback..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedFeedback(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
