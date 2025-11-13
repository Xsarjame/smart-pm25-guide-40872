-- Create health_logs table for tracking daily health data
CREATE TABLE public.health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  aqi INTEGER NOT NULL,
  pm25 DECIMAL(10,2) NOT NULL,
  outdoor_time INTEGER NOT NULL, -- minutes spent outdoors
  age INTEGER NOT NULL,
  gender TEXT,
  has_symptoms BOOLEAN DEFAULT false,
  symptoms TEXT[], -- array of symptoms
  phri DECIMAL(10,2) NOT NULL, -- Personal Health Risk Index
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own health logs" 
ON public.health_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health logs" 
ON public.health_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health logs" 
ON public.health_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health logs" 
ON public.health_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_health_logs_user_date ON public.health_logs(user_id, log_date DESC);