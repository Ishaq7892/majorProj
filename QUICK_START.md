# Quick Start Guide - Multi-Lane Traffic System

## 🚀 Running the Application

### Prerequisites
- Node.js installed
- Supabase project configured
- Database migrations already applied

### Start Development Server

**Option 1: Using PowerShell (Fix Execution Policy)**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run
npm run dev
```

**Option 2: Using Command Prompt**
```cmd
npm run dev
```

**Option 3: Using Git Bash / WSL**
```bash
npm run dev
```

## 🧪 Testing the Implementation

### Step 1: Access the Application
1. Open browser to `http://localhost:5173` (or the port shown in terminal)
2. Navigate to the home page

### Step 2: Test Circle Areas
Click on any of these pre-configured circular intersections:
- **Mysore Palace Area**
- **Vijayanagar**
- **Bannimantap**

### Step 3: What You Should See

#### Multi-Lane View
Instead of a single traffic status card, you'll see:

```
🚦 Mysore Palace Area
Multi-lane circular intersection - Real-time and predicted traffic

┌─────────────────────┬─────────────────────┐
│ Lane 1 - North Entry│ Lane 2 - East Entry │
│ North               │ East                │
│ 🟡 Moderate Traffic │ 🔴 Heavy Traffic    │
│ 🚗 65 vehicles      │ 🚗 82 vehicles      │
│ 45.5% density       │ 71.2% density       │
│ 35 km/h avg speed   │ 22 km/h avg speed   │
│                     │                     │
│ 📈 Next Hour        │ 📈 Next Hour        │
│ Expected: 72        │ Expected: 88        │
│ 🟡 Moderate (85%)   │ 🔴 Heavy (90%)      │
│ ⬆️ Increasing       │ ⬆️ Increasing       │
├─────────────────────┼─────────────────────┤
│ Lane 3 - South Entry│ Lane 4 - West Entry │
│ South               │ West                │
│ 🟢 Low Traffic      │ 🟡 Moderate Traffic │
│ ... (similar)       │ ... (similar)       │
└─────────────────────┴─────────────────────┘
```

### Step 4: Test Regular Areas
Click on any other area (not a circle):
- Should display the original single traffic status card
- Verifies backward compatibility

## 📊 Understanding the Display

### Color Codes
- 🟢 **Green**: Low Traffic (< 35% density)
- 🟡 **Yellow**: Moderate Traffic (35-65% density)
- 🔴 **Red**: Heavy Traffic (> 65% density)

### Trend Indicators
- ⬆️ **Increasing**: Traffic getting worse in next 3 hours
- ⬇️ **Decreasing**: Traffic getting better
- ➖ **Stable**: Traffic staying same

### Confidence Score
- **>80%**: High confidence (good historical data)
- **50-80%**: Medium confidence
- **<50%**: Low confidence (limited data)

## 🔍 Debugging Tips

### No Data Showing?
1. Check browser console (F12) for errors
2. Verify Supabase connection in `.env`
3. Confirm migrations were applied

### Lanes Not Appearing?
Run this in Supabase SQL editor:
```sql
-- Check if areas are marked as circles
SELECT name, is_circle, lane_count FROM areas;

-- Check if lanes exist
SELECT l.*, a.name as area_name 
FROM lanes l 
JOIN areas a ON l.area_id = a.id;

-- Check if lane traffic data exists
SELECT COUNT(*) FROM lane_traffic_data;
```

### Predictions Not Working?
- Check if historical data exists (at least 24 hours)
- Verify date/time is correct on your system
- Look for errors in browser console

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Run linter (requires execution policy fix)
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 Making Changes

### Add a New Circle Area

1. **In Supabase SQL Editor:**
```sql
-- Find or create the area
INSERT INTO areas (name, region) 
VALUES ('Devegowda Circle', 'Mysore')
RETURNING id;

-- Mark as circle (use the ID from above)
UPDATE areas 
SET is_circle = true, lane_count = 4 
WHERE id = 'your-area-id';

-- Create lanes
INSERT INTO lanes (area_id, lane_position, lane_name, direction) VALUES
  ('your-area-id', 'lane_1', 'Lane 1 - North Entry', 'North'),
  ('your-area-id', 'lane_2', 'Lane 2 - East Entry', 'East'),
  ('your-area-id', 'lane_3', 'Lane 3 - South Entry', 'South'),
  ('your-area-id', 'lane_4', 'Lane 4 - West Entry', 'West');
```

2. **Add Sample Data** (optional):
```sql
-- Get lane IDs
SELECT id, lane_name FROM lanes WHERE area_id = 'your-area-id';

-- Insert sample traffic data
INSERT INTO lane_traffic_data (
  lane_id, timestamp, vehicle_count, 
  traffic_level, density_score, avg_speed
) VALUES
  ('lane-1-id', NOW(), 65, 'medium', 55.0, 35.0),
  ('lane-2-id', NOW(), 82, 'high', 71.0, 22.0),
  ('lane-3-id', NOW(), 28, 'low', 25.0, 48.0),
  ('lane-4-id', NOW(), 54, 'medium', 48.0, 38.0);
```

3. **Navigate to the area** in your browser

## 🎯 Test Scenarios

### Scenario 1: Peak Hour Traffic
- Check predictions during 7-10 AM or 5-8 PM
- Should show higher predicted traffic
- Trends likely showing ⬆️ Increasing

### Scenario 2: Off-Peak Hours
- Check predictions during 2-4 PM
- Should show moderate to low traffic
- More stable trends

### Scenario 3: Data Confidence
- Areas with more historical data → higher confidence
- Newly added areas → lower confidence (30%)

## 📱 Mobile Testing

1. Start dev server with network access:
```bash
npm run dev -- --host
```

2. Access from mobile device:
```
http://YOUR_IP_ADDRESS:5173
```

3. Verify:
- Grid switches to 1 column on mobile
- Cards remain readable
- Touch interactions work

## ❗ Common Issues

### PowerShell Script Execution Error
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port Already in Use
```bash
# Change port in package.json or:
npm run dev -- --port 3000
```

### TypeScript Errors
```bash
# Check types without building
npx tsc --noEmit
```

## 📚 Additional Resources

- See `MULTI_LANE_TRAFFIC_GUIDE.md` for detailed documentation
- See `IMPLEMENTATION_SUMMARY.md` for technical details
- Check Supabase dashboard for database insights

## ✅ Verification Checklist

- [ ] Development server starts without errors
- [ ] Can navigate to Mysore Palace Area
- [ ] See 4 lane cards in a grid
- [ ] Each lane shows traffic level with color
- [ ] Vehicle counts are displayed
- [ ] Predictions appear below current stats
- [ ] Trend indicators show arrows
- [ ] Clicking refresh updates data
- [ ] Mobile view shows single column
- [ ] Regular areas still show single status card

---

**Ready to Go!** 🎉

Your multi-lane traffic system is fully implemented and ready to test. Start with the three pre-configured circle areas, then add more as needed!
