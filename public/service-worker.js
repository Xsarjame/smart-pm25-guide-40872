// Service Worker for PWA Background Operations
const CACHE_NAME = 'smart-pm25-v2';
const BACKGROUND_SYNC_TAG = 'pm25-check';
const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker v2...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.webmanifest',
        '/pwa-192x192.png',
        '/pwa-512x512.png'
      ]);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
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
    console.log('[SW] Background check starting at:', new Date().toISOString());
    
    // Get stored location or use default (Bangkok)
    const db = await openDB();
    let latitude = 13.7563;
    let longitude = 100.5018;
    
    try {
      const storedLat = await getFromDB(db, 'last_latitude');
      const storedLon = await getFromDB(db, 'last_longitude');
      if (storedLat && storedLon) {
        latitude = storedLat;
        longitude = storedLon;
      }
    } catch (e) {
      console.log('[SW] Using default Bangkok location');
    }
    
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
          latitude: latitude,
          longitude: longitude
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[SW] Air quality data received:', { pm25: data.pm25, aqi: data.aqi });
    
    // Get previous PM2.5 from IndexedDB
    const oldPM25 = await getFromDB(db, 'last_pm25');
    const lastCheck = await getFromDB(db, 'last_check_time');
    
    // Save new PM2.5 and check time
    await saveToDB(db, 'last_pm25', data.pm25);
    await saveToDB(db, 'last_check_time', Date.now());
    await saveToDB(db, 'last_latitude', latitude);
    await saveToDB(db, 'last_longitude', longitude);
    
    // Check conditions and notify
    let shouldNotify = false;
    let title = '';
    let body = '';
    let tag = 'pm25-background';
    
    // High PM2.5
    if (data.pm25 > 60) {
      shouldNotify = true;
      title = '⚠️ แจ้งเตือน: PM2.5 สูง';
      body = `ค่า PM2.5 อยู่ที่ ${data.pm25} µg/m³ - สวมหน้ากากเมื่อออกนอกอาคาร`;
      tag = 'pm25-high';
    }
    
    // Worsening PM2.5 (only if more than 5 minutes since last check)
    const timeSinceLastCheck = lastCheck ? (Date.now() - lastCheck) / 1000 / 60 : 999;
    if (oldPM25 && (data.pm25 - oldPM25) >= 10 && timeSinceLastCheck > 5) {
      shouldNotify = true;
      title = '📈 ค่าฝุ่น PM2.5 แย่ลง!';
      body = `เพิ่มขึ้นจาก ${oldPM25} เป็น ${data.pm25} µg/m³`;
      tag = 'pm25-worsening';
    }
    
    // Very high PM2.5 (critical)
    if (data.pm25 > 150) {
      shouldNotify = true;
      title = '🚨 อันตราย: PM2.5 สูงมาก!';
      body = `ค่า PM2.5 อยู่ที่ ${data.pm25} µg/m³ - หลีกเลี่ยงกิจกรรมกลางแจ้ง`;
      tag = 'pm25-critical';
    }
    
    // Send notification
    if (shouldNotify) {
      await self.registration.showNotification(title, {
        body: body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        vibrate: [400],
        tag: tag,
        requireInteraction: tag === 'pm25-critical',
        data: {
          url: '/',
          pm25: data.pm25,
          timestamp: Date.now()
        },
        actions: [
          { action: 'open', title: 'เปิดแอพ' },
          { action: 'dismiss', title: 'ปิด' }
        ]
      });
      
      console.log('[SW] Notification sent:', { title, body, tag });
    } else {
      console.log('[SW] No notification needed. PM2.5:', data.pm25);
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
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});
