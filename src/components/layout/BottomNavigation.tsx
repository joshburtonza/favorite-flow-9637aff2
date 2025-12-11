import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  Users, 
  CreditCard, 
  MoreHorizontal 
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Building2, BarChart3, Landmark, Upload } from 'lucide-react';
import { useState } from 'react';

const mainNavItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/shipments', label: 'Shipments', icon: Package },
  { path: '/suppliers', label: 'Suppliers', icon: Users },
  { path: '/payments', label: 'Payments', icon: CreditCard },
];

const moreNavItems = [
  { path: '/clients', label: 'Clients', icon: Building2 },
  { path: '/creditors', label: 'Creditors', icon: BarChart3 },
  { path: '/bank-accounts', label: 'Bank Accounts', icon: Landmark },
  { path: '/import', label: 'Import Data', icon: Upload },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item.path));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] transition-colors',
              isActive(item.path) 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
        
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full min-h-[44px] transition-colors',
                isMoreActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent 
            align="end" 
            side="top" 
            className="w-48 p-2 mb-2 bg-background border border-border z-[60]"
          >
            <div className="space-y-1">
              {moreNavItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm transition-colors min-h-[44px]',
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
