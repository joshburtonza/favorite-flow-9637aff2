import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Package, 
  Wallet, 
  Moon,
  Sun,
  Plus
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'AI', icon: Sparkles },
  { path: '/shipments', label: 'Shipments', icon: Package },
  { path: '/payments', label: 'Payments', icon: Wallet },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <nav 
      className="fixed bottom-5 left-5 right-5 z-50 h-[75px] rounded-[25px] flex justify-evenly items-center safe-area-pb bg-card/85 backdrop-blur-xl border border-border/20"
      style={{
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      }}
    >
      {navItems.map((item) => (
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
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
              style={{
                boxShadow: '0 0 10px hsl(var(--accent))',
              }}
            />
          )}
        </button>
      ))}
      
      {/* Floating Add Button */}
      <button 
        onClick={() => navigate('/')}
        className="w-14 h-14 rounded-[20px] flex items-center justify-center -translate-y-6 rotate-45 bg-primary"
        style={{
          boxShadow: '0 10px 25px hsl(var(--primary) / 0.3)',
        }}
      >
        <Plus className="h-5 w-5 text-primary-foreground -rotate-45" />
      </button>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="relative p-2.5 text-xl transition-colors text-muted-foreground hover:text-foreground"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    </nav>
  );
}