-- Add wearing_mask column to health_logs table
ALTER TABLE public.health_logs 
ADD COLUMN wearing_mask boolean DEFAULT false;

-- Add comment to explain the column
COMMENT ON COLUMN public.health_logs.wearing_mask IS 'ระบุว่าผู้ใช้ใส่หน้ากากหรือไม่เมื่ออยู่กลางแจ้ง';