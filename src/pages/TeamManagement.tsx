import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, ALL_PERMISSIONS, AppPermission, AppRole } from '@/hooks/usePermissions';
import { useDepartments, useStaffInvites } from '@/hooks/useStaffInvites';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, Users, Loader2, Key, Settings2, FileText, Briefcase, Mail, Building2, Clock, XCircle, RefreshCw, Send, UserCog } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { format } from 'date-fns';

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
  created_at: string;
}

interface RolePermission {
  role: AppRole;
  permission: AppPermission;
}

interface UserPermission {
  user_id: string;
  permission: AppPermission;
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'accountant', label: 'Accountant', description: 'Financial documents, client invoices, packing lists' },
  { value: 'shipping', label: 'Shipping Coordinator', description: 'Shipping documents, tracking, packing lists' },
  { value: 'file_costing', label: 'File Costing', description: 'Clearing and transport cost documents' },
  { value: 'operations', label: 'Operations (Read-Only)', description: 'Read-only tracking information' },
  { value: 'staff', label: 'Staff', description: 'Basic staff access' },
  { value: 'user', label: 'User', description: 'Standard user access' },
  { value: 'moderator', label: 'Moderator', description: 'Can moderate content' },
];

// Staff document access definitions mapped to team members
const STAFF_ACCESS_CONFIG = [
  {
    name: 'Mohamed Irshad (Mo)',
    email: 'rapizo92@gmail.com',
    role: 'admin',
    roleLabel: 'Admin / Owner',
    documentAccess: ['All Documents'],
    folderAccess: ['All Folders'],
    uploadFolders: ['All Folders'],
    description: 'Full admin access to everything',
    permissions: ['all'],
    restrictions: [],
  },
  {
    name: 'Abdul',
    email: 'ars7866@gmail.com',
    role: 'accountant',
    roleLabel: 'Accountant',
    documentAccess: ['Supplier Invoices', 'Packing Lists', 'Client Invoices', 'Debtors'],
    folderAccess: ['/statements/', '/invoices/', '/shipments/', '/packing_lists/', '/debtors/'],
    uploadFolders: ['/invoices/client/', '/statements/pending/'],
    description: 'Accounts, invoicing, debtors, properties',
    permissions: ['view_supplier_invoices', 'view_packing_lists', 'view_documents', 'view_shipments', 'view_payments', 'manage_payments', 'view_clients', 'manage_clients'],
    restrictions: ['Cannot see: Exchange rates, supplier costs', 'Cannot delete documents'],
  },
  {
    name: 'Shamima',
    email: 'shamimahc7866@gmail.com',
    role: 'file_costing',
    roleLabel: 'File Costing',
    documentAccess: ['Clearing Agent Invoices', 'Freight Forwarder Invoices', 'Transporter Invoices'],
    folderAccess: ['/staff_folders/shamima/', '/clearing_agent/', '/transport/', '/freight/'],
    uploadFolders: ['/staff_folders/shamima/', '/clearing_agent/'],
    description: 'Accounts: Clearing agents, freight forwarders, transporters',
    permissions: ['view_transport_invoices', 'view_clearing_invoices', 'view_documents', 'view_shipments'],
    restrictions: ['Cannot see: Supplier costs, exchange rates, client invoice amounts', 'Cannot delete documents'],
  },
  {
    name: 'Marissa',
    email: 'marissa.m7866@gmail.com',
    role: 'shipping',
    roleLabel: 'Shipping / Operations',
    documentAccess: ['Shipping Documents', 'Bills of Lading', 'Packing Lists', 'Delivery Notes'],
    folderAccess: ['/shipments/', '/shipping_documents/', '/new_shipping_documents/', '/packing_lists/', '/deliveries/'],
    uploadFolders: ['/shipments/', '/shipping_documents/', '/new_shipping_documents/'],
    description: 'Freight rate bookings, deliveries, operations, finance house payments',
    permissions: ['view_shipping_documents', 'view_packing_lists', 'view_documents', 'manage_documents', 'view_shipments', 'manage_shipments', 'view_payments'],
    restrictions: ['Cannot see: Supplier costs, exchange rates', 'Cannot delete documents'],
  },
  {
    name: 'Cindy',
    email: 'cindyoldewage857@gmail.com',
    role: 'accountant',
    roleLabel: 'Accounts Assistant',
    documentAccess: ['Client Invoices', 'Property Accounting', 'Rental Documents'],
    folderAccess: ['/invoices/', '/properties/', '/rentals/'],
    uploadFolders: ['/invoices/client/'],
    description: 'Assists Abdul with invoices, property accounting, rentals',
    permissions: ['view_supplier_invoices', 'view_packing_lists', 'view_documents', 'view_shipments', 'view_clients'],
    restrictions: ['Cannot see: Exchange rates, supplier costs', 'Cannot delete documents', 'Limited to invoice assistance'],
  },
];

