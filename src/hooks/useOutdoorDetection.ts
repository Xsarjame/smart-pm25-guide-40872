import { useState, useEffect } from 'react';
import { useHomeLocation } from './useHomeLocation';
import { useUnifiedNotifications } from './useUnifiedNotifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

interface OutdoorDetectionConfig {
  pm25: number;
  enabled: boolean;
}

export const useOutdoorDetection = ({ pm25, enabled }: OutdoorDetectionConfig) => {
  const { isAtHome, checkIfAtHome } = useHomeLocation();
  const { sendNotification } = useUnifiedNotifications();
  const [isWearingMask, setIsWearingMask] = useState<boolean | null>(null);
  const [shouldPromptMask, setShouldPromptMask] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  // Check location every 2 minutes when enabled
  useEffect(() => {
    if (!enabled) return;

    const checkLocation = async () => {
      await checkIfAtHome();
    };

    checkLocation();
    const intervalId = setInterval(checkLocation, 2 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [enabled, checkIfAtHome]);

  // Monitor outdoor status and PM2.5
  useEffect(() => {
    if (!enabled) return;

    const shouldWearMask = pm25 > 60;
    const isOutdoors = !isAtHome;

    // If outdoors and PM2.5 is high and not wearing mask
    if (isOutdoors && shouldWearMask && isWearingMask === false) {
      const now = Date.now();
      const timeSinceLastNotif = now - lastNotificationTime;
      
      // Send notification every 5 minutes to avoid spam
      if (timeSinceLastNotif > 5 * 60 * 1000) {
        sendContinuousReminder();
        setLastNotificationTime(now);
      }
      
      setShouldPromptMask(true);
    } else {
      setShouldPromptMask(false);
    }
  }, [isAtHome, pm25, isWearingMask, enabled]);

  const sendContinuousReminder = async () => {
    // Vibrate continuously
    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.vibrate({ duration: 1000 });
        setTimeout(async () => {
          if (!isWearingMask) {
            await Haptics.vibrate({ duration: 1000 });
          }
        }, 1500);
      } catch (error) {
        console.error('Haptics error:', error);
      }
    }

    // Send notification
    await sendNotification({
      title: '⚠️ แจ้งเตือน: คุณอยู่นอกบ้าน!',
      body: `ค่า PM2.5 สูงถึง ${pm25} µg/m³\nกรุณายืนยันว่าคุณใส่แมสหน้ากากแล้ว`,
      icon: '/pwa-192x192.png',
    });
  };

  const confirmWearingMask = () => {
    setIsWearingMask(true);
    setShouldPromptMask(false);
  };

  const confirmNotWearingMask = () => {
    setIsWearingMask(false);
  };

  const resetMaskStatus = () => {
    setIsWearingMask(null);
    setShouldPromptMask(false);
  };

  return {
    isOutdoors: !isAtHome,
    isWearingMask,
    shouldPromptMask,
    confirmWearingMask,
    confirmNotWearingMask,
    resetMaskStatus,
  };
};
