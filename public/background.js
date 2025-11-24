// Background Runner Script - Capacitor
// ทำงานในพื้นหลังแม้แอพปิดอยู่

addEventListener('backgroundTask', async (resolve, reject) => {
  try {
    console.log('[Background] Starting background task...');
    
    // ดึงข้อมูลคุณภาพอากาศ
    const position = await CapacitorGeolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    });
    
    // เรียก Edge Function
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
    console.log('[Background] Air quality data:', data);
    
    // ดึงค่า PM2.5 เก่าจาก Storage
    const oldPM25 = await CapacitorPreferences.get({ key: 'last_pm25' });
    const oldValue = oldPM25.value ? parseFloat(oldPM25.value) : null;
    
    // บันทึกค่า PM2.5 ใหม่
    await CapacitorPreferences.set({ 
      key: 'last_pm25', 
      value: data.pm25.toString() 
    });
    
    // ตรวจสอบและแจ้งเตือน
    let shouldNotify = false;
    let notificationTitle = '';
    let notificationBody = '';
    
    // 1. ค่าฝุ่นสูง
    if (data.pm25 > 60) {
      shouldNotify = true;
      notificationTitle = '⚠️ แจ้งเตือน: PM2.5 สูง';
      notificationBody = `ค่า PM2.5 อยู่ที่ ${data.pm25} µg/m³ ที่ ${data.location}`;
    }
    
    // 2. ค่าฝุ่นแย่ลง
    if (oldValue && (data.pm25 - oldValue) >= 10) {
      shouldNotify = true;
      notificationTitle = '📈 ค่าฝุ่น PM2.5 แย่ลง!';
      notificationBody = `เพิ่มขึ้นจาก ${oldValue} เป็น ${data.pm25} µg/m³`;
      
      // สั่นเครื่อง
      await CapacitorHaptics.vibrate({ duration: 400 });
    }
    
    // ส่งการแจ้งเตือน
    if (shouldNotify) {
      await CapacitorLocalNotifications.schedule({
        notifications: [{
          title: notificationTitle,
          body: notificationBody,
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) },
          sound: 'default'
        }]
      });
    }
    
    console.log('[Background] Task completed successfully');
    resolve();
  } catch (error) {
    console.error('[Background] Error:', error);
    reject(error);
  }
});
