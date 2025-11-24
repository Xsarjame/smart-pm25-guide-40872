import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LocalNotifications } from '@capacitor/local-notifications';

interface PHRIData {
  aqi: number;
  pm25: number;
  outdoorTime: number;
  age: number;
  gender: string;
  hasSymptoms: boolean;
  symptoms: string[];
  location?: string;
  wearingMask?: boolean;
}

interface PHRIResult {
  phri: number;
  riskLevel: 'safe' | 'moderate' | 'high';
  color: string;
  advice: string;
}

export const usePHRI = () => {
  const [loading, setLoading] = useState(false);

  // Normalize PM2.5 to 0-100 scale for more accurate risk calculation
  const normalizePM25 = (pm25: number): number => {
    // WHO interim targets: 0 -> 0 ; 35 (WHO interim) -> 50 ; 150 -> 100 (severe)
    if (pm25 <= 0) return 0;
    if (pm25 <= 35) return (pm25 / 35) * 50;
    if (pm25 <= 150) return 50 + ((pm25 - 35) / (150 - 35)) * 50;
    return 100;
  };

  // Calculate PHRI using enhanced model:
  // PHRI = normalized_PM25 × exposureFactor × symptomFactor × ageFactor × maskFactor
  const calculatePHRI = (data: PHRIData): PHRIResult => {
    // Normalize PM2.5 concentration to 0-100 scale
    const normalizedPM25 = normalizePM25(data.pm25);
    
    // Exposure factor: based on outdoor time (1.0 to 2.0)
    // More time outdoors = higher exposure
    const exposureFactor = 1 + Math.min(data.outdoorTime / 60, 1); // 0-60+ mins -> 1.0-2.0
    
    // Symptom factor: having symptoms increases vulnerability
    const symptomFactor = data.hasSymptoms ? 1.4 : 1.0;
    
    // Age factor: children and elderly are more vulnerable
    const ageFactor = data.age < 12 ? 1.2 : data.age > 65 ? 1.3 : 1.0;
    
    // Mask factor: wearing mask reduces risk significantly
    const maskFactor = data.wearingMask ? 0.5 : 1.0;
    
    // Calculate final PHRI (0-200 scale)
    const phri = normalizedPM25 * exposureFactor * symptomFactor * ageFactor * maskFactor;

    let riskLevel: 'safe' | 'moderate' | 'high' = 'safe';
    let color = 'hsl(var(--success))';
    let advice = 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ';

    if (phri >= 100) {
      riskLevel = 'high';
      color = 'hsl(var(--destructive))';
      advice = data.wearingMask 
        ? 'ความเสี่ยงสูง - ควรลดเวลาอยู่กลางแจ้งและสังเกตอาการ' 
        : 'ความเสี่ยงสูงมาก! ควรอยู่ในร่มทันที หากจำเป็นต้องออกควรสวมหน้ากาก N95';
    } else if (phri >= 50) {
      riskLevel = 'moderate';
      color = 'hsl(var(--warning))';
      advice = data.wearingMask
        ? 'ความเสี่ยงปานกลาง - ลดเวลาอยู่กลางแจ้งและดูแลสุขภาพ'
        : 'ความเสี่ยงปานกลาง - ควรสวมหน้ากาก N95 และลดเวลาอยู่กลางแจ้ง';
    } else {
      advice = data.pm25 > 35 && !data.wearingMask
        ? 'ค่าฝุ่นเริ่มสูง แนะนำให้สวมหน้ากากเมื่ออยู่กลางแจ้งนาน'
        : 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ';
    }

    return { phri: Math.round(phri * 100) / 100, riskLevel, color, advice };
  };

  // Save health log to database
  const saveHealthLog = async (data: PHRIData): Promise<PHRIResult | null> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'ไม่สามารถบันทึกข้อมูลได้',
          description: 'กรุณาเข้าสู่ระบบก่อน',
          variant: 'destructive',
        });
        return null;
      }

      const result = calculatePHRI(data);

      const { error } = await supabase.from('health_logs').insert({
        user_id: user.id,
        aqi: data.aqi,
        pm25: data.pm25,
        outdoor_time: data.outdoorTime,
        age: data.age,
        gender: data.gender,
        has_symptoms: data.hasSymptoms,
        symptoms: data.symptoms,
        phri: result.phri,
        location: data.location,
        wearing_mask: data.wearingMask || false,
      });

      if (error) throw error;

      toast({
        title: 'บันทึกข้อมูลสำเร็จ',
        description: `ระดับความเสี่ยง: ${result.riskLevel === 'safe' ? 'ปลอดภัย' : result.riskLevel === 'moderate' ? 'ปานกลาง' : 'สูง'}`,
      });

      // Send notification if PHRI is high
      if (result.phri >= 50) {
        await sendPHRINotification(result);
      }

      return result;
    } catch (error) {
      console.error('Error saving health log:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Send notification for high PHRI
  const sendPHRINotification = async (result: PHRIResult) => {
    try {
      const permission = await LocalNotifications.requestPermissions();
      if (permission.display !== 'granted') return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: result.riskLevel === 'high' ? '⚠️ เตือนภัย! ความเสี่ยงสูง' : '⚠️ แจ้งเตือน: ความเสี่ยงปานกลาง',
            body: `PHRI: ${result.phri} - ${result.advice}`,
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: 'default',
            attachments: undefined,
            actionTypeId: '',
            extra: null,
          },
        ],
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  };

  // Fetch health logs with better error handling
  const fetchHealthLogs = async (limit: number = 10) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        return [];
      }
      
      if (!user) {
        console.log('No authenticated user');
        return [];
      }

      const { data, error } = await supabase
        .from('health_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching health logs:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching health logs:', error);
      return [];
    }
  };

  return {
    calculatePHRI,
    saveHealthLog,
    fetchHealthLogs,
    loading,
  };
};
