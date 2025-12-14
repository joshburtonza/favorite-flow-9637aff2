import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, ALL_PERMISSIONS, AppPermission, AppRole } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, Trash2, Shield, Users, Loader2, Key, Settings2, FileText, Briefcase } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

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

// Staff document access definitions mapped to new roles
const STAFF_ACCESS_CONFIG = [
  {
    name: 'Abdul',
    role: 'accountant',
    roleLabel: 'Accountant',
    documentAccess: ['Supplier Invoices', 'Packing Lists'],
    folderAccess: ['/statements/', '/invoices/', '/shipments/', '/packing_lists/'],
    uploadFolders: ['/invoices/client/', '/statements/pending/'],
    description: 'Access to supplier invoices for creating client invoices, access to packing lists',
    permissions: ['view_supplier_invoices', 'view_packing_lists', 'view_documents', 'view_shipments', 'view_payments', 'manage_payments'],
    restrictions: ['Cannot see: Exchange rates, supplier costs', 'Cannot delete documents'],
  },
  {
    name: 'Marissa',
    role: 'shipping',
    roleLabel: 'Shipping Coordinator',
    documentAccess: ['Shipping Documents', 'Bills of Lading', 'Packing Lists'],
    folderAccess: ['/shipments/', '/shipping_documents/', '/new_shipping_documents/', '/packing_lists/'],
    uploadFolders: ['/shipments/', '/shipping_documents/', '/new_shipping_documents/'],
    description: 'Access to shipping documents and tracking',
    permissions: ['view_shipping_documents', 'view_packing_lists', 'view_documents', 'manage_documents', 'view_shipments', 'manage_shipments'],
    restrictions: ['Cannot see: Financial data (costs, invoices, exchange rates)', 'Cannot delete documents'],
  },
  {
    name: 'Shamima',
    role: 'file_costing',
    roleLabel: 'File Costing',
    documentAccess: ['Transport Invoices', 'Clearing Agent Invoices'],
    folderAccess: ['/staff_folders/shamima/', '/clearing_agent/', '/transport/'],
    uploadFolders: ['/staff_folders/shamima/', '/clearing_agent/'],
    description: 'Access for file costings (transport invoices, clearing agent invoices)',
    permissions: ['view_transport_invoices', 'view_clearing_invoices', 'view_documents', 'view_shipments'],
    restrictions: ['Cannot see: Supplier costs, exchange rates, client invoice amounts', 'Cannot delete documents'],
  },
  {
    name: 'Paint Shop',
    role: 'operations',
    roleLabel: 'Operations (Read-Only)',
    documentAccess: [],
    folderAccess: [],
    uploadFolders: [],
    description: 'Read-only access to shipment tracking information',
    permissions: ['view_dashboard', 'view_shipments'],
    restrictions: ['Cannot see: Product details, costs, invoices, supplier info, client info', 'Cannot upload or delete anything', 'Read-only access'],
  },
  {
    name: 'MI (Mo)',
    role: 'admin',
    roleLabel: 'Admin',
    documentAccess: ['All Documents'],
    folderAccess: ['All Folders'],
    uploadFolders: ['All Folders'],
    description: 'Full admin access to everything',
    permissions: ['all'],
    restrictions: [],
  },
];

export default function TeamManagement() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, hasPermission, loading: permLoading } = usePermissions();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('staff');
  const [addingMember, setAddingMember] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    if (user && !permLoading) {
      fetchTeamMembers();
      fetchRolePermissions();
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
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="staff-access" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Staff Access
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Add Team Member
                </CardTitle>
                <CardDescription>Create a new team member account</CardDescription>
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
