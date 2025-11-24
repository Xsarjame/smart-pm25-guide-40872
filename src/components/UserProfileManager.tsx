import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Save } from 'lucide-react';

const chronicDiseaseOptions = [
  { id: 'asthma', label: 'โรคหอบหืด' },
  { id: 'copd', label: 'โรคปอดอุดกั้นเรื้อรัง (COPD)' },
  { id: 'heart', label: 'โรคหัวใจ' },
  { id: 'diabetes', label: 'โรคเบาหวาน' },
  { id: 'allergy', label: 'โรคภูมิแพ้ทางเดินหายใจ' },
  { id: 'pregnant', label: 'หญิงตั้งครรภ์' },
];

export const UserProfileManager = () => {
  const [loading, setLoading] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [sensitivityLevel, setSensitivityLevel] = useState('normal');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setAge(data.age?.toString() || '');
        setGender(data.gender || '');
        setSelectedDiseases(data.chronic_diseases || []);
        setSensitivityLevel(data.sensitivity_level || 'normal');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleDiseaseToggle = (diseaseId: string) => {
    setSelectedDiseases(prev =>
      prev.includes(diseaseId)
        ? prev.filter(id => id !== diseaseId)
        : [...prev, diseaseId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'กรุณาเข้าสู่ระบบ',
          variant: 'destructive',
        });
        return;
      }

      const profileData = {
        user_id: user.id,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        chronic_diseases: selectedDiseases,
        sensitivity_level: sensitivityLevel,
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: '✅ บันทึกโปรไฟล์สำเร็จ',
        description: 'ข้อมูลของคุณจะถูกใช้ในการคำนวณ PHRI อัตโนมัติ',
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถบันทึกข้อมูลได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle>โปรไฟล์สุขภาพ</CardTitle>
        </div>
        <CardDescription>
          ข้อมูลนี้จะถูกใช้ในการคำนวณ PHRI อัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">อายุ</Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="เช่น 30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">เพศ</Label>
            <Input
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              placeholder="เช่น ชาย/หญิง"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>โรคประจำตัว</Label>
          <div className="space-y-2">
            {chronicDiseaseOptions.map((disease) => (
              <div key={disease.id} className="flex items-center space-x-2">
                <Checkbox
                  id={disease.id}
                  checked={selectedDiseases.includes(disease.id)}
                  onCheckedChange={() => handleDiseaseToggle(disease.id)}
                />
                <label
                  htmlFor={disease.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {disease.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
        </Button>
      </CardContent>
    </Card>
  );
};