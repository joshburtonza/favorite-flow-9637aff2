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
  Upload
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'AI', icon: Sparkles },
  { path: '/messages', label: 'Messages', icon: Users },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
];

const moreItems = [
  { path: '/announcements', label: 'Announcements', icon: FileText },
  { path: '/calendar', label: 'Calendar', icon: Calendar },
  { path: '/invoices', label: 'Invoices', icon: FileText },
  { path: '/file-costing', label: 'File Costing', icon: Calculator },
  { path: '/tasks', label: 'Tasks', icon: ListTodo },
  { path: '/suppliers', label: 'Suppliers', icon: Building2 },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/documents', label: 'Documents', icon: FileText },
  { path: '/document-workflow', label: 'Workflow', icon: Workflow },
  { path: '/files', label: 'Files', icon: FolderOpen },
  { path: '/financials', label: 'Financials', icon: BarChart3 },
  { path: '/import', label: 'Import', icon: Upload },
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
          className="fixed bottom-24 left-4 right-4 z-50 glass-card p-4 animate-slide-in max-h-[60vh] overflow-y-auto"
          style={{
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {moreItems.map((item) => (
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
              'relative flex flex-col items-center justify-center p-2 min-w-[60px] min-h-[44px] transition-colors touch-manipulation',
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
            'relative flex flex-col items-center justify-center p-2 min-w-[60px] min-h-[44px] transition-all touch-manipulation',
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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="relative flex flex-col items-center justify-center p-2 min-w-[60px] min-h-[44px] transition-colors text-muted-foreground touch-manipulation active:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="text-[10px] mt-1">Theme</span>
        </button>
      </nav>
    </>
  );
}