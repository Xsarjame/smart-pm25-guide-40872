import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAutoPHRI } from '@/hooks/useAutoPHRI';
import { Activity, Play, Square, MapPin, Wind, Clock, Footprints, Heart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const AutoPHRIDashboard = () => {
  const { 
    autoData, 
    isTracking, 
    outdoorTimeMinutes,
    startTracking, 
    stopTracking,
    calculateEnhancedPHRI 
  } = useAutoPHRI();

  const phri = autoData.pm25 ? calculateEnhancedPHRI(autoData as any) : 0;
  
  const getRiskLevel = (phri: number) => {
    if (phri >= 100) return { level: 'สูง', color: 'destructive', progress: 100 };
    if (phri >= 50) return { level: 'ปานกลาง', color: 'warning', progress: 66 };
    return { level: 'ปลอดภัย', color: 'success', progress: 33 };
  };

  const risk = getRiskLevel(phri);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>PHRI อัตโนมัติ</CardTitle>
          </div>
          {isTracking && (
            <Badge variant="default" className="animate-pulse">
              กำลังติดตาม
            </Badge>
          )}
        </div>
        <CardDescription>
          ระบบติดตามและบันทึกข้อมูลสุขภาพโดยอัตโนมัติ
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PHRI Score Display */}
        <div className="p-6 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ค่า PHRI ปัจจุบัน</span>
            <Badge variant={risk.color as any}>{risk.level}</Badge>
          </div>
          <div className="text-4xl font-bold text-foreground">
            {phri.toFixed(1)}
          </div>
          <Progress value={risk.progress} className="h-2" />
        </div>

        {/* Real-time Data Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Air Quality */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">คุณภาพอากาศ</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PM2.5:</span>
                <span className="font-medium">{autoData.pm25?.toFixed(1) || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PM10:</span>
                <span className="font-medium">{autoData.pm10?.toFixed(1) || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">AQI:</span>
                <span className="font-medium">{autoData.aqi || '–'}</span>
              </div>
            </div>
          </div>

          {/* Location & Context */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">ตำแหน่ง</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">สถานะ:</span>
                <span className="font-medium">
                  {autoData.isOutdoor ? '🌤️ กลางแจ้ง' : '🏠 ในร่ม'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">การเคลื่อนไหว:</span>
                <span className="font-medium">{autoData.movementState || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ความแม่นยำ:</span>
                <span className="font-medium">{autoData.accuracy?.toFixed(0) || '–'} m</span>
              </div>
            </div>
          </div>

          {/* Behavior */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">พฤติกรรม</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">เวลากลางแจ้ง:</span>
                <span className="font-medium">{outdoorTimeMinutes} นาที</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">สวมหน้ากาก:</span>
                <span className="font-medium">
                  {autoData.wearingMask ? '✅ ใช่' : '❌ ไม่'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ออกกำลังกาย:</span>
                <span className="font-medium">
                  {autoData.isExercising ? '🏃 ใช่' : 'ไม่'}
                </span>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">ข้อมูลผู้ใช้</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">อายุ:</span>
                <span className="font-medium">{autoData.age || '–'} ปี</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">เพศ:</span>
                <span className="font-medium">{autoData.gender || '–'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">โรคประจำตัว:</span>
                <span className="font-medium">
                  {autoData.chronicDiseases?.length || 0} รายการ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={startTracking} className="flex-1" size="lg">
              <Play className="h-4 w-4 mr-2" />
              เริ่มติดตาม
            </Button>
          ) : (
            <Button 
              onClick={stopTracking} 
              variant="destructive" 
              className="flex-1" 
              size="lg"
            >
              <Square className="h-4 w-4 mr-2" />
              หยุดและบันทึก
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center p-3 bg-muted/30 rounded-lg">
          💡 ระบบจะบันทึกข้อมูลอัตโนมัติทุก 15 นาทีเมื่อเปิดการติดตาม
        </div>
      </CardContent>
    </Card>
  );
};