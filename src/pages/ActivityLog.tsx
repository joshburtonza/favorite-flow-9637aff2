import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, subDays } from 'date-fns';
import { 
  Activity, 
  FileText, 
  Users, 
  Database, 
  Search, 
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  Shield,
  Bot
} from 'lucide-react';

interface ActivityLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  description: string;
  old_values: any;
  new_values: any;
  metadata: any;
  created_at: string;
}

interface ChangeHistory {
  id: string;
  user_email: string | null;
  table_name: string;
  record_reference: string | null;
  operation: string;
  changed_fields: any;
  created_at: string;
}

function ActivityLogContent() {
  const [filters, setFilters] = useState({
    user_email: '',
    action_type: '',
    entity_type: '',
    days_back: '7'
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch activity logs
  const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .gte('created_at', subDays(new Date(), parseInt(filters.days_back)).toISOString())
        .limit(500);

      if (filters.user_email) {
        query = query.ilike('user_email', `%${filters.user_email}%`);
      }
      if (filters.action_type) {
        query = query.eq('action_type', filters.action_type);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLog[];
    }
  });

  // Fetch change history from data_change_history table
  const { data: changeHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['change-history', filters.days_back],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(filters.days_back)).toISOString();
      // Use raw SQL query via RPC or fetch directly
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, user_email, entity_type, entity_name, action_type, description, created_at')
        .gte('created_at', startDate)
        .in('action_type', ['create', 'update', 'delete'])
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      // Map to ChangeHistory format
      return (data || []).map(item => ({
        id: item.id,
        user_email: item.user_email,
        table_name: item.entity_type,
        record_reference: item.entity_name,
        operation: item.action_type.toUpperCase(),
        changed_fields: null,
        created_at: item.created_at
      })) as ChangeHistory[];
    }
  });

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['activity-stats', filters.days_back],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(filters.days_back)).toISOString();
      
      const { data: logs } = await supabase
        .from('activity_logs')
        .select('action_type, entity_type, user_email')
        .gte('created_at', startDate);

      const byAction: Record<string, number> = {};
      const byEntity: Record<string, number> = {};
      const byUser: Record<string, number> = {};

      logs?.forEach(log => {
        byAction[log.action_type] = (byAction[log.action_type] || 0) + 1;
        byEntity[log.entity_type] = (byEntity[log.entity_type] || 0) + 1;
        if (log.user_email) {
          byUser[log.user_email] = (byUser[log.user_email] || 0) + 1;
        }
      });

      return {
        total: logs?.length || 0,
        byAction,
        byEntity,
        byUser
      };
    }
  });

  // Unique users for filter dropdown
  const { data: users } = useQuery({
    queryKey: ['activity-users'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      return data;
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-4 w-4 text-green-500" />;
      case 'update': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'view': return <Eye className="h-4 w-4 text-muted-foreground" />;
      case 'export': return <Download className="h-4 w-4 text-purple-500" />;
      case 'login': return <Shield className="h-4 w-4 text-green-500" />;
      case 'logout': return <Shield className="h-4 w-4 text-orange-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'create': return 'default';
      case 'update': return 'secondary';
      case 'delete': return 'destructive';
      case 'view': return 'outline';
      case 'export': return 'secondary';
      default: return 'outline';
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'shipment': return '📦';
      case 'supplier': return '🏭';
      case 'client': return '👥';
      case 'payment': return '💰';
      case 'document': return '📄';
      case 'user': return '👤';
      case 'system': return '⚙️';
      default: return '📋';
    }
  };

  const filteredActivities = activities?.filter(activity => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      activity.description?.toLowerCase().includes(search) ||
      activity.entity_name?.toLowerCase().includes(search) ||
      activity.user_email?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Monitor all user actions and data changes
            </p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => { refetchActivities(); refetchHistory(); }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{stats?.total || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Changes</p>
                <p className="text-2xl font-bold">{changeHistory?.length || 0}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{Object.keys(stats?.byUser || {}).length}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Creates</p>
                <p className="text-2xl font-bold">{stats?.byAction?.create || 0}</p>
              </div>
              <Plus className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select 
              value={filters.user_email} 
              onValueChange={(v) => setFilters(f => ({ ...f, user_email: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map(u => (
                  <SelectItem key={u.id} value={u.email || u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={filters.action_type} 
              onValueChange={(v) => setFilters(f => ({ ...f, action_type: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.entity_type} 
              onValueChange={(v) => setFilters(f => ({ ...f, entity_type: v === 'all' ? '' : v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="shipment">Shipments</SelectItem>
                <SelectItem value="supplier">Suppliers</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.days_back} 
              onValueChange={(v) => setFilters(f => ({ ...f, days_back: v }))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Activity Log and Change History */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
          <TabsTrigger value="changes" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Changes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activities
                <Badge variant="secondary" className="ml-2">
                  {filteredActivities?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {activitiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredActivities?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No activities found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredActivities?.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActionIcon(activity.action_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg">
                              {getEntityIcon(activity.entity_type)}
                            </span>
                            <Badge variant={getActionBadgeVariant(activity.action_type)}>
                              {activity.action_type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {activity.user_email || 'System'}
                            </span>
                          </div>
                          <p className="text-sm mt-1 truncate">
                            {activity.description}
                          </p>
                          {activity.entity_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.entity_type}: {activity.entity_name}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(activity.created_at), 'MMM d, HH:mm')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Change History
                <Badge variant="secondary" className="ml-2">
                  {changeHistory?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : changeHistory?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No changes recorded
                  </div>
                ) : (
                  <div className="space-y-2">
                    {changeHistory?.map((change) => (
                      <div
                        key={change.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                change.operation === 'INSERT' ? 'default' :
                                change.operation === 'UPDATE' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {change.operation}
                            </Badge>
                            <span className="font-medium">{change.table_name}</span>
                            {change.record_reference && (
                              <span className="text-muted-foreground">
                                → {change.record_reference}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(change.created_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                        {change.user_email && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {change.user_email}
                          </p>
                        )}
                        {change.changed_fields && Object.keys(change.changed_fields).length > 0 && (
                          <div className="mt-2 text-xs bg-muted p-2 rounded">
                            {Object.entries(change.changed_fields).map(([field, values]: [string, any]) => (
                              <div key={field} className="flex gap-2">
                                <span className="font-medium">{field}:</span>
                                <span className="text-red-500 line-through">
                                  {JSON.stringify(values.old)}
                                </span>
                                <span>→</span>
                                <span className="text-green-500">
                                  {JSON.stringify(values.new)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ActivityLog() {
  return (
    <PermissionGate permission="manage_team" pageLevel>
      <ActivityLogContent />
    </PermissionGate>
  );
}
