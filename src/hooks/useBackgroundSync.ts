import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useBackgroundSync = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;

    const registerBackgroundSync = async () => {
      try {
        // For PWA - Register service worker
        if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('[Background] Service worker registered');

          // Register periodic background sync (Chrome only)
          if ('periodicSync' in registration) {
            try {
              await (registration as any).periodicSync.register('pm25-periodic-check', {
                minInterval: 15 * 60 * 1000, // 15 minutes
              });
              console.log('[Background] Periodic sync registered');
            } catch (error) {
              console.error('[Background] Periodic sync not supported:', error);
            }
          }

          // Regular background sync
          if ('sync' in registration) {
            try {
              await (registration as any).sync.register('pm25-check');
              console.log('[Background] Background sync registered');
            } catch (error) {
              console.error('[Background] Background sync error:', error);
            }
          }

          // Request notification permission
          if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
          }
        }

        // For Native - Background Runner is configured in capacitor.config.ts
        if (Capacitor.isNativePlatform()) {
          console.log('[Background] Native background mode enabled via Capacitor config');
        }
      } catch (error) {
        console.error('[Background] Registration error:', error);
      }
    };

    registerBackgroundSync();
  }, [enabled]);

  return {
    isBackgroundEnabled: true,
  };
};
