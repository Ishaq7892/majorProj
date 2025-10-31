-- Create enum for traffic levels
CREATE TYPE public.traffic_level AS ENUM ('low', 'medium', 'high');

-- Create enum for upload status
CREATE TYPE public.upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create areas table
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  coordinates POINT,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on areas
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Areas are viewable by everyone
CREATE POLICY "Areas are viewable by everyone"
ON public.areas
FOR SELECT
USING (true);

-- Only authenticated users can manage areas
CREATE POLICY "Authenticated users can insert areas"
ON public.areas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create traffic_data table
CREATE TABLE public.traffic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  traffic_level public.traffic_level NOT NULL,
  density_score NUMERIC(5,2) NOT NULL CHECK (density_score >= 0 AND density_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on traffic_data
ALTER TABLE public.traffic_data ENABLE ROW LEVEL SECURITY;

-- Traffic data is viewable by everyone
CREATE POLICY "Traffic data is viewable by everyone"
ON public.traffic_data
FOR SELECT
USING (true);

-- Authenticated users can insert traffic data
CREATE POLICY "Authenticated users can insert traffic data"
ON public.traffic_data
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_traffic_data_area_timestamp ON public.traffic_data(area_id, timestamp DESC);
CREATE INDEX idx_traffic_data_timestamp ON public.traffic_data(timestamp DESC);

-- Create user_uploads table
CREATE TABLE public.user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status public.upload_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_uploads
ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
CREATE POLICY "Users can view their own uploads"
ON public.user_uploads
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert their own uploads"
ON public.user_uploads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own uploads
CREATE POLICY "Users can update their own uploads"
ON public.user_uploads
FOR UPDATE
USING (auth.uid() = user_id);

-- Create traffic_analytics table
CREATE TABLE public.traffic_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
  analysis_date DATE NOT NULL,
  peak_hours JSONB,
  avg_density NUMERIC(5,2),
  busiest_time TIME,
  quietest_time TIME,
  total_records INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(area_id, analysis_date)
);

-- Enable RLS on traffic_analytics
ALTER TABLE public.traffic_analytics ENABLE ROW LEVEL SECURITY;

-- Analytics are viewable by everyone
CREATE POLICY "Analytics are viewable by everyone"
ON public.traffic_analytics
FOR SELECT
USING (true);

-- Authenticated users can manage analytics
CREATE POLICY "Authenticated users can insert analytics"
ON public.traffic_analytics
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update analytics"
ON public.traffic_analytics
FOR UPDATE
TO authenticated
USING (true);

-- Create index for analytics queries
CREATE INDEX idx_traffic_analytics_area_date ON public.traffic_analytics(area_id, analysis_date DESC);

-- Insert sample areas
INSERT INTO public.areas (name, region) VALUES
  ('Downtown', 'Central'),
  ('Highway 101', 'North'),
  ('Main Street', 'East'),
  ('Airport Road', 'West'),
  ('University Ave', 'South');

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'traffic-uploads',
  'traffic-uploads',
  false,
  20971520,
  ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv']
);

-- Storage policies for uploads bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'traffic-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'traffic-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'traffic-uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);