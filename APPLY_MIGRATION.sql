-- ============================================
-- MULTI-LANE TRAFFIC SYSTEM - MANUAL MIGRATION
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Step 1: Create lane position enum
DO $$ BEGIN
  CREATE TYPE lane_position AS ENUM ('lane_1', 'lane_2', 'lane_3', 'lane_4');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Create lanes table
CREATE TABLE IF NOT EXISTS public.lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
  lane_position lane_position NOT NULL,
  lane_name TEXT NOT NULL,
  direction TEXT,
  max_capacity INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (area_id, lane_position)
);

-- Step 3: Create lane_traffic_data table
CREATE TABLE IF NOT EXISTS public.lane_traffic_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vehicle_count INTEGER NOT NULL CHECK (vehicle_count >= 0),
  traffic_level traffic_level NOT NULL,
  density_score NUMERIC NOT NULL CHECK (density_score >= 0 AND density_score <= 100),
  avg_speed NUMERIC,
  congestion_index NUMERIC CHECK (congestion_index >= 0 AND congestion_index <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Create lane_predictions table
CREATE TABLE IF NOT EXISTS public.lane_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES public.lanes(id) ON DELETE CASCADE NOT NULL,
  prediction_time TIMESTAMP WITH TIME ZONE NOT NULL,
  predicted_vehicle_count INTEGER NOT NULL,
  predicted_traffic_level traffic_level NOT NULL,
  predicted_density NUMERIC NOT NULL,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  prediction_horizon INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_lanes_area ON public.lanes(area_id);
CREATE INDEX IF NOT EXISTS idx_lane_traffic_lane_time ON public.lane_traffic_data(lane_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lane_predictions_lane_time ON public.lane_predictions(lane_id, prediction_time DESC);

-- Step 6: Enable RLS
ALTER TABLE public.lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lane_traffic_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lane_predictions ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
DROP POLICY IF EXISTS "Lanes are viewable by everyone" ON public.lanes;
CREATE POLICY "Lanes are viewable by everyone"
ON public.lanes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only system can insert lanes" ON public.lanes;
CREATE POLICY "Only system can insert lanes"
ON public.lanes FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS "Lane traffic data is viewable by everyone" ON public.lane_traffic_data;
CREATE POLICY "Lane traffic data is viewable by everyone"
ON public.lane_traffic_data FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert lane traffic data" ON public.lane_traffic_data;
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

DROP POLICY IF EXISTS "Lane predictions are viewable by everyone" ON public.lane_predictions;
CREATE POLICY "Lane predictions are viewable by everyone"
ON public.lane_predictions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only system can insert predictions" ON public.lane_predictions;
CREATE POLICY "Only system can insert predictions"
ON public.lane_predictions FOR INSERT WITH CHECK (false);

-- Step 8: Add circle fields to areas table
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS is_circle BOOLEAN DEFAULT false;
ALTER TABLE public.areas ADD COLUMN IF NOT EXISTS lane_count INTEGER DEFAULT 0;

-- Step 9: Mark specific areas as circular intersections
UPDATE public.areas 
SET is_circle = true, lane_count = 4 
WHERE name IN (
  'Mysore Palace Area',
  'Vijayanagar',
  'Bannimantap',
  'Devegowda Circle'
);

-- Step 10: Create function for inserting lane traffic data
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
  SELECT EXISTS(
    SELECT 1 FROM public.user_uploads 
    WHERE user_id = p_user_id 
    AND status = 'processing'
    AND created_at > NOW() - INTERVAL '1 hour'
  ) INTO v_upload_active;
  
  IF NOT v_upload_active THEN
    RAISE EXCEPTION 'No active upload found for user';
  END IF;
  
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

-- Step 11: Create function for generating predictions
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

-- Step 12: Insert default lanes for circular intersections
DO $$
DECLARE
  v_area RECORD;
BEGIN
  FOR v_area IN SELECT id, name FROM public.areas WHERE is_circle = true
  LOOP
    -- Delete existing lanes to avoid duplicates
    DELETE FROM public.lanes WHERE area_id = v_area.id;
    
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

-- Step 13: Insert sample lane traffic data
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

-- Step 14: Verify the data
SELECT 
  a.name as area_name,
  a.is_circle,
  a.lane_count,
  COUNT(l.id) as lanes_created
FROM areas a
LEFT JOIN lanes l ON l.area_id = a.id
WHERE a.is_circle = true
GROUP BY a.id, a.name, a.is_circle, a.lane_count;

-- If you see results above, the migration was successful!
-- You should see 4 lanes for each circle area.
