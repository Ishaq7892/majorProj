-- Add realistic traffic data with varied levels (low, medium, high)
-- This creates a more realistic testing scenario

-- Function to insert sample traffic data
DO $$
DECLARE
  v_area_ids UUID[];
  v_area_id UUID;
  v_now TIMESTAMP := NOW();
  v_time TIMESTAMP;
  v_density NUMERIC;
  v_traffic_level traffic_level;
BEGIN
  -- Get all area IDs
  SELECT ARRAY_AGG(id) INTO v_area_ids FROM public.areas;
  
  -- Insert varied traffic data for the past 24 hours
  FOREACH v_area_id IN ARRAY v_area_ids
  LOOP
    -- Morning rush hour (7-9 AM) - HIGH TRAFFIC
    FOR i IN 0..11 LOOP
      v_time := v_now - INTERVAL '1 day' + INTERVAL '7 hours' + (i * INTERVAL '10 minutes');
      v_density := 65 + (RANDOM() * 30); -- 65-95% density
      
      IF v_density < 35 THEN v_traffic_level := 'low';
      ELSIF v_density < 65 THEN v_traffic_level := 'medium';
      ELSE v_traffic_level := 'high';
      END IF;
      
      INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
      VALUES (v_area_id, v_time, v_traffic_level, v_density);
    END LOOP;
    
    -- Mid-morning (10 AM - 12 PM) - MODERATE TRAFFIC
    FOR i IN 0..11 LOOP
      v_time := v_now - INTERVAL '1 day' + INTERVAL '10 hours' + (i * INTERVAL '10 minutes');
      v_density := 40 + (RANDOM() * 30); -- 40-70% density
      
      IF v_density < 35 THEN v_traffic_level := 'low';
      ELSIF v_density < 65 THEN v_traffic_level := 'medium';
      ELSE v_traffic_level := 'high';
      END IF;
      
      INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
      VALUES (v_area_id, v_time, v_traffic_level, v_density);
    END LOOP;
    
    -- Afternoon (2-4 PM) - LOW TO MODERATE TRAFFIC
    FOR i IN 0..11 LOOP
      v_time := v_now - INTERVAL '1 day' + INTERVAL '14 hours' + (i * INTERVAL '10 minutes');
      v_density := 20 + (RANDOM() * 35); -- 20-55% density
      
      IF v_density < 35 THEN v_traffic_level := 'low';
      ELSIF v_density < 65 THEN v_traffic_level := 'medium';
      ELSE v_traffic_level := 'high';
      END IF;
      
      INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
      VALUES (v_area_id, v_time, v_traffic_level, v_density);
    END LOOP;
    
    -- Evening rush hour (5-8 PM) - HIGH TRAFFIC
    FOR i IN 0..17 LOOP
      v_time := v_now - INTERVAL '1 day' + INTERVAL '17 hours' + (i * INTERVAL '10 minutes');
      v_density := 70 + (RANDOM() * 25); -- 70-95% density
      
      IF v_density < 35 THEN v_traffic_level := 'low';
      ELSIF v_density < 65 THEN v_traffic_level := 'medium';
      ELSE v_traffic_level := 'high';
      END IF;
      
      INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
      VALUES (v_area_id, v_time, v_traffic_level, v_density);
    END LOOP;
    
    -- Night (10 PM - 6 AM) - LOW TRAFFIC
    FOR i IN 0..47 LOOP
      v_time := v_now - INTERVAL '1 day' + INTERVAL '22 hours' + (i * INTERVAL '10 minutes');
      v_density := 5 + (RANDOM() * 25); -- 5-30% density
      
      IF v_density < 35 THEN v_traffic_level := 'low';
      ELSIF v_density < 65 THEN v_traffic_level := 'medium';
      ELSE v_traffic_level := 'high';
      END IF;
      
      INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
      VALUES (v_area_id, v_time, v_traffic_level, v_density);
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Successfully inserted realistic traffic data for all areas';
END $$;

-- Insert current moment data with varied levels
INSERT INTO public.traffic_data (area_id, timestamp, traffic_level, density_score)
SELECT 
  id,
  NOW(),
  CASE 
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 7 AND 9 THEN 'high'
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 17 AND 20 THEN 'high'
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 22 AND 23 OR EXTRACT(HOUR FROM NOW()) BETWEEN 0 AND 6 THEN 'low'
    ELSE 'medium'
  END,
  CASE 
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 7 AND 9 THEN 70 + (RANDOM() * 25)
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 17 AND 20 THEN 75 + (RANDOM() * 20)
    WHEN EXTRACT(HOUR FROM NOW()) BETWEEN 22 AND 23 OR EXTRACT(HOUR FROM NOW()) BETWEEN 0 AND 6 THEN 10 + (RANDOM() * 20)
    ELSE 40 + (RANDOM() * 30)
  END
FROM public.areas;
