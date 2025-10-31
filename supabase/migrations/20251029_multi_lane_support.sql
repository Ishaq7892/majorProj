-- Multi-Lane Traffic Management System
-- Support for circular intersections with multiple lanes

-- Create enum for lane positions
CREATE TYPE lane_position AS ENUM ('lane_1', 'lane_2', 'lane_3', 'lane_4');

-- Create lanes table
CREATE TABLE public.lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
  lane_position lane_position NOT NULL,
  lane_name TEXT NOT NULL, -- e.g., "To MG Road", "To Palace", "To Mall"
  direction TEXT, -- e.g., "North", "East", "South", "West"
  max_capacity INTEGER DEFAULT 100, -- Maximum vehicles per minute
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (area_id, lane_position)
);

-- Create lane_traffic_data table
CREATE TABLE public.lane_traffic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vehicle_count INTEGER NOT NULL CHECK (vehicle_count >= 0),
  traffic_level traffic_level NOT NULL,
  density_score NUMERIC NOT NULL CHECK (density_score >= 0 AND density_score <= 100),
  avg_speed NUMERIC, -- Average speed in km/h
  congestion_index NUMERIC CHECK (congestion_index >= 0 AND congestion_index <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lane_predictions table for AI predictions
CREATE TABLE public.lane_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE NOT NULL,
  prediction_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_vehicle_count INTEGER NOT NULL,
  predicted_traffic_level traffic_level NOT NULL,
  predicted_density NUMERIC NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  prediction_horizon INTEGER NOT NULL, -- Minutes ahead (5, 15, 30, 60)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_lanes_area ON public.lanes(area_id);
CREATE INDEX idx_lane_traffic_lane_time ON public.lane_traffic_data(lane_id, timestamp DESC);
CREATE INDEX idx_lane_predictions_lane_time ON public.lane_predictions(lane_id, prediction_time DESC);

-- Enable RLS
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lane_traffic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lane_predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lanes
CREATE POLICY "Lanes are viewable by everyone"
ON public.lanes FOR SELECT USING (true);

CREATE POLICY "Only system can insert lanes"
ON public.lanes FOR INSERT WITH CHECK (false);

-- RLS Policies for lane_traffic_data
CREATE POLICY "Lane traffic data is viewable by everyone"
ON public.lane_traffic_data FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert lane traffic data"
ON public.lane_traffic_data FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_uploads 
    WHERE user_id = auth.uid() 
    AND status = 'processing'
    AND created_at > NOW() - INTERVAL '1 hour'
  )
);

-- RLS Policies for lane_predictions
CREATE POLICY "Lane predictions are viewable by everyone"
ON public.lane_predictions FOR SELECT USING (true);

CREATE POLICY "Only system can insert predictions"
ON public.lane_predictions FOR INSERT WITH CHECK (false);

-- Mark specific areas as circular intersections
ALTER TABLE public.areas ADD COLUMN is_circle BOOLEAN DEFAULT false;
ALTER TABLE public.areas ADD COLUMN lane_count INTEGER DEFAULT 0;

-- Update existing areas - mark circles
UPDATE public.areas 
SET is_circle = true, lane_count = 4 
WHERE name IN (
  'Mysore Palace Area',
  'Vijayanagar',
  'Bannimantap'
);

