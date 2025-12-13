import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Package, 
  Users, 
  Building2, 
  CreditCard, 
  BarChart3, 
  Landmark,
  Upload,
  LogOut,
  Home,
  FileSearch
} from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'Dashboard', icon: Home },
  { path: '/shipments', label: 'Shipments', icon: Package },
  { path: '/suppliers', label: 'Suppliers', icon: Users },
  { path: '/clients', label: 'Clients', icon: Building2 },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/creditors', label: 'Creditors', icon: BarChart3 },
  { path: '/bank-accounts', label: 'Bank Accounts', icon: Landmark },
  { path: '/import', label: 'Import Data', icon: Upload },
  { path: '/analyze', label: 'AI Analysis', icon: FileSearch },
];

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const Sidebar = () => (
    <aside className="fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
        <div className="h-9 w-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
          <Package className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-sidebar-foreground truncate">Favorite Logistics</h1>
          <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
        </div>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'nav-link w-full text-left',
                  isActive && 'nav-link-active'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>
      
      <div className="p-2 border-t border-sidebar-border">
        <button
          onClick={handleSignOut}
          className="nav-link w-full text-left text-destructive hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}
      
      {/* Main content */}
      <div className={cn('min-h-screen', !isMobile && 'ml-64')}>
        {/* Mobile header */}
        {isMobile && (
          <header className="sticky top-0 z-30 flex items-center gap-4 px-4 h-14 bg-background border-b border-border">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-semibold">Favorite Logistics</span>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="ml-auto text-destructive hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </header>
        )}
        
        <main className={cn('p-4 md:p-6 lg:p-8', isMobile && 'pb-20')}>
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}