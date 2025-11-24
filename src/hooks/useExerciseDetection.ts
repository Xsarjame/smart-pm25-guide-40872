import { useState, useEffect } from 'react';
import { Motion } from '@capacitor/motion';

export const useExerciseDetection = () => {
  const [isExercising, setIsExercising] = useState(false);
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'vigorous'>('light');

  useEffect(() => {
    let isActive = true;
    let movementBuffer: number[] = [];

    const detectExercise = async () => {
      try {
        await Motion.addListener('accel', (event) => {
          if (!isActive) return;

          const { x, y, z } = event.acceleration;
          const magnitude = Math.sqrt(x * x + y * y + z * z);
          
          movementBuffer.push(magnitude);
          if (movementBuffer.length > 50) {
            movementBuffer.shift();
          }

          // Calculate variance to detect rhythmic movement (exercise)
          const avg = movementBuffer.reduce((a, b) => a + b, 0) / movementBuffer.length;
          const variance = movementBuffer.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / movementBuffer.length;
          
          // High variance + high average = exercise
          const isExercisingNow = variance > 1.5 && avg > 1.0;
          setIsExercising(isExercisingNow);

          if (isExercisingNow) {
            if (avg > 3.0) {
              setIntensity('vigorous');
            } else if (avg > 2.0) {
              setIntensity('moderate');
            } else {
              setIntensity('light');
            }
          }
        });
      } catch (error) {
        console.log('Exercise detection not available:', error);
      }
    };

    detectExercise();

    return () => {
      isActive = false;
      Motion.removeAllListeners();
    };
  }, []);

  return { isExercising, intensity };
};