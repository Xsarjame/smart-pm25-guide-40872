import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AirQualityCard } from "@/components/AirQualityCard";
import { HealthProfileForm, UserHealthProfile } from "@/components/HealthProfileForm";
import { HealthProfileDisplay } from "@/components/HealthProfileDisplay";
import { HealthRecommendations } from "@/components/HealthRecommendations";
import { AlertNotification } from "@/components/AlertNotification";
import { LocationMonitorAlert } from "@/components/LocationMonitorAlert";
import { BackgroundSyncStatus } from "@/components/BackgroundSyncStatus";
import { AutoPHRIDashboard } from "@/components/AutoPHRIDashboard";
import { UserProfileManager } from "@/components/UserProfileManager";
import { PHRIDisplay } from "@/components/PHRIDisplay";
import { PHRIComparison } from "@/components/PHRIComparison";
import { HomeLocationSetup } from "@/components/HomeLocationSetup";
import { MaskConfirmationDialog } from "@/components/MaskConfirmationDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MapPin, RefreshCw, User, Hospital, Loader2, Navigation, MessageSquare, Shield, Activity, LogOut, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-clean-air.jpg";
import { useAirQuality } from "@/hooks/useAirQuality";
import { useLocationMonitor } from "@/hooks/useLocationMonitor";
import { useOutdoorDetection } from "@/hooks/useOutdoorDetection";
import { usePM25WorseningAlert } from "@/hooks/usePM25WorseningAlert";
import { Geolocation } from '@capacitor/geolocation';
import { AirQualityCardSkeleton, TabContentSkeleton, MapSkeleton } from "@/components/LoadingSkeleton";

// Lazy load heavy components
const NearbyHospitals = lazy(() => import("@/components/NearbyHospitals").then(m => ({ default: m.NearbyHospitals })));
const AIHealthAdvice = lazy(() => import("@/components/AIHealthAdvice").then(m => ({ default: m.AIHealthAdvice })));
const HealthChatbot = lazy(() => import("@/components/HealthChatbot").then(m => ({ default: m.HealthChatbot })));
const RouteMap = lazy(() => import("@/components/RouteMap").then(m => ({ default: m.RouteMap })));
const PHRICalculator = lazy(() => import("@/components/PHRICalculator").then(m => ({ default: m.PHRICalculator })));
const HealthLogsHistory = lazy(() => import("@/components/HealthLogsHistory").then(m => ({ default: m.HealthLogsHistory })));

