import { useEffect } from 'react';
import { toast } from 'sonner';

export const useScreenshotProtection = () => {
  useEffect(() => {
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
        return false;
      }

      // Detect Windows PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged for security purposes.',
          duration: 5000,
        });
        return false;
      }

      // Detect Mac screenshot shortcuts: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged for security purposes.',
          duration: 5000,
        });
        return false;
      }

      // Detect Windows Snipping Tool shortcut: Win+Shift+S
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast.error('⚠️ Screenshots are not permitted', {
          description: 'This action has been logged for security purposes.',
          duration: 5000,
        });
        return false;
      }
    };

    // Blur content when window loses focus (deters screen recording/alt-tab screenshots)
    const handleVisibilityChange = () => {
      const root = document.getElementById('root');
      if (root) {
        if (document.hidden) {
          root.style.filter = 'blur(20px)';
          root.style.transition = 'filter 0.1s ease';
        } else {
          root.style.filter = 'none';
        }
      }
    };

    // Blur on window blur (when switching apps)
    const handleWindowBlur = () => {
      const root = document.getElementById('root');
      if (root) {
        root.style.filter = 'blur(20px)';
        root.style.transition = 'filter 0.1s ease';
      }
    };

    const handleWindowFocus = () => {
      const root = document.getElementById('root');
      if (root) {
        root.style.filter = 'none';
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Add CSS to prevent text selection globally
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);
};
