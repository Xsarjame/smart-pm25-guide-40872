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
    const AQICN_API_KEY = Deno.env.get('AQICN_API_KEY');

    if (!AQICN_API_KEY) {
      throw new Error('AQICN_API_KEY is not configured');
    }

    console.log('Fetching air quality data for:', { latitude, longitude });

    // Fetch air quality data from AQICN (World Air Quality Index)
    const aqicnResponse = await fetch(
      `https://api.waqi.info/feed/geo:${latitude};${longitude}/?token=${AQICN_API_KEY}`
    );

    if (!aqicnResponse.ok) {
      const errorText = await aqicnResponse.text();
      console.error('AQICN API error:', aqicnResponse.status, errorText);
      throw new Error(`AQICN API error: ${aqicnResponse.status}`);
    }

    const aqicnData = await aqicnResponse.json();
    console.log('AQICN data received:', aqicnData);

    if (aqicnData.status !== 'ok') {
      throw new Error(`AQICN API error: ${aqicnData.data || 'Unknown error'}`);
    }

    const { data } = aqicnData;

    // Extract PM2.5 from AQICN data
    const pm25 = data.iaqi?.pm25?.v || data.aqi || 0;
    
    // Extract location
    const location = data.city?.name || 'Unknown Location';
    
    // Extract timestamp
    const timestamp = data.time?.iso || new Date().toISOString();

    // Get temperature and humidity from AQICN if available
    let temperature = data.iaqi?.t?.v || 25;
    let humidity = data.iaqi?.h?.v || 60;

    // Round values
    temperature = Math.round(temperature);
    humidity = Math.round(humidity);
    
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
