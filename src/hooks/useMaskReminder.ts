import { useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MaskReminderConfig {
  pm25: number;
  isWearingMask: boolean;
  enabled: boolean;
}

export const useMaskReminder = ({ pm25, isWearingMask, enabled }: MaskReminderConfig) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start vibration if PM2.5 > 60, not wearing mask, and enabled
    if (!enabled || pm25 <= 60 || isWearingMask) {
      return;
    }

    // Start continuous vibration every 5 seconds
    const vibrate = async () => {
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(async () => {
          await Haptics.impact({ style: ImpactStyle.Heavy });
        }, 200);
      } catch (error) {
        console.error('Haptics error:', error);
      }
    };

    // Vibrate immediately
    vibrate();

    // Then vibrate every 5 seconds
    intervalRef.current = setInterval(() => {
      vibrate();
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pm25, isWearingMask, enabled]);
};
