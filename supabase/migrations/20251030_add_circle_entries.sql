-- Seed specified circles into areas table and mark them as circles
-- If an entry already exists by name, update its circle flags

INSERT INTO public.areas (name, region, coordinates, is_circle, lane_count)
VALUES
  ('Devegowda Circle', 'Central Mysore', NULL, true, 4),
  ('Metagalli Signal Junction', 'North/East Mysore', NULL, true, 4),
  ('LIC Circle', 'Central Mysore', NULL, true, 4),
  ('Krishnarajendra Circle Post Office', 'Central Mysore', NULL, true, 4),
  ('Basavanahalli Junction', 'South/West Mysore', NULL, true, 4)
ON CONFLICT (name) DO UPDATE
SET is_circle = EXCLUDED.is_circle,
    lane_count = EXCLUDED.lane_count;

-- Optional: ensure existing traffic analytics or lane defaults can later attach
-- Lanes are inserted by the multi-lane support migration for areas with is_circle = true