export default function TeamManagement() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, hasPermission, loading: permLoading } = usePermissions();
  const { departments, isLoading: deptLoading, createDepartment } = useDepartments();
  const { invites, isLoading: invitesLoading, sendInvite, cancelInvite, resendInvite, pendingInvites } = useStaffInvites();
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('staff');
  const [addingMember, setAddingMember] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [selectedMemberForPerms, setSelectedMemberForPerms] = useState<string | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('staff');
  const [inviteDepartment, setInviteDepartment] = useState<string>('');
  const [sendingInvite, setSendingInvite] = useState(false);
  
  // Department form state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptDescription, setNewDeptDescription] = useState('');
  const [addingDept, setAddingDept] = useState(false);
  const [seedingUsers, setSeedingUsers] = useState(false);

  useEffect(() => {
    if (user && !permLoading) {
      fetchTeamMembers();
      fetchRolePermissions();
      fetchUserPermissions();
    }
  }, [user, permLoading]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const members: TeamMember[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || 'No email',
          full_name: profile.full_name,
          role: (userRole?.role as AppRole) || null,
          created_at: profile.created_at,
        };
      });

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission');

      if (error) throw error;
      setRolePermissions((data || []) as RolePermission[]);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
    }
  };

  // Seed predefined team members
  const seedTeamUsers = async () => {
    setSeedingUsers(true);
    const defaultPassword = '12345678';
    
    const teamToSeed = [
      { email: 'rapizo92@gmail.com', full_name: 'Mohamed Irshad', role: 'admin' as AppRole },
      { email: 'ars7866@gmail.com', full_name: 'Abdul', role: 'accountant' as AppRole },
      { email: 'shamimahc7866@gmail.com', full_name: 'Shamima', role: 'file_costing' as AppRole },
      { email: 'marissa.m7866@gmail.com', full_name: 'Marissa', role: 'shipping' as AppRole },
      { email: 'cindyoldewage857@gmail.com', full_name: 'Cindy', role: 'accountant' as AppRole },
    ];
    
    let created = 0;
    let existing = 0;
    let errors = 0;
    
    for (const member of teamToSeed) {
      try {
        // Try to create the user via signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: member.email,
          password: defaultPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: member.full_name },
          },
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            existing++;
            // User exists - try to find and update their role
            const existingMember = teamMembers.find(m => m.email?.toLowerCase() === member.email.toLowerCase());
            if (existingMember) {
              await supabase.from('user_roles').upsert(
                { user_id: existingMember.id, role: member.role },
                { onConflict: 'user_id,role' }
              );
            }
          } else {
            console.error(`Error creating ${member.email}:`, signUpError);
            errors++;
          }
          continue;
        }
        
        if (signUpData.user) {
          // Assign role
          await supabase.from('user_roles').upsert(
            { user_id: signUpData.user.id, role: member.role },
            { onConflict: 'user_id,role' }
          );
          created++;
        }
      } catch (error) {
        console.error(`Error with ${member.email}:`, error);
        errors++;
      }
    }
    
    setSeedingUsers(false);
    fetchTeamMembers();
    
    if (created > 0) {
      toast.success(`Created ${created} new team member${created > 1 ? 's' : ''}`);
    }
    if (existing > 0) {
      toast.info(`${existing} member${existing > 1 ? 's' : ''} already existed`);
    }
    if (errors > 0) {
      toast.error(`Failed to create ${errors} member${errors > 1 ? 's' : ''}`);
    }
  };

  const fetchUserPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('user_id, permission');

      if (error) throw error;
      setUserPermissions((data || []) as UserPermission[]);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
  };

  const addStaffMember = async () => {
    if (!newEmail || !newPassword) {
      toast.error('Email and password are required');
      return;
    }

    setAddingMember(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: newName },
        },
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: signUpData.user.id, role: newRole });

        if (roleError) throw roleError;

        toast.success(`${newRole.charAt(0).toUpperCase() + newRole.slice(1)} member ${newEmail} added successfully`);
        setNewEmail('');
        setNewName('');
        setNewPassword('');
        setNewRole('staff');
        fetchTeamMembers();
      }
    } catch (error: any) {
      console.error('Error adding staff member:', error);
      toast.error(error.message || 'Failed to add staff member');
    } finally {
      setAddingMember(false);
    }
  };

  const updateMemberRole = async (memberId: string, memberEmail: string, newRoleValue: AppRole) => {
    try {
      // Delete existing role
      await supabase.from('user_roles').delete().eq('user_id', memberId);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: memberId, role: newRoleValue });

      if (error) throw error;

      toast.success(`${memberEmail} role updated to ${newRoleValue}`);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(error.message || 'Failed to update role');
    }
  };

  const removeStaffMember = async (memberId: string, memberEmail: string) => {
    try {
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', memberId);

      if (roleError) throw roleError;

      toast.success(`${memberEmail} removed from team`);
      fetchTeamMembers();
    } catch (error: any) {
      console.error('Error removing staff member:', error);
      toast.error(error.message || 'Failed to remove staff member');
    }
  };

  const togglePermission = async (role: AppRole, permission: AppPermission) => {
    const hasPermissionCurrently = rolePermissions.some(
      rp => rp.role === role && rp.permission === permission
    );

    setSavingPermissions(true);
    try {
      if (hasPermissionCurrently) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role', role)
          .eq('permission', permission);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role, permission });

        if (error) throw error;
      }

      await fetchRolePermissions();
      toast.success('Permission updated');
    } catch (error: any) {
      console.error('Error toggling permission:', error);
      toast.error(error.message || 'Failed to update permission');
    } finally {
      setSavingPermissions(false);
    }
  };

  const roleHasPermission = (role: AppRole, permission: AppPermission): boolean => {
    return rolePermissions.some(rp => rp.role === role && rp.permission === permission);
  };

  const userHasDirectPermission = (userId: string, permission: AppPermission): boolean => {
    return userPermissions.some(up => up.user_id === userId && up.permission === permission);
  };

  const toggleUserPermission = async (userId: string, permission: AppPermission) => {
    const hasPermissionCurrently = userHasDirectPermission(userId, permission);

    setSavingPermissions(true);
    try {
      if (hasPermissionCurrently) {
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('permission', permission);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_permissions')
          .insert({ user_id: userId, permission, granted_by: user?.id });

        if (error) throw error;
      }

      await fetchUserPermissions();
      toast.success('User permission updated');
    } catch (error: any) {
      console.error('Error toggling user permission:', error);
      toast.error(error.message || 'Failed to update user permission');
    } finally {
      setSavingPermissions(false);
    }
  };

  const getUserRolePermissions = (userId: string): AppPermission[] => {
    const member = teamMembers.find(m => m.id === userId);
    if (!member?.role) return [];
    return rolePermissions
      .filter(rp => rp.role === member.role)
      .map(rp => rp.permission);
  };

  if (authLoading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin && !hasPermission('manage_team')) {
    return (
      <AppLayout>
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>You need admin privileges to access team management.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage team members, roles and permissions</p>
          </div>
        </div>

        <Tabs defaultValue="members" className="space-y-6">
          <TabsList className="grid w-full max-w-4xl grid-cols-7">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="user-perms" className="flex items-center gap-2">
              <UserCog className="h-4 w-4" />
              User Perms
            </TabsTrigger>
            <TabsTrigger value="invites" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invites
              {pendingInvites.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {pendingInvites.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="departments" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Depts
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Role Perms
            </TabsTrigger>
            <TabsTrigger value="staff-access" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Access Info
            </TabsTrigger>
          </TabsList>

          {/* Invites Tab */}
          <TabsContent value="invites" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Staff Invite
                </CardTitle>
                <CardDescription>Send an email invitation to a new team member</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={inviteDepartment || "none"} onValueChange={(v) => setInviteDepartment(v === "none" ? "" : v)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Department</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={async () => {
                      if (!inviteEmail) {
                        toast.error('Email is required');
                        return;
                      }
                      setSendingInvite(true);
                      try {
                        await sendInvite.mutateAsync({
                          email: inviteEmail,
                          role: inviteRole,
                          department_id: inviteDepartment || null,
                        });
                        setInviteEmail('');
                        setInviteRole('staff');
                        setInviteDepartment('');
                      } finally {
                        setSendingInvite(false);
                      }
                    }} 
                    disabled={sendingInvite || !inviteEmail}
                  >
                    {sendingInvite ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Invite
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending & Recent Invites</CardTitle>
                <CardDescription>
                  {invites.length} invite{invites.length !== 1 ? 's' : ''} sent
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invitesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : invites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No invites sent yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">{invite.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{invite.role}</Badge>
                          </TableCell>
                          <TableCell>{invite.department?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                invite.status === 'pending' ? 'default' :
                                invite.status === 'accepted' ? 'default' :
                                'destructive'
                              }
                              className={
                                invite.status === 'accepted' ? 'bg-green-500' : ''
                              }
                            >
                              {invite.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(invite.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(invite.expires_at) < new Date() 
                              ? <span className="text-destructive">Expired</span>
                              : format(new Date(invite.expires_at), 'MMM d, yyyy')
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {invite.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendInvite.mutate(invite)}
                                  disabled={resendInvite.isPending}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => cancelInvite.mutate(invite.id)}
                                  disabled={cancelInvite.isPending}
                                >
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Add Department
                </CardTitle>
                <CardDescription>Create a new department for organizing staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                  <Input
                    placeholder="Department Name"
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={newDeptDescription}
                    onChange={(e) => setNewDeptDescription(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={async () => {
                      if (!newDeptName) {
                        toast.error('Department name is required');
                        return;
                      }
                      setAddingDept(true);
                      try {
                        await createDepartment.mutateAsync({
                          name: newDeptName,
                          description: newDeptDescription || undefined,
                        });
                        setNewDeptName('');
                        setNewDeptDescription('');
                      } finally {
                        setAddingDept(false);
                      }
                    }} 
                    disabled={addingDept || !newDeptName}
                  >
                    {addingDept ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Building2 className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>
                  {departments.length} department{departments.length !== 1 ? 's' : ''} configured
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : departments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No departments created yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {dept.description || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(dept.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            {/* Predefined Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Directory
                </CardTitle>
                <CardDescription>
                  All team members and their roles. Click "Create All Accounts" to set up accounts with default password "12345678"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {STAFF_ACCESS_CONFIG.map((staff, index) => {
                      const existsInDb = teamMembers.some(
                        m => m.email?.toLowerCase() === staff.email.toLowerCase()
                      );
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{staff.name}</TableCell>
                          <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                          <TableCell>
                            <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                              {staff.roleLabel}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {staff.description}
                          </TableCell>
                          <TableCell>
                            {existsInDb ? (
                              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                                Not Created
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="mt-4 pt-4 border-t">
                  <Button 
                    onClick={seedTeamUsers} 
                    disabled={seedingUsers}
                    className="w-full sm:w-auto"
                  >
                    {seedingUsers ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating accounts...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create All Team Accounts
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Creates accounts with default password "12345678" - users should change this on first login
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Team Member
                </CardTitle>
                <CardDescription>Create a new team member account manually</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row gap-4">
                  <Input
                    placeholder="Full Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addStaffMember} disabled={addingMember}>
                    {addingMember ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} in your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.full_name || 'No name'}
                          </TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            {member.id !== user?.id ? (
                              <Select
                                value={member.role || 'user'}
                                onValueChange={(v) => updateMemberRole(member.id, member.email, v as AppRole)}
                              >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AVAILABLE_ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge variant="default" className="bg-primary">
                                <Shield className="h-3 w-3 mr-1" />
                                {member.role || 'No role'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(member.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            {member.id !== user?.id && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to remove {member.email} from the team?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeStaffMember(member.id, member.email)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remove
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Permissions Tab */}
          <TabsContent value="user-perms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Individual User Permissions
                </CardTitle>
                <CardDescription>
                  Configure specific permissions for each team member. These are in addition to their role-based permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Select 
                    value={selectedMemberForPerms || "select"} 
                    onValueChange={(v) => setSelectedMemberForPerms(v === "select" ? null : v)}
                  >
                    <SelectTrigger className="w-full md:w-[300px]">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="select">Select a team member...</SelectItem>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email} ({member.role || 'No role'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMemberForPerms ? (
                  <div className="space-y-4">
                    {(() => {
                      const member = teamMembers.find(m => m.id === selectedMemberForPerms);
                      const rolePerms = getUserRolePermissions(selectedMemberForPerms);
                      
                      return (
                        <>
                          <div className="p-4 bg-muted/50 rounded-lg mb-4">
                            <h4 className="font-medium mb-2">
                              {member?.full_name || member?.email}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Email: {member?.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Role: <Badge variant="outline">{member?.role || 'No role'}</Badge>
                            </p>
                            {rolePerms.length > 0 && (
                              <p className="text-sm text-muted-foreground mt-2">
                                Role provides {rolePerms.length} base permissions
                              </p>
                            )}
                          </div>

                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[250px]">Permission</TableHead>
                                  <TableHead className="w-[100px] text-center">From Role</TableHead>
                                  <TableHead className="w-[100px] text-center">Direct Grant</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {ALL_PERMISSIONS.map(perm => {
                                  const fromRole = rolePerms.includes(perm.value);
                                  const directGrant = userHasDirectPermission(selectedMemberForPerms, perm.value);
                                  
                                  return (
                                    <TableRow key={perm.value}>
                                      <TableCell>
                                        <div>
                                          <div className="font-medium">{perm.label}</div>
                                          <div className="text-xs text-muted-foreground">{perm.description}</div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {fromRole ? (
                                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            ✓
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        <Checkbox
                                          checked={directGrant}
                                          onCheckedChange={() => toggleUserPermission(selectedMemberForPerms, perm.value)}
                                          disabled={savingPermissions || fromRole}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserCog className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a team member to manage their permissions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Access Tab */}
          <TabsContent value="staff-access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Staff Document Access Configuration
                </CardTitle>
                <CardDescription>
                  Predefined access levels for each staff member. Add team members with matching emails to apply these permissions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {STAFF_ACCESS_CONFIG.map((staff, index) => (
                    <Card key={index} className={staff.role === 'admin' ? 'border-primary/50 bg-primary/5' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{staff.name}</CardTitle>
                          <Badge variant={staff.role === 'admin' ? 'default' : 'secondary'}>
                            {staff.roleLabel}
                          </Badge>
                        </div>
                        <CardDescription>{staff.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {staff.documentAccess.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Document Access:</p>
                              <div className="flex flex-wrap gap-2">
                                {staff.documentAccess.map((access, i) => (
                                  <Badge key={i} variant="outline" className="bg-accent/10">
                                    <FileText className="h-3 w-3 mr-1" />
                                    {access}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {staff.restrictions && staff.restrictions.length > 0 && (
                            <div className="pt-2 border-t">
                              <p className="text-sm font-medium mb-2 text-destructive">Restrictions:</p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {staff.restrictions.map((restriction, i) => (
                                  <li key={i} className="flex items-start gap-1">
                                    <span className="text-destructive">•</span> {restriction}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              {staff.permissions.includes('all') 
                                ? 'Full access to all features and documents'
                                : `${staff.permissions.length} specific permissions`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">How to assign staff access:</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Add team member in the "Members" tab with their email</li>
                    <li>Select the appropriate role (Accountant, Shipping, File Costing, Operations, etc.)</li>
                    <li>The role automatically grants the correct permissions for their function</li>
                    <li>Downloads will require admin approval unless they have "Download Documents" permission</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {AVAILABLE_ROLES.map(role => {
                const memberCount = teamMembers.filter(m => m.role === role.value).length;
                const permCount = rolePermissions.filter(rp => rp.role === role.value).length;

                return (
                  <Card key={role.value}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className={`h-5 w-5 ${role.value === 'admin' ? 'text-primary' : 'text-muted-foreground'}`} />
                        {role.label}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="font-semibold">{memberCount}</span>
                          <span className="text-muted-foreground ml-1">member{memberCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div>
                          <span className="font-semibold">{permCount}</span>
                          <span className="text-muted-foreground ml-1">permission{permCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Role Permissions Matrix
                </CardTitle>
                <CardDescription>
                  Configure which permissions each role has. Changes are saved automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Permission</TableHead>
                        {AVAILABLE_ROLES.map(role => (
                          <TableHead key={role.value} className="text-center w-[100px]">
                            {role.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_PERMISSIONS.map(perm => (
                        <TableRow key={perm.value}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{perm.label}</div>
                              <div className="text-xs text-muted-foreground">{perm.description}</div>
                            </div>
                          </TableCell>
                          {AVAILABLE_ROLES.map(role => (
                            <TableCell key={role.value} className="text-center">
                              <Checkbox
                                checked={roleHasPermission(role.value, perm.value)}
                                onCheckedChange={() => togglePermission(role.value, perm.value)}
                                disabled={savingPermissions || (role.value === 'admin' && perm.value === 'manage_team')}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
