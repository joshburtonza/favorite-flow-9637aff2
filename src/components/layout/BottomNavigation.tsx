import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { 
  Sparkles, 
  Package, 
  Wallet, 
  Moon,
  Sun,
  Plus,
  Menu,
  X,
  Users,
  FileText,
  Calendar,
  Building2,
  Shield
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'AI', icon: Sparkles },
  { path: '/shipments', label: 'Shipments', icon: Package },
  { path: '/payments', label: 'Payments', icon: Wallet },
];

const moreItems = [
  { path: '/suppliers', label: 'Suppliers', icon: Building2 },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/team', label: 'Team', icon: Shield },
];

export function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [showMore, setShowMore] = useState(false);

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
          className="fixed bottom-24 left-5 right-5 z-50 glass-card p-4 animate-slide-in"
          style={{
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            {moreItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
                  isActive(item.path) 
                    ? 'bg-primary/20 text-foreground' 
                    : 'text-muted-foreground hover:bg-primary/10'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <nav 
        className="fixed bottom-5 left-5 right-5 z-50 h-[75px] rounded-[25px] flex justify-evenly items-center safe-area-pb bg-card/85 backdrop-blur-xl border border-border/20"
        style={{
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => handleNavigate(item.path)}
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
        
        {/* Floating More Button */}
        <button 
          onClick={() => setShowMore(!showMore)}
          className="w-14 h-14 rounded-[20px] flex items-center justify-center -translate-y-6 bg-primary transition-transform"
          style={{
            boxShadow: '0 10px 25px hsl(var(--primary) / 0.3)',
            transform: showMore ? 'translateY(-1.5rem) rotate(45deg)' : 'translateY(-1.5rem)',
          }}
        >
          {showMore ? (
            <X className="h-5 w-5 text-primary-foreground -rotate-45" />
          ) : (
            <Menu className="h-5 w-5 text-primary-foreground" />
          )}
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
    </>
  );
}