import { useState, useEffect } from "react";
import { AirQualityCard } from "@/components/AirQualityCard";
import { HealthProfileForm, UserHealthProfile } from "@/components/HealthProfileForm";
import { HealthProfileDisplay } from "@/components/HealthProfileDisplay";
import { HealthRecommendations } from "@/components/HealthRecommendations";
import { AlertNotification } from "@/components/AlertNotification";
import { NearbyHospitals } from "@/components/NearbyHospitals";
import { AIHealthAdvice } from "@/components/AIHealthAdvice";
import { RouteMap } from "@/components/RouteMap";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, RefreshCw, User, Hospital, Loader2, Navigation } from "lucide-react";
import heroImage from "@/assets/hero-clean-air.jpg";
import { useAirQuality } from "@/hooks/useAirQuality";
import { Geolocation } from '@capacitor/geolocation';

const Index = () => {
  const { data, loading, refresh } = useAirQuality();
  const [userProfile, setUserProfile] = useState<UserHealthProfile | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

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
        const position = await Geolocation.getCurrentPosition();
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      } catch (error) {
        console.error('Error getting position:', error);
      }
    };
    getCurrentPos();
  }, []);

  const handleSaveProfile = (profile: UserHealthProfile) => {
    setUserProfile(profile);
    localStorage.setItem('healthProfile', JSON.stringify(profile));
    setShowProfileForm(false);
  };

  const handleEditProfile = () => {
    setShowProfileForm(true);
  };

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
      {/* Hero Section */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img 
          src={heroImage} 
          alt="Clean Air" 
          className="w-full h-full object-cover"
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

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-6 max-w-4xl">
        {/* Alert Notification */}
        <AlertNotification 
          pm25={pm25Value} 
          location={location}
          hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
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

        {/* Air Quality Card */}
        <AirQualityCard 
          pm25={pm25Value} 
          location={location}
          timestamp={currentTime}
        />

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

        {/* Tabs for AI, Recommendations, Hospitals, and Navigation */}
        <Tabs defaultValue="ai-advice" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
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
          <TabsContent value="ai-advice" className="mt-4">
            <AIHealthAdvice
              pm25={pm25Value}
              temperature={data?.temperature || 0}
              humidity={data?.humidity || 0}
              healthConditions={userProfile?.conditions}
            />
          </TabsContent>
          <TabsContent value="recommendations" className="mt-4">
            <HealthRecommendations 
              pm25={pm25Value}
              hasHealthConditions={userProfile !== null && userProfile.conditions.length > 0}
              userConditions={userProfile?.conditions || []}
            />
          </TabsContent>
          <TabsContent value="hospitals" className="mt-4">
            <NearbyHospitals />
          </TabsContent>
          <TabsContent value="navigation" className="mt-4">
            {currentPosition ? (
              <RouteMap 
                currentLat={currentPosition.lat}
                currentLng={currentPosition.lng}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                กำลังโหลดตำแหน่ง...
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Info Footer */}
        <div className="text-center text-sm text-muted-foreground py-4">
          <p>ข้อมูลอัพเดทอัตโนมัติทุก 5 นาที</p>
          <p className="text-xs mt-1">
            แหล่งข้อมูล: กรมควบคุมมลพิษ
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
