import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';

interface MaskConfirmationDialogProps {
  open: boolean;
  pm25: number;
  onConfirmWearing: () => void;
  onConfirmNotWearing: () => void;
}

export const MaskConfirmationDialog = ({
  open,
  pm25,
  onConfirmWearing,
  onConfirmNotWearing,
}: MaskConfirmationDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            <AlertDialogTitle>คุณอยู่นอกบ้าน!</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2">
            <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-semibold text-destructive">
                ค่า PM2.5 สูงถึง {pm25} µg/m³
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ระดับอันตรายต่อสุขภาพ
              </p>
            </div>
            
            <p className="text-base font-medium text-foreground">
              คุณใส่หน้ากากอนามัยแล้วหรือยัง?
            </p>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ หากยังไม่ได้ใส่ ระบบจะสั่นเตือนอย่างต่อเนื่องจนกว่าคุณจะยืนยัน
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onConfirmWearing}
            className="w-full bg-success hover:bg-success/90"
          >
            <Shield className="mr-2 h-4 w-4" />
            ✅ ใส่หน้ากากแล้ว
          </AlertDialogAction>
          <Button
            onClick={onConfirmNotWearing}
            variant="outline"
            className="w-full border-destructive text-destructive hover:bg-destructive/10"
          >
            ❌ ยังไม่ได้ใส่ (จะเตือนอีกครั้ง)
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
