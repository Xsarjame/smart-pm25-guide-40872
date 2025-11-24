// Service Worker for PWA Background Operations
const CACHE_NAME = 'smart-pm25-v1';
const BACKGROUND_SYNC_TAG = 'pm25-check';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Background Sync for PWA
self.addEventListener('sync', async (event) => {
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(checkAirQualityBackground());
  }
});

// Periodic Background Sync (Chrome only)
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'pm25-periodic-check') {
    event.waitUntil(checkAirQualityBackground());
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Smart PM2.5 Health', {
      body: data.body || 'แจ้งเตือนคุณภาพอากาศ',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [400],
      tag: 'pm25-alert',
      requireInteraction: true
    })
  );
});

// Background air quality check
async function checkAirQualityBackground() {
  try {
    console.log('[SW] Background check starting...');
    
    // Get current position
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000
      });
    });
    
    // Fetch air quality data
    const response = await fetch(
      'https://ulkyeqdivyrasrascsgi.supabase.co/functions/v1/get-air-quality',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsa3llcWRpdnlyYXNyYXNjc2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5MDYwODIsImV4cCI6MjA3ODQ4MjA4Mn0.M5aVkpCrEGsCY7-BIknA7Cgyx_WNuqKf__0ypydDRvY'
        },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      }
    );
    
    const data = await response.json();
    console.log('[SW] Air quality:', data);
    
    // Get previous PM2.5 from IndexedDB
    const db = await openDB();
    const oldPM25 = await getFromDB(db, 'last_pm25');
    
    // Save new PM2.5
    await saveToDB(db, 'last_pm25', data.pm25);
    
    // Check conditions and notify
    let shouldNotify = false;
    let title = '';
    let body = '';
    
    // High PM2.5
    if (data.pm25 > 60) {
      shouldNotify = true;
      title = '⚠️ แจ้งเตือน: PM2.5 สูง';
      body = `ค่า PM2.5 อยู่ที่ ${data.pm25} µg/m³`;
    }
    
    // Worsening PM2.5
    if (oldPM25 && (data.pm25 - oldPM25) >= 10) {
      shouldNotify = true;
      title = '📈 ค่าฝุ่น PM2.5 แย่ลง!';
      body = `เพิ่มขึ้นจาก ${oldPM25} เป็น ${data.pm25} µg/m³`;
    }
    
    // Send notification
    if (shouldNotify) {
      await self.registration.showNotification(title, {
        body: body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [400],
        tag: 'pm25-background',
        requireInteraction: true,
        actions: [
          { action: 'open', title: 'เปิดแอพ' },
          { action: 'close', title: 'ปิด' }
        ]
      });
    }
    
    console.log('[SW] Background check completed');
  } catch (error) {
    console.error('[SW] Background check error:', error);
  }
}

// IndexedDB helpers
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SmartPM25DB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };
  });
}

function getFromDB(db, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');
    const request = store.get(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function saveToDB(db, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');
    const request = store.put(value, key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
