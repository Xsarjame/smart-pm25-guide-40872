import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface HomeLocation {
  lat: number;
  lng: number;
  name: string;
  radius: number; // meters
}

export const useHomeLocation = () => {
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [isAtHome, setIsAtHome] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Load saved home location
  useEffect(() => {
    const saved = localStorage.getItem('homeLocation');
    if (saved) {
      try {
        setHomeLocation(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load home location:', e);
      }
    }
  }, []);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if current location is within home radius
  const checkIfAtHome = async () => {
    if (!homeLocation) {
      setIsAtHome(true); // Default to true if no home set
      return true;
    }

    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      });

      const currentLat = position.coords.latitude;
      const currentLng = position.coords.longitude;
      
      setCurrentLocation({ lat: currentLat, lng: currentLng });

      const distance = calculateDistance(
        homeLocation.lat,
        homeLocation.lng,
        currentLat,
        currentLng
      );

      const atHome = distance <= homeLocation.radius;
      setIsAtHome(atHome);
      return atHome;
    } catch (error) {
      console.error('Error checking location:', error);
      return true; // Default to true on error
    }
  };

  // Set home location to current position
  const setHomeToCurrentLocation = async (name: string = 'บ้าน', radius: number = 100) => {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      const location: HomeLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        name,
        radius,
      };

      setHomeLocation(location);
      localStorage.setItem('homeLocation', JSON.stringify(location));
      setIsAtHome(true);
      
      return location;
    } catch (error) {
      console.error('Error setting home location:', error);
      throw error;
    }
  };

  // Clear home location
  const clearHomeLocation = () => {
    setHomeLocation(null);
    localStorage.removeItem('homeLocation');
    setIsAtHome(true);
  };

  return {
    homeLocation,
    isAtHome,
    currentLocation,
    checkIfAtHome,
    setHomeToCurrentLocation,
    clearHomeLocation,
  };
};
