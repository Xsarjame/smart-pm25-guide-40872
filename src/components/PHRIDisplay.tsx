import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, AlertCircle } from 'lucide-react';
import { usePHRI } from '@/hooks/usePHRI';
import { useEffect, useState } from 'react';

interface PHRIDisplayProps {
  phri?: number;
  riskLevel?: 'safe' | 'moderate' | 'high';
  advice?: string;
}

export const PHRIDisplay = ({ phri, riskLevel, advice }: PHRIDisplayProps) => {
  const { fetchHealthLogs } = usePHRI();
  const [latestLog, setLatestLog] = useState<any>(null);

  useEffect(() => {
    const loadLatestLog = async () => {
      try {
        const logs = await fetchHealthLogs(1);
        if (logs && logs.length > 0) {
          setLatestLog(logs[0]);
        }
      } catch (error) {
        console.error('Error loading latest log:', error);
      }
    };
    
    if (!phri) {
      loadLatestLog();
    }
  }, [phri, fetchHealthLogs]);

  const displayPHRI = phri ?? latestLog?.phri;
  const displayRiskLevel = riskLevel ?? (
    displayPHRI >= 100 ? 'high' : displayPHRI >= 50 ? 'moderate' : 'safe'
  );
  const displayAdvice = advice ?? (
    displayPHRI >= 100 
      ? 'ควรพักในร่มทันที และสังเกตอาการผิดปกติ'
      : displayPHRI >= 50
      ? 'ควรสวมหน้ากาก N95 และลดเวลาอยู่กลางแจ้ง'
      : 'สามารถทำกิจกรรมกลางแจ้งได้ตามปกติ'
  );

  if (!displayPHRI) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>ดัชนีความเสี่ยงสุขภาพส่วนบุคคล (PHRI)</CardTitle>
          <CardDescription>ยังไม่มีข้อมูล กรุณาบันทึกข้อมูลสุขภาพ</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getIcon = () => {
    switch (displayRiskLevel) {
      case 'high':
        return <AlertTriangle className="h-8 w-8" />;
      case 'moderate':
        return <AlertCircle className="h-8 w-8" />;
      default:
        return <Shield className="h-8 w-8" />;
    }
  };

  const getColor = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'hsl(var(--destructive))';
      case 'moderate':
        return 'hsl(var(--warning))';
      default:
        return 'hsl(var(--success))';
    }
  };

  const getBadgeVariant = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'destructive';
      case 'moderate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getRiskText = () => {
    switch (displayRiskLevel) {
      case 'high':
        return 'เสี่ยงสูง';
      case 'moderate':
        return 'เสี่ยงปานกลาง';
      default:
        return 'ปลอดภัย';
    }
  };

  return (
    <Card className="w-full overflow-hidden shadow-lg">
      <div 
        className="h-2 w-full"
        style={{ backgroundColor: getColor() }}
      />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span style={{ color: getColor() }}>{getIcon()}</span>
            PHRI (Personal Health Risk Index)
          </CardTitle>
          <Badge variant={getBadgeVariant() as any} className="text-sm px-3 py-1">
            {getRiskText()}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          ดัชนีความเสี่ยงสุขภาพส่วนบุคคล - อัพเดทล่าสุด
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pb-6">
        <div className="text-center py-4">
          <div 
            className="text-7xl font-bold mb-1 animate-in fade-in duration-500" 
            style={{ color: getColor() }}
          >
            {displayPHRI.toFixed(1)}
          </div>
          <div className="text-sm text-muted-foreground font-medium">ระดับความเสี่ยง</div>
        </div>

        <div 
          className="p-4 rounded-xl border-2"
          style={{ 
            backgroundColor: `${getColor()}08`,
            borderColor: `${getColor()}40`
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5" style={{ color: getColor() }}>
              {displayRiskLevel === 'high' ? '⚠️' : displayRiskLevel === 'moderate' ? '⚡' : '✅'}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1" style={{ color: getColor() }}>
                คำแนะนำ:
              </p>
              <p className="text-sm leading-relaxed">
                {displayAdvice}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center p-3 rounded-lg bg-success/10">
            <div className="text-xl font-bold text-success mb-1">
              &lt; 50
            </div>
            <div className="text-xs text-muted-foreground">ปลอดภัย</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-warning/10">
            <div className="text-xl font-bold text-warning mb-1">
              50-100
            </div>
            <div className="text-xs text-muted-foreground">ปานกลาง</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-destructive/10">
            <div className="text-xl font-bold text-destructive mb-1">
              &gt; 100
            </div>
            <div className="text-xs text-muted-foreground">เสี่ยงสูง</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
