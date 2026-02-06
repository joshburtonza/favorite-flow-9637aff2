import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { InterviewDashboard } from '@/components/interviews/InterviewDashboard';
import { StaffInterviewForm } from '@/components/interviews/StaffInterviewForm';
import { useStaffInterviews } from '@/hooks/useStaffInterviews';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function StaffInterviews() {
  const { isAdmin } = usePermissions();
  const { pendingInterview, myInterviews } = useStaffInterviews();
  const [showForm, setShowForm] = useState(false);

  // If user has a pending interview, show it
  const hasPendingInterview = pendingInterview && pendingInterview.status !== 'completed';

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{
              background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
            }}
          >
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Staff Interviews</h1>
            <p className="text-muted-foreground">
              {isAdmin ? 'Manage staff workflow interviews' : 'Complete your workflow interview'}
            </p>
          </div>
        </div>

        {/* Show pending interview notification for staff */}
        {hasPendingInterview && !showForm && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                <CardTitle>Interview Pending</CardTitle>
              </div>
              <CardDescription>
                You have an interview assigned to you. Please complete it to help us understand your workflow.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {pendingInterview.due_date && (
                    <span>Due: {format(new Date(pendingInterview.due_date), 'MMM d, yyyy')}</span>
                  )}
                </div>
                <Button onClick={() => setShowForm(true)}>
                  Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show the interview form */}
        {showForm && pendingInterview && (
          <div className="py-4">
            <StaffInterviewForm 
              interviewId={pendingInterview.id}
              onComplete={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Show completed interviews for staff */}
        {!isAdmin && !showForm && myInterviews.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Your Interviews</h3>
            <div className="grid gap-4">
              {myInterviews.map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      {interview.status === 'completed' ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium">Workflow Interview</div>
                        <div className="text-sm text-muted-foreground">
                          {interview.completed_at 
                            ? `Completed ${format(new Date(interview.completed_at), 'MMM d, yyyy')}`
                            : interview.due_date 
                              ? `Due ${format(new Date(interview.due_date), 'MMM d, yyyy')}`
                              : 'No due date'
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant={interview.status === 'completed' ? 'secondary' : 'default'}>
                      {interview.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Admin Dashboard */}
        {isAdmin && !showForm && <InterviewDashboard />}
      </div>
    </AppLayout>
  );
}
