import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wind, AlertTriangle } from "lucide-react";

interface AirQualityCardProps {
  pm25: number;
  location: string;
  timestamp?: string;
}

export const AirQualityCard = ({ pm25, location, timestamp }: AirQualityCardProps) => {
  const getAQILevel = (value: number) => {
    if (value <= 25) return { level: "ดี", color: "bg-aqi-good", textColor: "text-aqi-good" };
    if (value <= 37) return { level: "ปานกลาง", color: "bg-aqi-moderate", textColor: "text-aqi-moderate" };
    if (value <= 50) return { level: "เริ่มมีผลกระทบต่อสุขภาพ", color: "bg-aqi-unhealthy-sensitive", textColor: "text-aqi-unhealthy-sensitive" };
    if (value <= 90) return { level: "มีผลกระทบต่อสุขภาพ", color: "bg-aqi-unhealthy", textColor: "text-aqi-unhealthy" };
    return { level: "อันตราย", color: "bg-aqi-hazardous", textColor: "text-aqi-hazardous" };
  };

  const aqi = getAQILevel(pm25);
  const isUnsafe = pm25 > 37;

  return (
    <Card className="relative overflow-hidden shadow-elevated transition-smooth hover:shadow-alert">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">{location}</h3>
            </div>
            {timestamp && (
              <p className="text-sm text-muted-foreground">{timestamp}</p>
            )}
          </div>
          {isUnsafe && (
            <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${aqi.textColor}`}>
              {pm25}
            </span>
            <span className="text-xl text-muted-foreground">µg/m³</span>
          </div>

          <Badge className={`${aqi.color} text-white border-0`}>
            {aqi.level}
          </Badge>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${aqi.color} transition-all duration-500`}
            style={{ width: `${Math.min((pm25 / 150) * 100, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
