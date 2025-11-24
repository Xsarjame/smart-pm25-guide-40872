import { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export const useUnifiedNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    // Check if running on native platform or PWA with notification support
    if (Capacitor.isNativePlatform()) {
      setIsSupported(true);
      const status = await LocalNotifications.checkPermissions();
      setPermission(status.display === 'granted' ? 'granted' : 'default');
    } else if ('Notification' in window && 'serviceWorker' in navigator) {
      // PWA support
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      // Native app
      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === 'granted';
      setPermission(granted ? 'granted' : 'denied');
      return granted;
    } else if ('Notification' in window) {
      // PWA
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const sendNotification = async (options: NotificationOptions): Promise<void> => {
    // Request permission if not granted
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        console.log('Notification permission not granted');
        return;
      }
    }

    if (Capacitor.isNativePlatform()) {
      // Native platform - use LocalNotifications
      try {
        await LocalNotifications.schedule({
          notifications: [{
            title: options.title,
            body: options.body,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            actionTypeId: '',
            extra: null,
          }]
        });
      } catch (error) {
        console.error('Error sending native notification:', error);
      }
    } else if ('serviceWorker' in navigator && 'Notification' in window) {
      // PWA - use Service Worker Notification API
      try {
        // Vibrate first if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
          badge: options.badge || '/pwa-192x192.png',
          tag: options.tag || 'pm25-notification',
          requireInteraction: true,
        });
      } catch (error) {
        console.error('Error sending PWA notification:', error);
        // Fallback to basic notification
        if (Notification.permission === 'granted') {
          new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/pwa-192x192.png',
          });
        }
      }
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
};
