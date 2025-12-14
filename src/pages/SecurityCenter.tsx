import { useState } from 'react';
import { useSecurityRequests } from '@/hooks/useSecurityRequests';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppLayout } from '@/components/layout/AppLayout';
import { Navigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { 
  Shield, 
  Bell, 
  Download, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Camera,
  FileText,
  Loader2
} from 'lucide-react';

export default function SecurityCenter() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const { requests, loading: requestsLoading, pendingCount, approveRequest, denyRequest } = useSecurityRequests();
  const { notifications, loading: notifLoading, unreadCount, markAsRead, markAllAsRead } = useAdminNotifications();
  
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; requestId: string; action: 'approve' | 'deny' }>({ 
    open: false, 
    requestId: '', 
    action: 'approve' 
  });
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  if (permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleReview = async () => {
    setProcessing(true);
    if (reviewDialog.action === 'approve') {
      await approveRequest(reviewDialog.requestId, reviewNotes);
    } else {
      await denyRequest(reviewDialog.requestId, reviewNotes);
    }
    setProcessing(false);
    setReviewDialog({ open: false, requestId: '', action: 'approve' });
    setReviewNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'denied':
        return <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'screenshot_attempt':
        return <Camera className="h-4 w-4 text-red-500" />;
      case 'download_request':
        return <Download className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Security Center</h1>
            <p className="text-muted-foreground">Monitor security events and manage access requests</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unread Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{unreadCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Access Requests
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Security Alerts
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Download & Export Requests</CardTitle>
                <CardDescription>Review and approve staff requests for file downloads and data exports</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : requests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No access requests yet</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {requests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-start gap-4 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{request.user_email}</span>
                              {getStatusBadge(request.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {request.request_type} {request.entity_type}: {request.entity_name}
                            </p>
                            {request.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Reason: {request.reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setReviewDialog({ open: true, requestId: request.id, action: 'approve' })}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setReviewDialog({ open: true, requestId: request.id, action: 'deny' })}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Deny
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Security Alerts</CardTitle>
                  <CardDescription>Screenshot attempts, suspicious activity, and security events</CardDescription>
                </div>
                {unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={markAllAsRead}>
                    Mark all as read
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {notifLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No security alerts</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                            notif.is_read ? 'bg-card/30' : 'bg-card/80 border-primary/30'
                          }`}
                          onClick={() => !notif.is_read && markAsRead(notif.id)}
                        >
                          <div className={`p-2 rounded-lg ${
                            notif.severity === 'critical' ? 'bg-red-500/10' : 
                            notif.severity === 'warning' ? 'bg-yellow-500/10' : 'bg-blue-500/10'
                          }`}>
                            {getNotificationIcon(notif.notification_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{notif.title}</span>
                              {!notif.is_read && (
                                <Badge variant="destructive" className="text-xs">New</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {getSeverityIcon(notif.severity)}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog({ ...reviewDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve Request' : 'Deny Request'}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve' 
                ? 'The user will be able to download/export for 24 hours.'
                : 'The user will be notified that their request was denied.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Add any notes about this decision..."
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ open: false, requestId: '', action: 'approve' })}>
              Cancel
            </Button>
            <Button 
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
              disabled={processing}
            >
              {processing ? 'Processing...' : reviewDialog.action === 'approve' ? 'Approve' : 'Deny'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
