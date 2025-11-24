import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

export const useVehicleDetection = (enabled: boolean) => {
  const [isInVehicleOrBuilding, setIsInVehicleOrBuilding] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let watchId: number | null = null;
    let lastPosition: GeolocationPosition | null = null;
    let lastTimestamp = Date.now();

    const checkIfInVehicle = async (position: GeolocationPosition) => {
      const now = Date.now();
      
      if (lastPosition) {
        const timeDiff = (now - lastTimestamp) / 1000; // seconds
        const distance = calculateDistance(
          lastPosition.coords.latitude,
          lastPosition.coords.longitude,
          position.coords.latitude,
          position.coords.longitude
        );
        
        // Calculate speed in km/h
        const speed = (distance / timeDiff) * 3600;
        
        // If moving faster than 10 km/h, likely in vehicle
        // If speed is 0-2 km/h, likely in building (stationary)
        const inVehicle = speed > 10 && speed < 120;
        const inBuilding = speed < 2;
        
        setIsInVehicleOrBuilding(inVehicle || inBuilding);
      }

      lastPosition = position;
      lastTimestamp = now;
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const toRad = (deg: number) => deg * (Math.PI / 180);

    if (Capacitor.isNativePlatform() || 'geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        checkIfInVehicle,
        (error) => console.error('Geolocation error:', error),
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 10000
        }
      );
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled]);

  return isInVehicleOrBuilding;
};
