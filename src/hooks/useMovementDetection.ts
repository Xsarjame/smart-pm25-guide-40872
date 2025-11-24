import { useState, useEffect } from 'react';
import { Motion } from '@capacitor/motion';

export type MovementState = 'stationary' | 'walking' | 'driving' | 'unknown';

export const useMovementDetection = () => {
  const [movementState, setMovementState] = useState<MovementState>('unknown');
  const [speed, setSpeed] = useState<number>(0);

  useEffect(() => {
    let isActive = true;
    let accelerationHistory: number[] = [];

    const detectMovement = async () => {
      try {
        // Listen to device motion/acceleration
        await Motion.addListener('accel', (event) => {
          if (!isActive) return;

          const { x, y, z } = event.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          accelerationHistory.push(magnitude);
          if (accelerationHistory.length > 20) {
            accelerationHistory.shift();
          }

          // Calculate average acceleration
          const avgAccel = accelerationHistory.reduce((a, b) => a + b, 0) / accelerationHistory.length;
          
          // Determine movement state based on acceleration patterns
          if (avgAccel < 0.5) {
            setMovementState('stationary');
            setSpeed(0);
          } else if (avgAccel < 2.0) {
            setMovementState('walking');
            setSpeed(5); // ~5 km/h walking speed
          } else {
            setMovementState('driving');
            setSpeed(40); // estimate ~40 km/h
          }
        });
      } catch (error) {
        console.log('Motion detection not available:', error);
        setMovementState('unknown');
      }
    };

    detectMovement();

    return () => {
      isActive = false;
      Motion.removeAllListeners();
    };
  }, []);

  return { movementState, speed };
};