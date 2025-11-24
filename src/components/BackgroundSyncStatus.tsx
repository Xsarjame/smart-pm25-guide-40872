import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncStatus {
  lastCheck: number | null;
  lastPM25: number | null;
  isSupported: boolean;
}

export const BackgroundSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus>({
    lastCheck: null,
    lastPM25: null,
    isSupported: false,
  });

  useEffect(() => {
    const checkSyncStatus = async () => {
      // Check if periodic sync is supported
      const isSupported = 'serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype;
      
      // Get last check time from IndexedDB
      try {
        const db = await openDB();
        const lastCheck = await getFromDB(db, 'last_check_time');
        const lastPM25 = await getFromDB(db, 'last_pm25');
        
        setStatus({
          lastCheck,
          lastPM25,
          isSupported,
        });
      } catch (error) {
        console.error('Error checking sync status:', error);
        setStatus({ lastCheck: null, lastPM25: null, isSupported });
      }
    };

    checkSyncStatus();
    const interval = setInterval(checkSyncStatus, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SmartPM25DB', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
    });
  };

  const getFromDB = (db: IDBDatabase, key: string): Promise<any> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  };

  const formatLastCheck = (timestamp: number | null) => {
    if (!timestamp) return 'ยังไม่เคยตรวจสอบ';
    
    const minutes = Math.floor((Date.now() - timestamp) / 1000 / 60);
    if (minutes < 1) return 'เมื่อสักครู่นี้';
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ชั่วโมงที่แล้ว`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Background Sync Status
        </CardTitle>
        <CardDescription>
          การตรวจสอบคุณภาพอากาศอัตโนมัติในพื้นหลัง
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Periodic Sync</span>
          <Badge variant={status.isSupported ? 'default' : 'secondary'}>
            {status.isSupported ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                รองรับ
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3 mr-1" />
                ไม่รองรับ
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">ตรวจสอบล่าสุด</span>
          <span className="text-sm font-medium">
            {formatLastCheck(status.lastCheck)}
          </span>
        </div>
        
        {status.lastPM25 !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">PM2.5 ล่าสุด</span>
            <Badge 
              variant={status.lastPM25 > 60 ? 'destructive' : 'default'}
            >
              {status.lastPM25} µg/m³
            </Badge>
          </div>
        )}
        
        <div className="pt-2 text-xs text-muted-foreground border-t">
          {status.isSupported ? (
            'ระบบจะตรวจสอบคุณภาพอากาศทุก 15 นาทีโดยอัตโนมัติ'
          ) : (
            'เบราว์เซอร์นี้ไม่รองรับ Periodic Sync - ใช้ Supabase Cron แทน'
          )}
        </div>
      </CardContent>
    </Card>
  );
};