-- Function to insert lane traffic data from uploads
CREATE OR REPLACE FUNCTION public.insert_lane_traffic_data(
  p_user_id UUID,
  p_records JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record JSONB;
  v_upload_active BOOLEAN;
BEGIN
  -- Verify user has an active upload
  SELECT EXISTS(
    SELECT 1 FROM public.user_uploads 
    WHERE user_id = p_user_id 
    AND status = 'processing'
    AND created_at > NOW() - INTERVAL '1 hour'
  ) INTO v_upload_active;
  
  IF NOT v_upload_active THEN
    RAISE EXCEPTION 'No active upload found for user';
  END IF;
  
  -- Insert validated records
  FOR v_record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO public.lane_traffic_data (
      lane_id,
      timestamp,
      vehicle_count,
      traffic_level,
      density_score,
      avg_speed,
      congestion_index
    ) VALUES (
      (v_record->>'lane_id')::UUID,
      (v_record->>'timestamp')::TIMESTAMP WITH TIME ZONE,
      (v_record->>'vehicle_count')::INTEGER,
      (v_record->>'traffic_level')::traffic_level,
      (v_record->>'density_score')::NUMERIC,
      (v_record->>'avg_speed')::NUMERIC,
      (v_record->>'congestion_index')::NUMERIC
    );
  END LOOP;
END;
$$;

-- Function to generate lane predictions
CREATE OR REPLACE FUNCTION public.generate_lane_predictions(
  p_lane_id UUID,
  p_prediction_time TIMESTAMP WITH TIME ZONE,
  p_horizon INTEGER,
  p_predicted_count INTEGER,
  p_predicted_level traffic_level,
  p_predicted_density NUMERIC,
  p_confidence NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.lane_predictions (
    lane_id,
    prediction_time,
    predicted_vehicle_count,
    predicted_traffic_level,
    predicted_density,
    confidence_score,
    prediction_horizon
  ) VALUES (
    p_lane_id,
    p_prediction_time,
    p_predicted_count,
    p_predicted_level,
    p_predicted_density,
    p_confidence,
    p_horizon
  );
END;
$$;

-- Insert default lanes for circular intersections
DO $$
DECLARE
  v_area RECORD;
BEGIN
  FOR v_area IN SELECT id, name FROM public.areas WHERE is_circle = true
  LOOP
    -- Lane 1
    INSERT INTO public.lanes (area_id, lane_position, lane_name, direction)
    VALUES (v_area.id, 'lane_1', 'Lane 1 - North Entry', 'North');
    
    -- Lane 2
    INSERT INTO public.lanes (area_id, lane_position, lane_name, direction)
    VALUES (v_area.id, 'lane_2', 'Lane 2 - East Entry', 'East');
    
    -- Lane 3
    INSERT INTO public.lanes (area_id, lane_position, lane_name, direction)
    VALUES (v_area.id, 'lane_3', 'Lane 3 - South Entry', 'South');
    
    -- Lane 4
    INSERT INTO public.lanes (area_id, lane_position, lane_name, direction)
    VALUES (v_area.id, 'lane_4', 'Lane 4 - West Entry', 'West');
  END LOOP;
END $$;

-- Insert sample lane traffic data for testing
DO $$
DECLARE
  v_lane RECORD;
  v_hour INTEGER;
  v_vehicle_count INTEGER;
  v_density NUMERIC;
  v_traffic_level traffic_level;
BEGIN
  FOR v_lane IN SELECT id FROM public.lanes
  LOOP
    -- Generate data for past 24 hours
    FOR v_hour IN 0..23
    LOOP
      -- Simulate realistic vehicle counts based on time
      v_vehicle_count := CASE
        WHEN v_hour BETWEEN 7 AND 9 THEN 70 + FLOOR(RANDOM() * 30)::INTEGER
        WHEN v_hour BETWEEN 17 AND 19 THEN 80 + FLOOR(RANDOM() * 20)::INTEGER
        WHEN v_hour BETWEEN 22 AND 23 OR v_hour BETWEEN 0 AND 5 THEN 10 + FLOOR(RANDOM() * 15)::INTEGER
        ELSE 40 + FLOOR(RANDOM() * 30)::INTEGER
      END;
      
      v_density := (v_vehicle_count::NUMERIC / 100) * 100;
      
      v_traffic_level := CASE
        WHEN v_density < 35 THEN 'low'
        WHEN v_density < 65 THEN 'medium'
        ELSE 'high'
      END;
      
      INSERT INTO public.lane_traffic_data (
        lane_id,
        timestamp,
        vehicle_count,
        traffic_level,
        density_score,
        avg_speed,
        congestion_index
      ) VALUES (
        v_lane.id,
        NOW() - INTERVAL '1 day' + (v_hour || ' hours')::INTERVAL,
        v_vehicle_count,
        v_traffic_level,
        v_density,
        CASE 
          WHEN v_density < 35 THEN 50 + RANDOM() * 20
          WHEN v_density < 65 THEN 30 + RANDOM() * 20
          ELSE 10 + RANDOM() * 20
        END,
        v_density / 10
      );
    END LOOP;
  END LOOP;
END $$;
