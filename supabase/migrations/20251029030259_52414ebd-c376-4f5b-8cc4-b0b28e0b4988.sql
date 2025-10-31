-- Remove existing demo areas
DELETE FROM public.areas WHERE region IN ('Central', 'North', 'East', 'West', 'South');

-- Insert Mysore areas
INSERT INTO public.areas (name, region, coordinates) VALUES
  ('Mysore Palace Area', 'Central Mysore', POINT(76.6548, 12.3052)),
  ('Gokulam', 'North Mysore', POINT(76.6387, 12.2919)),
  ('Jayalakshmipuram', 'North Mysore', POINT(76.6294, 12.3377)),
  ('Vijayanagar', 'East Mysore', POINT(76.6747, 12.3214)),
  ('KRS Road', 'South Mysore', POINT(76.5750, 12.2514)),
  ('Chamundi Hill Road', 'South Mysore', POINT(76.6729, 12.2726)),
  ('Bannimantap', 'Central Mysore', POINT(76.6497, 12.3139)),
  ('Kuvempunagar', 'West Mysore', POINT(76.6019, 12.3214)),
  ('Hebbal', 'East Mysore', POINT(76.6847, 12.3305)),
  ('Saraswathipuram', 'North Mysore', POINT(76.6347, 12.3447));