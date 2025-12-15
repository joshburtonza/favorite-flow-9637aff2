import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useScreenshotProtection = () => {
  const { user } = useAuth();

  useEffect(() => {
    const logScreenshotAttempt = async (action: string) => {
      try {
        await supabase.functions.invoke('log-screenshot-attempt', {
          body: {
            action,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            userId: user?.id,
            userEmail: user?.email,
          },
        });
      } catch (error) {
        console.error('Failed to log screenshot attempt:', error);
      }
    };

    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block print and save shortcuts, detect screenshot attempts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P (print), Ctrl+S (save)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast.error('🚫 Printing is disabled for security reasons');
        logScreenshotAttempt('print_attempt_ctrl_p');
        return false;
      }

      // Detect Windows PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged and admin has been notified.',
          duration: 5000,
        });
        logScreenshotAttempt('screenshot_printscreen_windows');
        return false;
      }

      // Detect Mac screenshot shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged and admin has been notified.',
          duration: 5000,
        });
        logScreenshotAttempt(`screenshot_mac_cmd_shift_${e.key}`);
        return false;
      }

      // Detect Windows Snipping Tool shortcut: Win+Shift+S
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged and admin has been notified.',
          duration: 5000,
        });
        logScreenshotAttempt('screenshot_snipping_tool_windows');
        return false;
      }
    };

    // Add event listeners (blur on focus loss disabled - too aggressive in iframe/preview)
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Add CSS to prevent text selection globally
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
      // Clear any lingering blur
      const root = document.getElementById('root');
      if (root) {
        root.style.filter = 'none';
      }
    };
  }, [user]);
};
