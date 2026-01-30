import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FloatingAIChat } from '@/components/ai/FloatingAIChat';
import { OfflineBanner } from '@/components/ui/offline-banner';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { 
  Package, 
  Users, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Landmark,
  Upload,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Settings,
  Globe,
  FileText,
  UserCog,
  Shield,
  FolderOpen,
  Table2,
  CalendarDays,
  Calculator,
  Workflow,
  ListTodo,
  Megaphone,
  MessageSquare,
  Calendar,
  Menu,
  X,
  Activity
} from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: typeof Package;
  permission?: AppPermission;
}

const navItems: NavItem[] = [
  { path: '/', label: 'AI Hub', icon: Sparkles },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/schedule', label: 'Schedule', icon: CalendarDays, permission: 'view_shipments' },
  { path: '/invoices', label: 'Invoices', icon: FileText, permission: 'view_payments' },
  { path: '/file-costing', label: 'File Costing', icon: Calculator, permission: 'view_financials' },
  { path: '/files', label: 'Files', icon: FolderOpen, permission: 'view_documents' },
  { path: '/workspace', label: 'Workspace', icon: Table2 },
  { path: '/orders', label: 'Orders', icon: Globe, permission: 'view_shipments' },
  { path: '/financials', label: 'Financials', icon: BarChart3, permission: 'view_financials' },
  { path: '/suppliers', label: 'Suppliers', icon: Users, permission: 'view_suppliers' },
  { path: '/clients', label: 'Clients', icon: Building2, permission: 'view_clients' },
  { path: '/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments' },
  { path: '/creditors', label: 'Creditors', icon: Landmark, permission: 'view_suppliers' },
  { path: '/bank-accounts', label: 'Bank Accounts', icon: Settings, permission: 'manage_bank_accounts' },
  { path: '/import', label: 'Bulk Import', icon: Upload, permission: 'bulk_import' },
  { path: '/team', label: 'Team', icon: UserCog, permission: 'manage_team' },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/security', label: 'Security', icon: Shield, permission: 'manage_team' },
  { path: '/activity-log', label: 'Activity Log', icon: Activity, permission: 'manage_team' },
  { path: '/documents', label: 'Documents', icon: FileText, permission: 'view_documents' },
  { path: '/document-workflow', label: 'Workflow', icon: Workflow, permission: 'manage_documents' },
];

const primaryNavPaths = ['/', '/dashboard', '/messages', '/calendar', '/tasks', '/files'];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { hasPermission, isAdmin, loading: permissionsLoading } = usePermissions();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  const canAccessNavItem = (item: NavItem): boolean => {
    // While loading, show all items (prevents flash of missing items)
    if (permissionsLoading) return true;
    if (!item.permission) return true;
    if (isAdmin) return true;
    return hasPermission(item.permission);
  };

  const filteredNavItems = navItems.filter(canAccessNavItem);
  const primaryNavItems = filteredNavItems.filter(item => primaryNavPaths.includes(item.path));

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Slide-out menu panel
  const SlideMenu = () => (
    <>
      {/* Backdrop */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        />
      )}
      
      {/* Menu panel */}
      <div 
        className={cn(
          "fixed top-0 left-0 h-full w-72 z-[70] transform transition-transform duration-300 ease-in-out",
          "bg-card/95 backdrop-blur-xl border-r border-border shadow-xl",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
              style={{
                background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
              }}
            >
              <Package className="w-4 h-4" />
            </div>
            <span className="text-lg font-semibold">Navigation</span>
          </div>
          <button 
            onClick={() => setMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-3">
            <nav className="flex flex-col gap-1">
              {filteredNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left',
                    'hover:bg-muted/50',
                    isActive(item.path) 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card/95">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full text-left text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );

  const FloatingDock = () => (
    <aside 
      className={cn(
        "fixed left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center py-6 px-3 rounded-[30px] border",
        "backdrop-blur-xl bg-card/90 border-border shadow-lg",
        "dark:bg-[rgba(10,10,20,0.6)] dark:border-[hsl(0_0%_100%/0.08)]"
      )}
    >
      {/* Logo */}
      <div 
        className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl text-white mb-6"
        style={{
          background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
          boxShadow: '0 0 20px hsl(239 84% 67% / 0.5)',
        }}
      >
        <Package className="w-5 h-5" />
      </div>

      {/* Hamburger Menu Button */}
      <button
        onClick={() => setMenuOpen(true)}
        className={cn(
          'nav-item mb-4',
          menuOpen && 'active'
        )}
        title="Menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Primary Navigation Items */}
      <nav className="flex flex-col items-center gap-1.5">
        {primaryNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavClick(item.path)}
            className={cn(
              'nav-item',
              isActive(item.path) && 'active'
            )}
            title={item.label}
          >
            <item.icon className="h-5 w-5" />
          </button>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1.5 mt-auto pt-6">
        <NotificationBell />
        <ThemeToggle />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      <OfflineBanner />
      
      {!isMobile && <FloatingDock />}
      {!isMobile && <SlideMenu />}
      
      <div className={cn('min-h-screen', !isMobile && 'ml-24', !isOnline && 'pt-10')}>
        <main className={cn('p-6 md:p-10', isMobile && 'pb-28')}>
          {children}
        </main>
      </div>
      
      {isMobile && <BottomNavigation />}
      <FloatingAIChat />
    </div>
  );
}
