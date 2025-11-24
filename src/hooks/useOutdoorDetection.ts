import { useState, useEffect } from 'react';
import { useHomeLocation } from './useHomeLocation';
import { useUnifiedNotifications } from './useUnifiedNotifications';
import { useWebcamMaskDetection } from './useWebcamMaskDetection';
import { useVehicleDetection } from './useVehicleDetection';
import { useMaskReminder } from './useMaskReminder';
import { useBackgroundMode } from './useBackgroundMode';
import { useBackgroundSync } from './useBackgroundSync';
import { Capacitor } from '@capacitor/core';

interface OutdoorDetectionConfig {
  pm25: number;
  enabled: boolean;
}

export const useOutdoorDetection = ({ pm25, enabled }: OutdoorDetectionConfig) => {
  const { isAtHome, checkIfAtHome } = useHomeLocation();
  const { sendNotification } = useUnifiedNotifications();
  const [shouldPromptMask, setShouldPromptMask] = useState(false);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  
  // Webcam-based mask detection
  const isInVehicleOrBuilding = useVehicleDetection(enabled);
  const webcamEnabled = enabled && !isInVehicleOrBuilding;
  const maskDetection = useWebcamMaskDetection(webcamEnabled);
  const isWearingMask = maskDetection.faceDetected ? maskDetection.isWearingMask : null;
  
  // Enable background mode with wake lock for persistent operation
  useBackgroundMode({
    enabled: enabled && !isAtHome,
    wakeLock: true,
  });
  
  // Enable background sync for PWA and Native
  useBackgroundSync(enabled);
  
  // Continuous vibration reminder
  useMaskReminder({
    pm25,
    isWearingMask: isWearingMask || false,
    enabled: webcamEnabled && !isAtHome,
  });

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
    if (!enabled || isInVehicleOrBuilding) {
      setShouldPromptMask(false);
      return;
    }

    const shouldWearMask = pm25 > 60;
    const isOutdoors = !isAtHome;

    // If outdoors and PM2.5 is high and webcam detected no mask
    if (isOutdoors && shouldWearMask && maskDetection.faceDetected && !maskDetection.isWearingMask) {
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
  }, [isAtHome, pm25, maskDetection, enabled, isInVehicleOrBuilding]);

  const sendContinuousReminder = async () => {
    // Vibrate with 2-pulse pattern for no mask detection
    try {
      if (Capacitor.isNativePlatform()) {
        // Native vibration via Haptics plugin - simulate 2 pulses
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.vibrate({ duration: 200 });
        setTimeout(async () => {
          await Haptics.vibrate({ duration: 200 });
        }, 300);
      } else if ('vibrate' in navigator) {
        // PWA vibration - 2 pulses pattern [200ms on, 100ms off, 200ms on]
        navigator.vibrate([200, 100, 200]);
      }
    } catch (error) {
      console.error('Vibration error:', error);
    }

    // Send notification
    await sendNotification({
      title: '⚠️ แจ้งเตือน: ตรวจพบไม่ได้สวมหน้ากาก!',
      body: `ค่า PM2.5 สูงถึง ${pm25} µg/m³\nกล้องตรวจพบว่าคุณไม่ได้ใส่หน้ากาก กรุณาสวมหน้ากากทันที!`,
      icon: '/pwa-192x192.png',
    });
  };

  return {
    isOutdoors: !isAtHome,
    isWearingMask,
    shouldPromptMask,
    maskDetection,
    isInVehicleOrBuilding,
  };
};
