import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Camera } from "lucide-react";

interface MaskConfirmationDialogProps {
  open: boolean;
  pm25: number;
  faceDetected: boolean;
  confidence: number;
}

export const MaskConfirmationDialog = ({
  open,
  pm25,
  faceDetected,
  confidence,
}: MaskConfirmationDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="bg-gradient-alert border-destructive">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white text-xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6 animate-pulse" />
            ⚠️ ตรวจพบไม่ได้สวมหน้ากาก!
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/90 text-base space-y-3">
            <p className="font-semibold">
              ขณะนี้ค่า PM2.5 อยู่ที่ <span className="text-white font-bold text-lg">{pm25} µg/m³</span>
            </p>
            <p className="bg-white/20 p-3 rounded-lg">
              🎥 <span className="font-semibold">ระบบตรวจจับด้วยกล้อง:</span><br />
              {faceDetected ? (
                <>
                  ✅ ตรวจพบใบหน้า (ความแม่นยำ {Math.round(confidence * 100)}%)<br />
                  <span className="text-destructive-foreground font-bold">❌ ไม่พบหน้ากากอนามัย</span>
                </>
              ) : (
                <span className="text-yellow-200">⚠️ กำลังวิเคราะห์ใบหน้า...</span>
              )}
            </p>
            <p className="font-bold text-white text-lg animate-pulse">
              กรุณาสวมหน้ากากอนามัยทันที!
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-primary hover:bg-primary/90 text-white font-semibold w-full"
          >
            รับทราบ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
