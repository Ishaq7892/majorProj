# 🚀 Setup Instructions - Apply Multi-Lane Traffic Migration

## The Issue
The code for multi-lane traffic is already in your project, but the **database doesn't have the new tables yet**. That's why you're not seeing any changes on the website.

## ✅ Quick Fix (3 Steps)

### Step 1: Open Supabase
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Click on your project
3. Click on **"SQL Editor"** in the left sidebar

### Step 2: Run the Migration
1. Open the file `APPLY_MIGRATION.sql` (in this folder)
2. **Copy the ENTIRE contents** of that file
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

**Wait for it to complete** - you should see a success message and a result table showing your circle areas.

### Step 3: Refresh Your Website
1. Go back to your browser where the dev server is running
2. Press **F5** to refresh the page
3. Click on **"Mysore Palace Area"**, **"Vijayanagar"**, **"Bannimantap"**, or **"Devegowda Circle"**

## 🎉 What You Should See Now

Instead of a single traffic card, you'll see **4 lane cards** in a grid:

```
┌──────────────────────────┬──────────────────────────┐
│ Lane 1: Moderate Traffic │ Lane 2: Heavy Traffic    │
│ 🚗 65 vehicles           │ 🚗 82 vehicles           │
│ 55% density              │ 71% density              │
│ 35 km/h speed            │ 22 km/h speed            │
│ ⬆️ Increasing            │ ⬆️ Increasing            │
├──────────────────────────┼──────────────────────────┤
│ Lane 3: Low Traffic      │ Lane 4: Moderate Traffic │
│ 🚗 28 vehicles           │ 🚗 54 vehicles           │
│ 25% density              │ 48% density              │
│ 48 km/h speed            │ 38 km/h speed            │
│ ⬇️ Decreasing            │ ➖ Stable                │
└──────────────────────────┴──────────────────────────┘
```

## 📋 What the Migration Does

1. ✅ Creates `lanes` table
2. ✅ Creates `lane_traffic_data` table  
3. ✅ Creates `lane_predictions` table
4. ✅ Adds `is_circle` and `lane_count` fields to areas
5. ✅ Marks 4 areas as circles (including Devegowda Circle)
6. ✅ Creates 4 lanes for each circle (North, East, South, West)
7. ✅ Inserts 24 hours of sample traffic data for each lane
8. ✅ Sets up all necessary permissions (RLS policies)

## 🔍 Verification

After running the migration, you can verify it worked by running this query in Supabase SQL Editor:

```sql
-- Check circle areas
SELECT name, is_circle, lane_count 
FROM areas 
WHERE is_circle = true;

-- Check lanes created
SELECT a.name, l.lane_name, l.direction
FROM lanes l
JOIN areas a ON l.area_id = a.id
ORDER BY a.name, l.lane_position;

-- Check traffic data
SELECT COUNT(*) as total_records
FROM lane_traffic_data;
```

You should see:
- 4 circle areas listed
- 16 lanes total (4 per circle)
- 384+ traffic data records (16 lanes × 24 hours)

## ❌ Troubleshooting

### "relation already exists" error?
This means the migration was already partially applied. That's OK! The script uses `IF NOT EXISTS` so it won't break anything.

### Still not seeing changes?
1. **Hard refresh** your browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
2. Check browser console (F12) for errors
3. Verify the migration ran successfully in Supabase
4. Make sure dev server is still running (`npm run dev`)

### "areas" table not found?
Your main migration might not have run. Go to Supabase → SQL Editor and run:
```sql
SELECT * FROM areas LIMIT 5;
```
If this fails, you need to apply the base migrations first.

## 🎯 After Setup

Once the migration is applied:

1. **Test all circle areas** - Each should show 4 lanes
2. **Test regular areas** - Should still show single status (backward compatible)
3. **Check predictions** - Should show next hour forecast for each lane
4. **Check trends** - Should show ⬆️/⬇️/➖ indicators

## 📝 Adding More Circles

To add more circular intersections later:

```sql
-- 1. Mark existing area as circle
UPDATE areas 
SET is_circle = true, lane_count = 4 
WHERE name = 'Your Area Name';

-- 2. Create lanes (get area_id first)
INSERT INTO lanes (area_id, lane_position, lane_name, direction) 
SELECT 
  id,
  'lane_1'::lane_position,
  'Lane 1 - North Entry',
  'North'
FROM areas WHERE name = 'Your Area Name'
UNION ALL
-- repeat for lane_2, lane_3, lane_4...
```

## 🆘 Need Help?

If you're still having issues:
1. Check that Supabase connection is working (check `.env` file)
2. Verify you're logged into the correct Supabase project
3. Look for errors in browser console (F12)
4. Check Supabase logs for database errors

---

**Remember**: The code is already in your project. You just need to apply the database migration once, and everything will work! 🎉
