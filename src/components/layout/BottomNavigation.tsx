import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Package, 
  Plus,
  Wallet, 
  User 
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'AI', icon: Sparkles },
  { path: '/shipments', label: 'Shipments', icon: Package },
  { path: '/payments', label: 'Payments', icon: Wallet },
  { path: '/suppliers', label: 'Profile', icon: User },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="fixed bottom-5 left-5 right-5 z-50 h-[75px] rounded-[25px] flex justify-evenly items-center safe-area-pb"
      style={{
        background: 'rgba(20, 20, 35, 0.85)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {navItems.slice(0, 2).map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={cn(
            'relative p-2.5 text-xl transition-colors',
            isActive(item.path) 
              ? 'text-foreground' 
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="h-5 w-5" />
          {isActive(item.path) && (
            <span 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
              style={{
                background: 'hsl(187 94% 43%)',
                boxShadow: '0 0 10px hsl(187 94% 43%)',
              }}
            />
          )}
        </button>
      ))}
      
      {/* Floating Add Button */}
      <button 
        onClick={() => navigate('/')}
        className="w-14 h-14 rounded-[20px] flex items-center justify-center -translate-y-6 rotate-45"
        style={{
          background: 'white',
          boxShadow: '0 10px 25px rgba(255, 255, 255, 0.2)',
        }}
      >
        <Plus className="h-5 w-5 text-black -rotate-45" />
      </button>

      {navItems.slice(2).map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          className={cn(
            'relative p-2.5 text-xl transition-colors',
            isActive(item.path) 
              ? 'text-foreground' 
              : 'text-muted-foreground'
          )}
        >
          <item.icon className="h-5 w-5" />
          {isActive(item.path) && (
            <span 
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
              style={{
                background: 'hsl(187 94% 43%)',
                boxShadow: '0 0 10px hsl(187 94% 43%)',
              }}
            />
          )}
        </button>
      ))}
    </nav>
  );
}
