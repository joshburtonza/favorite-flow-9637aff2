import { useEffect } from 'react';

export const useScreenshotProtection = () => {
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block print and save shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+P (print), Ctrl+S (save), Ctrl+Shift+S, PrintScreen
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
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
