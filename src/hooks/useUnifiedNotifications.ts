import { useState, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export const useUnifiedNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'default'>('default');

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    if (Capacitor.isNativePlatform()) {
      // Native app (Android/iOS)
      setIsSupported(true);
      try {
        const result = await LocalNotifications.requestPermissions();
        setPermission(result.display === 'granted' ? 'granted' : 'denied');
      } catch (error) {
        console.error('Error requesting native permissions:', error);
      }
    } else if ('Notification' in window && 'serviceWorker' in navigator) {
      // PWA
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await LocalNotifications.requestPermissions();
        const granted = result.display === 'granted';
        setPermission(granted ? 'granted' : 'denied');
        return granted;
      } catch (error) {
        console.error('Error requesting native permissions:', error);
        return false;
      }
    } else if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const sendNotification = async (options: NotificationOptions): Promise<boolean> => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        // Native notification
        await LocalNotifications.schedule({
          notifications: [
            {
              title: options.title,
              body: options.body,
              id: Date.now(),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              attachments: undefined,
              actionTypeId: '',
              extra: null
            }
          ]
        });
        return true;
      } else if ('Notification' in window && 'serviceWorker' in navigator) {
        // PWA notification via service worker
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
          badge: options.badge || '/pwa-192x192.png',
          tag: options.tag || 'pm25-alert',
          requireInteraction: true,
        });
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        return true;
      } else if ('Notification' in window) {
        // Fallback to basic web notification
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/pwa-192x192.png',
        });
        return true;
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
    return false;
  };

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification
  };
};
