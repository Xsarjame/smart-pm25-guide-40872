import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useUnifiedNotifications } from './useUnifiedNotifications';

interface PM25WorseningConfig {
  pm25: number;
  enabled: boolean;
  threshold?: number; // ค่าการเพิ่มขึ้นที่จะแจ้งเตือน (default: 10)
}

export const usePM25WorseningAlert = ({ 
  pm25, 
  enabled, 
  threshold = 10 
}: PM25WorseningConfig) => {
  const [previousPM25, setPreviousPM25] = useState<number | null>(null);
  const [isWorsening, setIsWorsening] = useState(false);
  const lastAlertTimeRef = useRef<number>(0);
  const { sendNotification } = useUnifiedNotifications();
  
  // Minimum interval between alerts (5 minutes)
  const ALERT_INTERVAL = 5 * 60 * 1000;

  useEffect(() => {
    if (!enabled || pm25 === 0) return;

    // First time initialization
    if (previousPM25 === null) {
      setPreviousPM25(pm25);
      return;
    }

    // Calculate PM2.5 increase
    const increase = pm25 - previousPM25;
    
    // Check if PM2.5 worsened significantly
    if (increase >= threshold) {
      const now = Date.now();
      const timeSinceLastAlert = now - lastAlertTimeRef.current;
      
      // Only alert if enough time has passed since last alert
      if (timeSinceLastAlert >= ALERT_INTERVAL) {
        setIsWorsening(true);
        triggerWorseningAlert(pm25, previousPM25, increase);
        lastAlertTimeRef.current = now;
      }
    } else {
      setIsWorsening(false);
    }

    // Update previous value
    setPreviousPM25(pm25);
  }, [pm25, enabled, threshold, previousPM25]);

  const triggerWorseningAlert = async (
    currentPM25: number, 
    oldPM25: number, 
    increase: number
  ) => {
    try {
      // Vibration pattern for worsening air quality - single long pulse
      if (Capacitor.isNativePlatform()) {
        const { Haptics } = await import('@capacitor/haptics');
        await Haptics.vibrate({ duration: 400 });
      } else if ('vibrate' in navigator) {
        // PWA vibration - single 400ms pulse
        navigator.vibrate(400);
      }
    } catch (error) {
      console.error('Vibration error:', error);
    }

    // Send notification
    await sendNotification({
      title: '⚠️ แจ้งเตือน: ค่าฝุ่น PM2.5 แย่ลง!',
      body: `ค่า PM2.5 เพิ่มขึ้นจาก ${oldPM25.toFixed(1)} เป็น ${currentPM25.toFixed(1)} µg/m³ (+${increase.toFixed(1)})\nกรุณาระมัดระวังและหลีกเลี่ยงการอยู่นอกอาคาร`,
      icon: '/pwa-192x192.png',
    });
  };

  return {
    isWorsening,
    previousPM25,
    increase: previousPM25 !== null ? pm25 - previousPM25 : 0,
  };
};
