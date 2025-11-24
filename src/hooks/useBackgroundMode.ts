import { useEffect, useRef } from 'react';

interface BackgroundModeConfig {
  enabled: boolean;
  wakeLock?: boolean;
}

export const useBackgroundMode = ({ enabled, wakeLock = true }: BackgroundModeConfig) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || !wakeLock) return;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('Wake Lock activated for background operation');
        }
      } catch (err) {
        console.error('Wake Lock error:', err);
      }
    };

    // Request wake lock
    requestWakeLock();

    // Re-acquire wake lock when visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wakeLockRef.current === null) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [enabled, wakeLock]);

  return {
    isActive: wakeLockRef.current !== null,
  };
};
