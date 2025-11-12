import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from Open-Meteo (no API key required!)
    const airQualityUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&timezone=auto&domains=cams_global`;
    
    const airQualityResponse = await fetch(airQualityUrl);

    if (!airQualityResponse.ok) {
      const errorText = await airQualityResponse.text();
      console.error('Open-Meteo air quality API error:', airQualityResponse.status, errorText);
      throw new Error(`Open-Meteo API error: ${airQualityResponse.status}`);
    }

    const airQualityData = await airQualityResponse.json();
    console.log('Open-Meteo air quality data received:', airQualityData);

    // Fetch weather data for temperature and humidity from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&timezone=auto`;
    
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.error('Open-Meteo weather API error:', weatherResponse.status, errorText);
      throw new Error(`Open-Meteo weather API error: ${weatherResponse.status}`);
    }

    const weatherData = await weatherResponse.json();
    console.log('Open-Meteo weather data received:', weatherData);

    // Fetch location name from Nominatim (OpenStreetMap)
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=th`;
    
    let location = 'Unknown Location';
    try {
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'AirQualityApp/1.0'
        }
      });
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        // Try to get district, city, or village name in Thai
        location = geocodeData.address?.suburb || 
                   geocodeData.address?.city || 
                   geocodeData.address?.town || 
                   geocodeData.address?.village || 
                   geocodeData.display_name?.split(',')[0] || 
                   'Unknown Location';
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      location = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    }

    // Extract air quality data from Open-Meteo
    const current = airQualityData.current || {};
    
    const pm25 = Math.round(current.pm2_5 || 0);
    const pm10 = Math.round(current.pm10 || 0);
    const no2 = Math.round(current.nitrogen_dioxide || 0);
    const o3 = Math.round(current.ozone || 0);
    const so2 = Math.round(current.sulphur_dioxide || 0);
    const co = Math.round(current.carbon_monoxide || 0);
    
    // Calculate AQI based on PM2.5 (US EPA standard)
    let aqi = 1;
    if (pm25 <= 12) aqi = 1;
    else if (pm25 <= 35.4) aqi = 2;
    else if (pm25 <= 55.4) aqi = 3;
    else if (pm25 <= 150.4) aqi = 4;
    else aqi = 5;
    
    const timestamp = new Date().toISOString();

    // Get temperature and humidity from Open-Meteo weather data
    const temperature = Math.round(weatherData.current?.temperature_2m || 25);
    const humidity = Math.round(weatherData.current?.relative_humidity_2m || 60);
    
    console.log('Processed data:', { 
      pm25, pm10, no2, o3, so2, co, aqi,
      location, temperature, humidity 
    });
    
    return new Response(
      JSON.stringify({
        pm25,
        pm10,
        no2,
        o3,
        so2,
        co,
        aqi,
        location,
        timestamp,
        temperature,
        humidity,
        source: 'Open-Meteo (CAMS Global)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-air-quality function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
