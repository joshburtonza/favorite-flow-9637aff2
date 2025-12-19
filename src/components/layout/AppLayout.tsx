import { ReactNode } from 'react';
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
  Calculator
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
  { path: '/security', label: 'Security', icon: Shield, permission: 'manage_team' },
  { path: '/documents', label: 'Documents', icon: FileText, permission: 'view_documents' },
];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const canAccessNavItem = (item: NavItem): boolean => {
    if (!item.permission) return true;
    if (isAdmin) return true;
    return hasPermission(item.permission);
  };

  const filteredNavItems = navItems.filter(canAccessNavItem);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const FloatingDock = () => (
    <aside 
      className={cn(
        "fixed left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center py-8 px-4 rounded-[30px] border",
        "backdrop-blur-xl bg-card/90 border-border shadow-lg",
        "dark:bg-[rgba(10,10,20,0.6)] dark:border-[hsl(0_0%_100%/0.08)]"
      )}
    >
      {/* Logo */}
      <div 
        className="w-11 h-11 rounded-[14px] flex items-center justify-center text-xl text-white mb-12"
        style={{
          background: 'linear-gradient(135deg, hsl(239 84% 67%), hsl(187 94% 43%))',
          boxShadow: '0 0 20px hsl(239 84% 67% / 0.5)',
        }}
      >
        <Package className="w-5 h-5" />
      </div>

      {/* Navigation Items */}
      <ScrollArea className="flex-1">
        <nav className="flex flex-col items-center gap-2">
          {filteredNavItems.slice(0, 6).map((item) => (
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
      </ScrollArea>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-2 mt-auto pt-8">
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="nav-item text-destructive hover:text-destructive"
          title="Sign Out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Desktop floating dock */}
      {!isMobile && <FloatingDock />}
      
      {/* Main content */}
      <div className={cn('min-h-screen', !isMobile && 'ml-28', !isOnline && 'pt-10')}>
        <main className={cn('p-6 md:p-10', isMobile && 'pb-28')}>
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && <BottomNavigation />}
      
      {/* Floating AI Chat Button */}
      <FloatingAIChat />
    </div>
  );
}
