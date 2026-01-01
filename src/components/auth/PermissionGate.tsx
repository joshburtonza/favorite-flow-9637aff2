import { ReactNode } from 'react';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';

interface PermissionGateProps {
  permission: AppPermission | AppPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children
}: PermissionGateProps) {
  const { isAdmin, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) {
    return null;
  }

  // Admin bypass
  if (isAdmin) {
    return <>{children}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
