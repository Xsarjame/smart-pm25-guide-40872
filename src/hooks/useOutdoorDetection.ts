import { useState, useEffect } from 'react';
import { useHomeLocation } from './useHomeLocation';
import { useUnifiedNotifications } from './useUnifiedNotifications';
import { useWebcamMaskDetection } from './useWebcamMaskDetection';
import { useVehicleDetection } from './useVehicleDetection';
import { useMaskReminder } from './useMaskReminder';
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
    // Vibrate - works on both native and PWA
    try {
      if (Capacitor.isNativePlatform()) {
        // Native vibration via Haptics plugin
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.vibrate({ duration: 1000 });
        setTimeout(async () => {
          if (!maskDetection.isWearingMask) {
            await Haptics.vibrate({ duration: 1000 });
          }
        }, 1500);
      } else if ('vibrate' in navigator) {
        // PWA vibration
        navigator.vibrate([1000, 500, 1000]);
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
