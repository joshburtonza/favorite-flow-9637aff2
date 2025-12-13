import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
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
  Sparkles,
  LayoutDashboard,
  Settings,
  Globe
} from 'lucide-react';
import { BottomNavigation } from './BottomNavigation';

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/', label: 'AI Hub', icon: Sparkles },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/shipments', label: 'Shipments', icon: Globe },
  { path: '/financials', label: 'Financials', icon: BarChart3 },
  { path: '/suppliers', label: 'Suppliers', icon: Users },
  { path: '/clients', label: 'Clients', icon: Building2 },
  { path: '/payments', label: 'Payments', icon: CreditCard },
  { path: '/creditors', label: 'Creditors', icon: Landmark },
  { path: '/bank-accounts', label: 'Bank Accounts', icon: Settings },
  { path: '/import', label: 'Bulk Import', icon: Upload },
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

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const FloatingDock = () => (
    <aside className="fixed left-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center py-8 px-4 rounded-[30px] border border-glass-border"
      style={{
        background: 'rgba(10, 10, 20, 0.6)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
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
          {navItems.slice(0, 6).map((item) => (
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
      {/* Desktop floating dock */}
      {!isMobile && <FloatingDock />}
      
      {/* Main content */}
      <div className={cn('min-h-screen', !isMobile && 'ml-28')}>
        <main className={cn('p-6 md:p-10', isMobile && 'pb-28')}>
          {children}
        </main>
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}
