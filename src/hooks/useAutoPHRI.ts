import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { useAirQuality } from './useAirQuality';
import { useOutdoorDetection } from './useOutdoorDetection';
import { useWebcamMaskDetection } from './useWebcamMaskDetection';
import { useMovementDetection } from './useMovementDetection';
import { useExerciseDetection } from './useExerciseDetection';
import { toast } from './use-toast';

interface AutoPHRIData {
  // Air quality
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  o3: number;
  aqi: number;
  
  // Location & context
  latitude: number;
  longitude: number;
  accuracy: number;
  isOutdoor: boolean;
  movementState: string;
  
  // User behavior
  outdoorTime: number;
  wearingMask: boolean;
  isExercising: boolean;
  
  // User profile (from database)
  age: number;
  gender: string;
  chronicDiseases: string[];
  
  // Metadata
  deviceId: string;
  appVersion: string;
  dataSource: string;
  timezone: string;
  location: string;
}

export const useAutoPHRI = () => {
  const [autoData, setAutoData] = useState<Partial<AutoPHRIData>>({});
  const [isTracking, setIsTracking] = useState(false);
  const [outdoorTimeMinutes, setOutdoorTimeMinutes] = useState(0);
  
  const { data: airQualityData } = useAirQuality();
  const outdoorDetection = useOutdoorDetection({
    pm25: airQualityData?.pm25 || 0,
    enabled: true,
  });
  const maskDetection = outdoorDetection.maskDetection;
  const isOutdoors = outdoorDetection.isOutdoors;
  const { movementState } = useMovementDetection();
  const { isExercising } = useExerciseDetection();

  // Track outdoor time
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      if (isOutdoors) {
        setOutdoorTimeMinutes(prev => prev + 1);
      }
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, [isOutdoors, isTracking]);

  // Auto-collect all data
  const collectData = useCallback(async (): Promise<AutoPHRIData | null> => {
    try {
      // Get user profile from database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get current location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });

      // Get device info
      const deviceInfo = await Device.getId();
      const deviceData = await Device.getInfo();

      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const collectedData: AutoPHRIData = {
        // Air quality from hook
        pm25: airQualityData?.pm25 || 0,
        pm10: airQualityData?.pm10 || 0,
        co: airQualityData?.co || 0,
        no2: airQualityData?.no2 || 0,
        o3: airQualityData?.o3 || 0,
        aqi: airQualityData?.aqi || 0,
        
        // Location & context
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy || 0,
        isOutdoor: isOutdoors,
        movementState: movementState,
        
        // Behavior (auto-detected)
        outdoorTime: outdoorTimeMinutes,
        wearingMask: maskDetection.isWearingMask,
        isExercising: isExercising,
        
        // User profile from database
        age: profile?.age || 30,
        gender: profile?.gender || 'unknown',
        chronicDiseases: profile?.chronic_diseases || [],
        
        // Metadata
        deviceId: deviceInfo.identifier,
        appVersion: `${deviceData.platform}-${deviceData.osVersion}`,
        dataSource: 'auto',
        timezone: timezone,
        location: airQualityData?.location || 'Unknown',
      };

      setAutoData(collectedData);
      return collectedData;
    } catch (error) {
      console.error('Error collecting auto PHRI data:', error);
      return null;
    }
  }, [airQualityData, isOutdoors, maskDetection, movementState, isExercising, outdoorTimeMinutes]);

  // Calculate enhanced PHRI
  const calculateEnhancedPHRI = useCallback((data: AutoPHRIData): number => {
    // Normalize pollutants
    const normPM25 = Math.min(data.pm25 / 150, 1) * 100;
    const normPM10 = Math.min((data.pm10 || 0) / 250, 1) * 50;
    const normNO2 = Math.min((data.no2 || 0) / 200, 1) * 30;
    const normO3 = Math.min((data.o3 || 0) / 180, 1) * 30;
    const normCO = Math.min((data.co || 0) / 10, 1) * 20;
    
    // Base pollution score
    const pollutionScore = normPM25 + normPM10 * 0.5 + normNO2 * 0.3 + normO3 * 0.3 + normCO * 0.2;
    
    // Exposure factor (outdoor time + movement)
    let exposureFactor = 1.0;
    if (data.isOutdoor) {
      exposureFactor = 1 + Math.min(data.outdoorTime / 60, 1);
      
      if (data.movementState === 'walking') exposureFactor *= 1.2;
      if (data.movementState === 'driving') exposureFactor *= 0.8; // In vehicle = less exposure
      if (data.isExercising) exposureFactor *= 1.5; // Heavy breathing = more exposure
    } else {
      exposureFactor = 0.3; // Indoor = reduced exposure
    }
    
    // Vulnerability factor (age + chronic diseases)
    let vulnerabilityFactor = 1.0;
    if (data.age < 12) vulnerabilityFactor = 1.3;
    else if (data.age > 65) vulnerabilityFactor = 1.4;
    
    // Chronic diseases increase vulnerability
    const highRiskDiseases = ['asthma', 'copd', 'heart', 'pregnant'];
    const hasHighRisk = data.chronicDiseases?.some(d => highRiskDiseases.includes(d));
    if (hasHighRisk) vulnerabilityFactor *= 1.5;
    if (data.chronicDiseases?.length > 0) vulnerabilityFactor *= (1 + data.chronicDiseases.length * 0.1);
    
    // Protection factor (mask)
    const protectionFactor = data.wearingMask ? 0.3 : 1.0;
    
    // Final PHRI calculation
    const phri = pollutionScore * exposureFactor * vulnerabilityFactor * protectionFactor;
    
    return Math.round(phri * 100) / 100;
  }, []);

  // Save auto-collected log
  const saveAutoLog = useCallback(async () => {
    const data = await collectData();
    if (!data) {
      toast({
        title: 'ไม่สามารถบันทึกข้อมูลอัตโนมัติได้',
        description: 'กรุณาตรวจสอบการเชื่อมต่อและลองอีกครั้ง',
        variant: 'destructive',
      });
      return null;
    }

    const phri = calculateEnhancedPHRI(data);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { error } = await supabase.from('health_logs').insert({
        user_id: user.id,
        aqi: data.aqi,
        pm25: data.pm25,
        pm10: data.pm10,
        co: data.co,
        no2: data.no2,
        o3: data.o3,
        outdoor_time: data.outdoorTime,
        age: data.age,
        gender: data.gender,
        phri: phri,
        location: data.location,
        wearing_mask: data.wearingMask,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        movement_state: data.movementState,
        is_exercising: data.isExercising,
        device_id: data.deviceId,
        app_version: data.appVersion,
        data_source: data.dataSource,
        timezone: data.timezone,
        has_symptoms: false,
        symptoms: [],
      });

      if (error) throw error;

      toast({
        title: '✅ บันทึกข้อมูลอัตโนมัติสำเร็จ',
        description: `PHRI: ${phri.toFixed(1)} | เวลากลางแจ้ง: ${data.outdoorTime} นาที`,
      });

      return { phri, data };
    } catch (error) {
      console.error('Error saving auto log:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
      return null;
    }
  }, [collectData, calculateEnhancedPHRI]);

  // Start/stop tracking
  const startTracking = useCallback(() => {
    setIsTracking(true);
    setOutdoorTimeMinutes(0);
    toast({
      title: '🎯 เริ่มติดตาม PHRI อัตโนมัติ',
      description: 'ระบบกำลังบันทึกข้อมูลสุขภาพของคุณโดยอัตโนมัติ',
    });
  }, []);

  const stopTracking = useCallback(async () => {
    setIsTracking(false);
    const result = await saveAutoLog();
    toast({
      title: '⏸️ หยุดการติดตาม',
      description: result ? `PHRI สุดท้าย: ${result.phri.toFixed(1)}` : 'บันทึกข้อมูลล้มเหลว',
    });
  }, [saveAutoLog]);

  return {
    autoData,
    isTracking,
    outdoorTimeMinutes,
    collectData,
    calculateEnhancedPHRI,
    saveAutoLog,
    startTracking,
    stopTracking,
  };
};