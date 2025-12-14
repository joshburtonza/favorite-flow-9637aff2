import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AppPermission = 
  | 'view_dashboard'
  | 'manage_shipments'
  | 'view_shipments'
  | 'manage_suppliers'
  | 'view_suppliers'
  | 'manage_clients'
  | 'view_clients'
  | 'manage_payments'
  | 'view_payments'
  | 'view_financials'
  | 'manage_documents'
  | 'view_documents'
  | 'manage_team'
  | 'manage_bank_accounts'
  | 'bulk_import';

export type AppRole = 'admin' | 'staff' | 'user' | 'moderator';

export const ALL_PERMISSIONS: { value: AppPermission; label: string; description: string }[] = [
  { value: 'view_dashboard', label: 'View Dashboard', description: 'Access main dashboard' },
  { value: 'view_shipments', label: 'View Shipments', description: 'View shipment list and details' },
  { value: 'manage_shipments', label: 'Manage Shipments', description: 'Create, edit, delete shipments' },
  { value: 'view_suppliers', label: 'View Suppliers', description: 'View supplier list and details' },
  { value: 'manage_suppliers', label: 'Manage Suppliers', description: 'Create, edit, delete suppliers' },
  { value: 'view_clients', label: 'View Clients', description: 'View client list and details' },
  { value: 'manage_clients', label: 'Manage Clients', description: 'Create, edit, delete clients' },
  { value: 'view_payments', label: 'View Payments', description: 'View payment schedules' },
  { value: 'manage_payments', label: 'Manage Payments', description: 'Create, edit, delete payments' },
  { value: 'view_financials', label: 'View Financials', description: 'Access financial reports' },
  { value: 'view_documents', label: 'View Documents', description: 'View uploaded documents' },
  { value: 'manage_documents', label: 'Manage Documents', description: 'Upload and delete documents' },
  { value: 'manage_team', label: 'Manage Team', description: 'Add, remove, and manage team members' },
  { value: 'manage_bank_accounts', label: 'Manage Bank Accounts', description: 'Manage bank account settings' },
  { value: 'bulk_import', label: 'Bulk Import', description: 'Access bulk data import feature' },
];

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<AppPermission[]>([]);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserPermissions();
    } else {
      setPermissions([]);
      setRole(null);
      setIsAdmin(false);
      setLoading(false);
    }
  }, [user]);

  const fetchUserPermissions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user's role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userRole = roleData?.role as AppRole | null;
      setRole(userRole);
      setIsAdmin(userRole === 'admin');

      if (userRole) {
        // Get permissions for this role
        const { data: permData } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role', userRole);

        const userPerms = (permData || []).map(p => p.permission as AppPermission);
        setPermissions(userPerms);
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: AppPermission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (perms: AppPermission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (perms: AppPermission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  };

  return {
    permissions,
    role,
    isAdmin,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchUserPermissions,
  };
}
