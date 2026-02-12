import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { usePermissions, AppPermission } from '@/hooks/usePermissions';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { 
  Sparkles, 
  Moon,
  Sun,
  Menu,
  X,
  Users,
  FileText,
  Calendar,
  Building2,
  Shield,
  Calculator,
  ListTodo,
  Workflow,
  FolderOpen,
  BarChart3,
  Upload,
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  CalendarDays,
  CreditCard,
  Landmark,
  Settings,
  Globe,
  Table2,
  UserCog,
  Activity,
  MessageSquarePlus,
  ClipboardCheck,
  ClipboardList,
} from 'lucide-react';

interface MoreNavItem {
  path: string;
  label: string;
  icon: typeof ListTodo;
  permission?: AppPermission;
}

const navItems = [
  { path: '/', label: 'AI', icon: Sparkles },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/messages', label: 'Messages', icon: MessageSquare },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
];

const moreItems: MoreNavItem[] = [
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/announcements', label: 'Announcements', icon: Megaphone },
  { path: '/schedule', label: 'Schedule', icon: CalendarDays, permission: 'view_shipments' },
  { path: '/invoices', label: 'Invoices', icon: FileText, permission: 'view_payments' },
  { path: '/file-costing', label: 'File Costing', icon: Calculator, permission: 'view_file_costing' },
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
  { path: '/document-workflow', label: 'Workflow', icon: Workflow, permission: 'manage_documents' },
  { path: '/activity-log', label: 'Activity Log', icon: Activity, permission: 'manage_team' },
  { path: '/feedback', label: 'Feedback', icon: MessageSquarePlus, permission: 'manage_team' },
  { path: '/testing', label: 'Testing', icon: ClipboardCheck, permission: 'manage_team' },
  { path: '/interviews', label: 'Interviews', icon: ClipboardList, permission: 'manage_team' },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);
  const { hasPermission, isAdmin, loading: permissionsLoading } = usePermissions();

  const filteredMoreItems = moreItems.filter(item => {
    if (permissionsLoading) return true;
    if (!item.permission) return true;
    if (isAdmin) return true;
    return hasPermission(item.permission);
  });

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setShowMore(false);
  };

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowMore(false)}
        />
      )}
      
      {/* More Menu */}
      {showMore && (
        <div 
          className="fixed bottom-24 left-4 right-4 z-50 glass-card p-4 animate-slide-in max-h-[60vh] overflow-y-auto"
          style={{
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {filteredMoreItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl transition-colors touch-manipulation',
                  isActive(item.path) 
                    ? 'bg-primary/20 text-foreground' 
                    : 'text-muted-foreground hover:bg-primary/10 active:bg-primary/20'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full mt-3 pt-3 border-t border-border/30 px-3 py-2 rounded-xl text-muted-foreground hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      )}
      
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50 h-[70px] flex justify-evenly items-center safe-area-pb bg-card/95 backdrop-blur-xl border-t border-border/20"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            className={cn(
              'relative flex flex-col items-center justify-center p-2 min-w-[56px] min-h-[44px] transition-colors touch-manipulation',
              isActive(item.path) 
                ? 'text-primary' 
                : 'text-muted-foreground active:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] mt-1">{item.label}</span>
            {isActive(item.path) && (
              <span 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary"
              />
            )}
          </button>
        ))}
        
        {/* More Button */}
        <button 
          onClick={() => setShowMore(!showMore)}
          className={cn(
            'relative flex flex-col items-center justify-center p-2 min-w-[56px] min-h-[44px] transition-all touch-manipulation',
            showMore ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {showMore ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="text-[10px] mt-1">More</span>
        </button>

        {/* Notifications */}
        <div className="relative flex flex-col items-center justify-center p-2 min-w-[56px] min-h-[44px]">
          <NotificationBell />
          <span className="text-[10px] mt-1 text-muted-foreground">Alerts</span>
        </div>
      </nav>
    </>
  );
}
