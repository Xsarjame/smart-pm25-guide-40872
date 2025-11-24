import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, MapPin, Trash2, Loader2 } from 'lucide-react';
import { useHomeLocation } from '@/hooks/useHomeLocation';
import { useToast } from '@/hooks/use-toast';

export const HomeLocationSetup = () => {
  const { homeLocation, setHomeToCurrentLocation, clearHomeLocation } = useHomeLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('บ้าน');
  const [radius, setRadius] = useState('100');

  const handleSetHome = async () => {
    setLoading(true);
    try {
      const radiusMeters = parseInt(radius) || 100;
      await setHomeToCurrentLocation(locationName, radiusMeters);
      
      toast({
        title: 'ตั้งค่าตำแหน่งบ้านสำเร็จ',
        description: `${locationName} (รัศมี ${radiusMeters} เมตร)`,
      });
    } catch (error) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถตั้งค่าตำแหน่งบ้านได้',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearHome = () => {
    clearHomeLocation();
    toast({
      title: 'ลบตำแหน่งบ้านแล้ว',
      description: 'ระบบจะไม่ตรวจจับการออกนอกบ้านอีกต่อไป',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-primary" />
          <CardTitle>ตั้งค่าตำแหน่งบ้าน</CardTitle>
        </div>
        <CardDescription>
          ตั้งค่าตำแหน่งบ้านเพื่อให้ระบบตรวจจับเมื่อคุณออกนอกบ้าน
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {homeLocation ? (
          <div className="space-y-3">
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{homeLocation.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    พิกัด: {homeLocation.lat.toFixed(6)}, {homeLocation.lng.toFixed(6)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    รัศมี: {homeLocation.radius} เมตร
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHome}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ✅ ระบบจะแจ้งเตือนอัตโนมัติเมื่อคุณออกนอกบ้านและค่า PM2.5 สูง
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="location-name">ชื่อสถานที่</Label>
              <Input
                id="location-name"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="เช่น บ้าน, ที่พัก"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius">รัศมี (เมตร)</Label>
              <Input
                id="radius"
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                placeholder="100"
                min="50"
                max="1000"
              />
              <p className="text-xs text-muted-foreground">
                ระบบจะแจ้งเตือนเมื่อคุณห่างจากบ้านเกิน {radius} เมตร
              </p>
            </div>

            <Button
              onClick={handleSetHome}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <MapPin className="mr-2 h-4 w-4" />
                  ตั้งค่าตำแหน่งปัจจุบันเป็นบ้าน
                </>
              )}
            </Button>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                💡 แอปจะใช้ตำแหน่งปัจจุบันของคุณเป็นจุดอ้างอิง
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
