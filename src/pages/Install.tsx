import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2 } from 'lucide-react';

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Smartphone className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">ติดตั้ง Smart PM2.5 Health</CardTitle>
          <CardDescription className="text-base mt-2">
            ติดตั้งแอปบนมือถือของคุณเพื่อประสบการณ์ที่ดีที่สุด
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-success/10 rounded-full">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-success mb-2">
                ติดตั้งเรียบร้อยแล้ว!
              </h3>
              <p className="text-muted-foreground">
                คุณสามารถปิดหน้าต่างนี้และใช้งานแอปได้ทันที
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">✨ ฟีเจอร์ครบครัน</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>✅ ติดตามค่า PM2.5 แบบ real-time</li>
                    <li>✅ แจ้งเตือนเมื่อออกนอกบ้าน</li>
                    <li>✅ คำนวณ PHRI ส่วนบุคคล</li>
                    <li>✅ นำทางหลีกเลี่ยงฝุ่น</li>
                    <li>✅ ใช้งานได้แม้ไม่มีอินเทอร์เน็ต</li>
                  </ul>
                </div>

                {isInstallable ? (
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full h-12 text-lg"
                    size="lg"
                  >
                    <Download className="mr-2 h-5 w-5" />
                    ติดตั้งแอปเลย
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
                        📱 วิธีติดตั้งบน iPhone
                      </p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>กดปุ่ม Share (ไอคอนแชร์)</li>
                        <li>เลือก "Add to Home Screen"</li>
                        <li>กด "Add"</li>
                      </ol>
                    </div>

                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
                        🤖 วิธีติดตั้งบน Android
                      </p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>เปิดเมนูเบราว์เซอร์ (จุด 3 จุด)</li>
                        <li>เลือก "Add to Home screen" หรือ "Install app"</li>
                        <li>กด "Install"</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <a href="/" className="text-primary hover:underline text-sm">
                  ← กลับสู่หน้าหลัก
                </a>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
