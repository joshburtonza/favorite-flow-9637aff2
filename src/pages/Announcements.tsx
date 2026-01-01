import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAnnouncements, Announcement, AnnouncementPriority, TargetAudience } from '@/hooks/useAnnouncements';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Plus, Pin, Clock, Trash2, Edit, Eye, EyeOff, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';

const priorityConfig: Record<AnnouncementPriority, { color: string; icon: typeof AlertTriangle; label: string }> = {
  urgent: { color: 'bg-destructive text-destructive-foreground', icon: AlertTriangle, label: 'Urgent' },
  high: { color: 'bg-orange-500 text-white', icon: AlertCircle, label: 'High' },
  normal: { color: 'bg-primary text-primary-foreground', icon: Info, label: 'Normal' },
  low: { color: 'bg-muted text-muted-foreground', icon: Info, label: 'Low' }
};

export default function Announcements() {
  const { announcements, isLoading, createAnnouncement, updateAnnouncement, deleteAnnouncement, markAsRead, refetch } = useAnnouncements();
  const { isAdmin, role } = usePermissions();
  const canManage = isAdmin || role === 'moderator';
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal' as AnnouncementPriority,
    target_audience: 'all' as TargetAudience,
    is_pinned: false,
    expires_at: ''
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      target_audience: 'all',
      is_pinned: false,
      expires_at: ''
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingAnnouncement(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      target_audience: announcement.target_audience,
      is_pinned: announcement.is_pinned,
      expires_at: announcement.expires_at ? format(new Date(announcement.expires_at), "yyyy-MM-dd'T'HH:mm") : ''
    });
    setEditingAnnouncement(announcement);
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    const data = {
      ...formData,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
    };

    if (editingAnnouncement) {
      await updateAnnouncement.mutateAsync({ id: editingAnnouncement.id, ...data });
    } else {
      await createAnnouncement.mutateAsync(data);
    }
    
    setShowCreateDialog(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement.mutateAsync(id);
    }
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  return (
    <AppLayout>
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Megaphone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Announcements</h1>
                <p className="text-muted-foreground text-sm">Team updates and important notices</p>
              </div>
            </div>
            {canManage && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            )}
          </div>

          {/* Announcements List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No announcements yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {announcements.map((announcement) => {
                const priorityInfo = priorityConfig[announcement.priority];
                const PriorityIcon = priorityInfo.icon;
                
                return (
                  <Card 
                    key={announcement.id} 
                    className={cn(
                      'relative transition-all',
                      !announcement.is_read && 'border-primary/50 bg-primary/5',
                      announcement.is_pinned && 'border-2'
                    )}
                  >
                    {announcement.is_pinned && (
                      <div className="absolute -top-2 -right-2">
                        <Badge variant="secondary" className="gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn('gap-1', priorityInfo.color)}>
                              <PriorityIcon className="h-3 w-3" />
                              {priorityInfo.label}
                            </Badge>
                            {announcement.target_audience !== 'all' && (
                              <Badge variant="outline" className="capitalize">
                                {announcement.target_audience}
                              </Badge>
                            )}
                            {!announcement.is_read && (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </div>
                          <CardTitle className="text-lg">{announcement.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{announcement.creator_profile?.full_name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                            {announcement.expires_at && (
                              <>
                                <span>•</span>
                                <Clock className="h-3 w-3" />
                                <span>Expires {format(new Date(announcement.expires_at), 'MMM d')}</span>
                              </>
                            )}
                          </CardDescription>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {!announcement.is_read ? (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleMarkAsRead(announcement.id)}
                              title="Mark as read"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" disabled title="Read">
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          {canManage && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => openEditDialog(announcement)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDelete(announcement.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Announcement title"
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Announcement content..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as AnnouncementPriority }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, target_audience: value as TargetAudience }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Team</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="moderator">Moderators</SelectItem>
                    <SelectItem value="accountant">Accountants</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="file_costing">File Costing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expires At (optional)</Label>
              <Input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
              />
              <Label htmlFor="pinned">Pin to top</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.title.trim() || !formData.content.trim()}
            >
              {editingAnnouncement ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
