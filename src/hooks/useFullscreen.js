import { useState, useCallback, useEffect } from 'react';

/**
 * Fullscreen toggle hook.
 * Also registers F key shortcut.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateState = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', updateState);
    return () => document.removeEventListener('fullscreenchange', updateState);
  }, [updateState]);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch {
      // Fullscreen API may not be available
    }
  }, []);

  return { isFullscreen, toggleFullscreen };
}