const Index = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { data, loading, refresh, initialize } = useAirQuality();
  const [userProfile, setUserProfile] = useState<UserHealthProfile | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [currentPHRI, setCurrentPHRI] = useState<number | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);
  
  const { currentAlert, isMonitoring, clearAlert } = useLocationMonitor({
    userProfile,
    enabled: monitoringEnabled
  });

  const {
    isOutdoors,
    isWearingMask,
    shouldPromptMask,
    maskDetection,
    isInVehicleOrBuilding,
  } = useOutdoorDetection({
    pm25: data?.pm25 || 0,
    enabled: monitoringEnabled,
  });

  // PM2.5 Worsening Alert - ระบบแจ้งเตือนเมื่อค่าฝุ่นแย่ลง
  const { isWorsening, previousPM25, increase } = usePM25WorseningAlert({
    pm25: data?.pm25 || 0,
    enabled: monitoringEnabled,
    threshold: 10, // แจ้งเตือนเมื่อค่าฝุ่นเพิ่มขึ้น 10+ µg/m³
  });

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setAuthUser(session.user);
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setAuthUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Initialize air quality data after authentication
  useEffect(() => {
    if (authUser && !initialized) {
      setInitialized(true);
      initialize();
      
      // Set up auto-refresh every 15 minutes
      const intervalId = setInterval(() => {
        refresh();
      }, 15 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [authUser, initialized, initialize, refresh]);

  useEffect(() => {
    const savedProfile = localStorage.getItem('healthProfile');
    if (savedProfile) {
      try {
        setUserProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to load profile:', e);
      }
    }

    // Get current position for map
    const getCurrentPos = async () => {
      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 120000
        });
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Error getting position:', error);
      }
    };
    
    if (authUser) {
      getCurrentPos();
    }
  }, [authUser]);

  const handleSaveProfile = (profile: UserHealthProfile) => {
    setUserProfile(profile);
    localStorage.setItem('healthProfile', JSON.stringify(profile));
    setShowProfileForm(false);
  };

  const handleEditProfile = () => {
    setShowProfileForm(true);
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: 'ออกจากระบบสำเร็จ',
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถออกจากระบบได้',
        variant: 'destructive',
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pm25Value = data?.pm25 || 0;
  const location = data?.location || 'กำลังโหลด...';
  const currentTime = data?.timestamp 
    ? new Date(data.timestamp).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  return (
    <div className="min-h-screen bg-gradient-sky">
      {/* User Menu */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span className="truncate max-w-[200px]">{authUser?.email}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </div>

      {/* Hero Section - Optimized image loading */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Clean Air" 
          className="w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/80" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2 px-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
              Smart PM2.5 Health
            </h1>
            <p className="text-white/90 drop-shadow-md">
              ระบบเฝ้าระวังคุณภาพอากาศเพื่อสุขภาพที่ดี
            </p>
          </div>
        </div>
      </div>

      {/* Location Monitor Alert - Fixed Position */}
      {currentAlert && (
        <LocationMonitorAlert
          pm25={currentAlert.pm25}
          location={currentAlert.location}
          recommendedOutdoorTime={currentAlert.recommendedOutdoorTime}
          severity={currentAlert.severity}
          onDismiss={clearAlert}
        />
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        {/* Alert Notification */}
        <AlertNotification 
          pm25={pm25Value} 
          location={location}
          hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
        />

        {/* Location Monitoring Toggle */}
        {userProfile && userProfile.conditions.length > 0 && (
          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <div>
                  <Label htmlFor="location-monitor" className="text-base font-semibold cursor-pointer">
                    เฝ้าระวังพื้นที่อัตโนมัติ
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isMonitoring 
                      ? '✅ กำลังติดตามพื้นที่ PM2.5 สูง และจะแจ้งเตือนพร้อมสั่นเครื่อง' 
                      : '❌ ปิดการแจ้งเตือนอัตโนมัติ'}
                  </p>
                </div>
              </div>
              <Switch 
                id="location-monitor"
                checked={monitoringEnabled}
                onCheckedChange={setMonitoringEnabled}
              />
            </div>
          </Card>
        )}

        {/* Mask Confirmation Dialog */}
        <MaskConfirmationDialog
          open={shouldPromptMask}
          pm25={pm25Value}
          faceDetected={maskDetection.faceDetected}
          confidence={maskDetection.confidence}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={refresh}
            variant="outline"
            disabled={loading}
            className="flex-1 min-w-[140px]"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {loading ? 'กำลังอัปเดต...' : 'อัพเดทข้อมูล'}
          </Button>
          {!userProfile && (
            <Button
              onClick={() => setShowProfileForm(true)}
              className="flex-1 min-w-[140px] bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              <User className="w-4 h-4 mr-2" />
              ตั้งค่าโปรไฟล์
            </Button>
          )}
        </div>

        {/* Outdoor Status Indicator */}
        {isOutdoors && (
          <Card className="p-4 bg-orange-500/10 border-orange-500/30">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-orange-500" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-orange-700 dark:text-orange-400">
                  🚶 คุณอยู่นอกบ้าน
                </p>
                
                {isInVehicleOrBuilding && (
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    🚗 ตรวจพบว่าคุณอยู่ในรถ/อาคาร - ปิดการตรวจจับหน้ากาก
                  </p>
                )}
                
                {!isInVehicleOrBuilding && maskDetection.faceDetected && (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      🎥 การตรวจจับด้วยกล้อง: {maskDetection.isWearingMask ? '✅ ใส่หน้ากากแล้ว' : '❌ ไม่ได้ใส่หน้ากาก'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ความแม่นยำ: {Math.round(maskDetection.confidence * 100)}%
                    </p>
                  </div>
                )}
                
                {!isInVehicleOrBuilding && !maskDetection.faceDetected && (
                  <p className="text-sm text-muted-foreground">
                    🎥 กำลังค้นหาใบหน้า...
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* PM2.5 Worsening Indicator */}
        {isWorsening && (
          <Card className="p-4 bg-destructive/10 border-destructive/30 animate-pulse">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-destructive" />
              <div className="flex-1">
                <p className="font-semibold text-destructive">
                  📈 ค่าฝุ่น PM2.5 แย่ลง!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  เพิ่มขึ้น {increase.toFixed(1)} µg/m³ จากค่าก่อนหน้า {previousPM25?.toFixed(1) || 0} µg/m³
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Home Location Setup */}
        <HomeLocationSetup />

        {/* Background Sync Status */}
        <BackgroundSyncStatus />
        
        {/* Auto PHRI Dashboard */}
        <AutoPHRIDashboard />
        
        {/* User Profile Manager */}
        <UserProfileManager />

        {/* Air Quality Card */}
        {loading ? (
          <AirQualityCardSkeleton />
        ) : (
          <AirQualityCard 
            pm25={pm25Value} 
            pm10={data?.pm10}
            no2={data?.no2}
            o3={data?.o3}
            aqi={data?.aqi}
            location={location}
            timestamp={currentTime}
            source={data?.source}
          />
        )}

        {/* PHRI Display */}
        <PHRIDisplay 
          phri={currentPHRI}
        />

        {/* PHRI Comparison */}
        <PHRIComparison />

        {/* User Profile Display or Form */}
        {userProfile && !showProfileForm ? (
          <HealthProfileDisplay 
            profile={userProfile}
            onEdit={handleEditProfile}
          />
        ) : showProfileForm ? (
          <div className="animate-in slide-in-from-top-5 duration-500">
            <HealthProfileForm 
              onSave={handleSaveProfile}
              initialProfile={userProfile || undefined}
            />
          </div>
        ) : null}

        {/* Tabs for AI, Chat, Recommendations, Hospitals, Navigation and PHRI */}
        <Tabs defaultValue="chatbot" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="chatbot">
              <MessageSquare className="w-4 h-4 mr-1" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="phri">
              <Activity className="w-4 h-4 mr-1" />
              PHRI
            </TabsTrigger>
            <TabsTrigger value="ai-advice">AI</TabsTrigger>
            <TabsTrigger value="recommendations">คำแนะนำ</TabsTrigger>
            <TabsTrigger value="hospitals">
              <Hospital className="w-4 h-4 mr-1" />
              โรงพยาบาล
            </TabsTrigger>
            <TabsTrigger value="navigation">
              <Navigation className="w-4 h-4 mr-1" />
              นำทาง
            </TabsTrigger>
          </TabsList>
          <TabsContent value="chatbot" className="mt-4">
            <Suspense fallback={<TabContentSkeleton />}>
              <HealthChatbot 
                pm25={pm25Value}
                temperature={data?.temperature || 0}
                humidity={data?.humidity || 0}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="phri" className="mt-4 space-y-4">
            <Suspense fallback={<TabContentSkeleton />}>
              <PHRICalculator 
                currentAQI={data?.aqi || 0}
                currentPM25={pm25Value}
                currentLocation={location}
                onCalculated={(phri) => setCurrentPHRI(phri)}
              />
              <HealthLogsHistory />
            </Suspense>
          </TabsContent>
          <TabsContent value="ai-advice" className="mt-4">
            <Suspense fallback={<TabContentSkeleton />}>
              <AIHealthAdvice
                pm25={pm25Value}
                temperature={data?.temperature || 0}
                humidity={data?.humidity || 0}
                healthConditions={userProfile?.conditions}
              />
            </Suspense>
          </TabsContent>
          <TabsContent value="recommendations" className="mt-4">
            <HealthRecommendations 
              pm25={pm25Value}
              hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
              userConditions={userProfile?.conditions || []}
            />
          </TabsContent>
          <TabsContent value="hospitals" className="mt-4">
            <Suspense fallback={<TabContentSkeleton />}>
              <NearbyHospitals />
            </Suspense>
          </TabsContent>
          <TabsContent value="navigation" className="mt-4">
            <Suspense fallback={<MapSkeleton />}>
              {currentPosition ? (
                <RouteMap 
                  currentLat={currentPosition.lat}
                  currentLng={currentPosition.lng}
                />
              ) : (
                <MapSkeleton />
              )}
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>ข้อมูลอัพเดทอัตโนมัติทุก 15 นาที</p>
          <p className="text-xs mt-1">
            แหล่งข้อมูล: IQAir API
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
