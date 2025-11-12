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
    const IQAIR_API_KEY = Deno.env.get('IQAIR_API_KEY');
    const OWM_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!IQAIR_API_KEY) {
      throw new Error('IQAIR_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from IQAir - more accurate for Thailand
    const iqairResponse = await fetch(
      `https://api.airvisual.com/v2/nearest_city?lat=${latitude}&lon=${longitude}&key=${IQAIR_API_KEY}`
    );

    if (!iqairResponse.ok) {
      const errorText = await iqairResponse.text();
      console.error('IQAir API error:', iqairResponse.status, errorText);
      throw new Error(`IQAir API error: ${iqairResponse.status}`);
    }

    const iqairData = await iqairResponse.json();
    console.log('IQAir data received:', iqairData);

    if (iqairData.status !== 'success') {
      throw new Error(`IQAir API error: ${iqairData.data || 'Unknown error'}`);
    }

    const { data } = iqairData;
    
    // Extract PM2.5 from IQAir - this is real-time data from government stations
    const pm25 = data.current?.pollution?.aqius 
      ? Math.round(data.current.pollution.aqius * 0.84) // Convert US AQI to µg/m³ approximation
      : data.current?.pollution?.p2?.conc || 0;
    
    // Extract location
    const location = `${data.city || 'Unknown'}, ${data.country || ''}`;
    
    // Extract timestamp from IQAir or use current time
    const timestamp = data.current?.pollution?.ts || new Date().toISOString();

    // Get temperature and humidity from IQAir if available, otherwise use OpenWeatherMap as fallback
    let temperature = data.current?.weather?.tp || null;
    let humidity = data.current?.weather?.hu || null;

    // Fallback to OpenWeatherMap for weather data if not available from IQAir
    if (temperature === null || humidity === null) {
      if (OWM_API_KEY) {
        try {
          const owmWeatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}&units=metric`
          );
          
          if (owmWeatherResponse.ok) {
            const owmWeatherData = await owmWeatherResponse.json();
            temperature = temperature ?? Math.round(owmWeatherData.main?.temp || 25);
            humidity = humidity ?? Math.round(owmWeatherData.main?.humidity || 60);
          }
        } catch (owmError) {
          console.error('OpenWeatherMap fallback error:', owmError);
        }
      }
      
      // Final fallback to default values
      temperature = temperature ?? 25;
      humidity = humidity ?? 60;
    } else {
      temperature = Math.round(temperature);
      humidity = Math.round(humidity);
    }
    
    console.log('Processed data from IQAir:', { pm25, location, temperature, humidity, timestamp });
    
    return new Response(
      JSON.stringify({
        pm25: Math.round(pm25),
        location,
        timestamp,
        temperature,
        humidity,
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
