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
    const OWM_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

    if (!OWM_API_KEY) {
      throw new Error('OPENWEATHER_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from OpenWeatherMap
    const owmAirResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}`
    );

    if (!owmAirResponse.ok) {
      const errorText = await owmAirResponse.text();
      console.error('OpenWeatherMap air quality API error:', owmAirResponse.status, errorText);
      throw new Error(`OpenWeatherMap API error: ${owmAirResponse.status}`);
    }

    const owmAirData = await owmAirResponse.json();
    console.log('OpenWeatherMap air quality data received:', owmAirData);

    // Fetch weather data for temperature and humidity
    const owmWeatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OWM_API_KEY}&units=metric`
    );

    if (!owmWeatherResponse.ok) {
      const errorText = await owmWeatherResponse.text();
      console.error('OpenWeatherMap weather API error:', owmWeatherResponse.status, errorText);
      throw new Error(`OpenWeatherMap weather API error: ${owmWeatherResponse.status}`);
    }

    const owmWeatherData = await owmWeatherResponse.json();
    console.log('OpenWeatherMap weather data received:', owmWeatherData);

    // Extract PM2.5 from OpenWeatherMap air quality data
    const pm25 = owmAirData.list?.[0]?.components?.pm2_5 || 0;
    
    // Extract location
    const location = owmWeatherData.name || 'Unknown Location';
    
    // Extract timestamp
    const timestamp = new Date().toISOString();

    // Get temperature and humidity from OpenWeatherMap weather data
    const temperature = Math.round(owmWeatherData.main?.temp || 25);
    const humidity = Math.round(owmWeatherData.main?.humidity || 60);
    
    console.log('Processed data:', { pm25, location, temperature, humidity });
    
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
