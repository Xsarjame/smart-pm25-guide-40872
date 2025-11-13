import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { usePHRI } from '@/hooks/usePHRI';
import { Clock, User, Activity } from 'lucide-react';

interface PHRICalculatorProps {
  currentAQI?: number;
  currentPM25?: number;
  currentLocation?: string;
  onCalculated?: (phri: number) => void;
}

const symptomsList = [
  { id: 'cough', label: 'ไอ' },
  { id: 'sore_throat', label: 'เจ็บคอ' },
  { id: 'eye_irritation', label: 'แสบตา' },
  { id: 'breathing_difficulty', label: 'หายใจไม่สะดวก' },
  { id: 'headache', label: 'ปวดหัว' },
  { id: 'fatigue', label: 'อ่อนเพลีย' },
];

export const PHRICalculator = ({ 
  currentAQI = 0, 
  currentPM25 = 0, 
  currentLocation = '',
  onCalculated 
}: PHRICalculatorProps) => {
  const [outdoorTime, setOutdoorTime] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const { saveHealthLog, loading } = usePHRI();

  const handleSymptomToggle = (symptomId: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!outdoorTime || !age) {
      return;
    }

    const result = await saveHealthLog({
      aqi: currentAQI,
      pm25: currentPM25,
      outdoorTime: parseInt(outdoorTime),
      age: parseInt(age),
      gender,
      hasSymptoms: selectedSymptoms.length > 0,
      symptoms: selectedSymptoms,
      location: currentLocation,
    });

    if (result && onCalculated) {
      onCalculated(result.phri);
    }

    // Reset form
    setOutdoorTime('');
    setAge('');
    setGender('');
    setSelectedSymptoms([]);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          บันทึกข้อมูลสุขภาพ
        </CardTitle>
        <CardDescription>
          กรอกข้อมูลเพื่อคำนวณดัชนีความเสี่ยงส่วนบุคคล (PHRI)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outdoorTime" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              เวลาที่อยู่กลางแจ้งวันนี้ (นาที)
            </Label>
            <Input
              id="outdoorTime"
              type="number"
              min="0"
              value={outdoorTime}
              onChange={(e) => setOutdoorTime(e.target.value)}
              placeholder="เช่น 60"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                อายุ
              </Label>
              <Input
                id="age"
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="เช่น 25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">เพศ (ไม่บังคับ)</Label>
              <Input
                id="gender"
                type="text"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="เช่น ชาย/หญิง"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>อาการที่พบ (ถ้ามี)</Label>
            <div className="grid grid-cols-2 gap-3">
              {symptomsList.map((symptom) => (
                <div key={symptom.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={symptom.id}
                    checked={selectedSymptoms.includes(symptom.id)}
                    onCheckedChange={() => handleSymptomToggle(symptom.id)}
                  />
                  <label
                    htmlFor={symptom.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {symptom.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'กำลังบันทึก...' : 'บันทึกและคำนวณ PHRI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
