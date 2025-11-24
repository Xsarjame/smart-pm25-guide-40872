-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  age INTEGER,
  gender TEXT,
  chronic_diseases TEXT[] DEFAULT '{}',
  sensitivity_level TEXT DEFAULT 'normal',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Enhance health_logs table with new fields
ALTER TABLE public.health_logs
  ADD COLUMN IF NOT EXISTS pm10 NUMERIC,
  ADD COLUMN IF NOT EXISTS co NUMERIC,
  ADD COLUMN IF NOT EXISTS no2 NUMERIC,
  ADD COLUMN IF NOT EXISTS o3 NUMERIC,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
  ADD COLUMN IF NOT EXISTS movement_state TEXT,
  ADD COLUMN IF NOT EXISTS is_exercising BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_health_logs_user_date ON public.health_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Trigger for updating user_profiles updated_at
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();