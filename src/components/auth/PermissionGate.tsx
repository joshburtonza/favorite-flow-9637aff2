import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft, MessageSquare } from 'lucide-react';
import { getRoleDisplayName } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/skeleton';

interface PermissionGateProps {
  permission: AppPermission | AppPermission[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
  /** If true, renders a full-page access denied instead of inline fallback */
  pageLevel?: boolean;
}

function AccessDeniedPage({ roleName }: { roleName: string }) {
  const navigate = useNavigate();

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-fade-in">
        <div
          className="p-4 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, hsl(0 84% 60% / 0.15), hsl(0 84% 60% / 0.05))',
          }}
        >
          <ShieldX className="h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role: <span className="font-medium text-foreground">{roleName}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
          <Button
            className="rounded-xl"
            style={{ background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(239 84% 50%))' }}
            onClick={() => navigate('/messages')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Request Access
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

function PageLoadingSkeleton() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" style={{ background: 'hsl(0 0% 100% / 0.03)' }} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export function PermissionGate({
  permission,
  requireAll = false,
  fallback = null,
  children,
  pageLevel = false,
}: PermissionGateProps) {
  const { isAdmin, hasAnyPermission, hasAllPermissions, loading, role } = usePermissions();

  if (loading) {
    return pageLevel ? <PageLoadingSkeleton /> : null;
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
    if (pageLevel) {
      return <AccessDeniedPage roleName={getRoleDisplayName((role || 'user') as any)} />;
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
