import { useState } from 'react';
import { format } from 'date-fns';
import { useStaffInterviews, StaffInterview } from '@/hooks/useStaffInterviews';
import { InterviewResponseView } from './InterviewResponseView';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Eye, 
  Trash2, 
  Users, 
  Clock, 
  CheckCircle,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle },
};

export function InterviewDashboard() {
  const { 
    allInterviews, 
    loadingAllInterviews, 
    createInterview, 
    deleteInterview,
    stats 
  } = useStaffInterviews();
  
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<StaffInterview | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch all profiles for assignment dropdown
  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Filter out users who already have pending interviews
  const availableProfiles = profiles.filter(p => 
    !allInterviews.some(i => i.user_id === p.id && i.status !== 'completed')
  );

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsAssigning(true);
    try {
      await createInterview.mutateAsync({
        user_id: selectedUserId,
        due_date: dueDate || undefined,
      });
      setAssignDialogOpen(false);
      setSelectedUserId('');
      setDueDate('');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this interview assignment?')) {
      deleteInterview.mutate(id);
    }
  };

  const handleViewResponses = (interview: StaffInterview) => {
    setSelectedInterview(interview);
    setViewDialogOpen(true);
  };

  if (loadingAllInterviews) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium text-yellow-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Interview Assignments</h3>
        <Button onClick={() => setAssignDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Assign Interview
        </Button>
      </div>

      {/* Table */}
      {allInterviews.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Interviews Assigned</h3>
          <p className="text-muted-foreground mb-4">
            Assign interviews to staff members to gather their workflow information.
          </p>
          <Button onClick={() => setAssignDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Assign First Interview
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allInterviews.map((interview) => {
                const config = statusConfig[interview.status];
                const StatusIcon = config.icon;
                
                return (
                  <TableRow key={interview.id}>
                    <TableCell>
                      <div className="font-medium">
                        {interview.user_name || interview.user_email || 'Unknown'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {interview.assigned_by_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {interview.due_date 
                        ? format(new Date(interview.due_date), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {interview.completed_at 
                        ? format(new Date(interview.completed_at), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {interview.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewResponses(interview)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(interview.id)}
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

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Interview</DialogTitle>
            <DialogDescription>
              Select a staff member to assign the workflow interview to.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Staff Member</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProfiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All staff members have been assigned interviews.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Due Date (Optional)</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedUserId || isAssigning}
            >
              {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Interview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Responses Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Interview Responses</DialogTitle>
          </DialogHeader>
          {selectedInterview && (
            <InterviewResponseView 
              interviewId={selectedInterview.id}
              userName={selectedInterview.user_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
