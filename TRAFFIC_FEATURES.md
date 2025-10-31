# AI Traffic Management System - Advanced Features

## 🚦 Realistic Traffic Level Prediction

The system now uses intelligent algorithms to predict traffic levels (Clear/Moderate/Heavy) based on multiple factors:

### Dynamic Traffic Calculation

Traffic levels are calculated using:
1. **Base Density Score** (0-100 from camera data)
2. **Time-based Adjustments**
3. **Area Type Characteristics**
4. **Day of Week Patterns**

### Traffic Level Thresholds
- **Clear (Low)**: Density < 35%
- **Moderate (Medium)**: Density 35-65%
- **Heavy (High)**: Density > 65%

### Time-Based Multipliers

#### Peak Hours
- **Morning Rush (7 AM - 10 AM)**: +30% density
- **Evening Rush (5 PM - 8 PM)**: +40% density
- **Lunch Time (12 PM - 2 PM)**: +15% density
- **Late Night (11 PM - 6 AM)**: -50% density

#### Weekend Adjustments
- **Saturday/Sunday**: -15% density (less commuter traffic)

### Area Type Adjustments

Different area types have characteristic traffic patterns:

| Area Type | Adjustment | Examples |
|-----------|-----------|----------|
| **Highway** | +10% | KRS Road |
| **Commercial** | +15% | Vijayanagar |
| **Residential** | -10% | Gokulam, Saraswathipuram |
| **Tourist** | +20% on weekends | Chamundi Hill Road |
| **Central** | Normal | Mysore Palace Area |

---

## 🗺️ Intelligent Area Mapping

Upload data from **any city** (e.g., Bangalore, Delhi) and the system automatically maps it to Mysore areas!

### How It Works

The system uses semantic analysis to match external area names to Mysore locations based on:

1. **Name Similarity**: Direct or partial name matches
2. **Keyword Matching**: Area characteristics (highway, residential, commercial, etc.)
3. **Pattern Recognition**: Common naming patterns
4. **Confidence Scoring**: Each mapping includes a confidence percentage

### Mapping Examples

#### Bangalore Areas → Mysore
- "MG Road" → **Mysore Palace Area** (central pattern)
- "Outer Ring Road" → **KRS Road** (highway pattern)
- "Whitefield" → **Hebbal** (industrial pattern)
- "Koramangala" → **Vijayanagar** (commercial pattern)
- "Jayanagar" → **Gokulam** (residential pattern)
- "Silk Board" → **Bannimantap** (junction pattern)

#### Generic Names → Mysore
- "Downtown" → **Mysore Palace Area**
- "Highway 101" → **KRS Road**
- "Shopping District" → **Vijayanagar**
- "Residential Layout" → **Gokulam**
- "Temple Road" → **Chamundi Hill Road**

### Mapping Algorithm

```typescript
// Example mapping
mapAreaToMysore("Bangalore MG Road")
// Returns:
{
  externalName: "Bangalore MG Road",
  mappedArea: "Mysore Palace Area",
  confidence: 0.85,
  reason: "central area pattern"
}
```

---

## 📊 Excel Upload with Auto-Mapping

### Supported Formats
- `.xlsx` and `.xls` files
- Maximum size: 20MB
- Required columns: `area`, `timestamp`, `density`

### Column Format
```
| area                | timestamp            | density |
|---------------------|---------------------|---------|
| MG Road             | 2025-01-29 08:30:00 | 72.5    |
| Residential Layout  | 2025-01-29 11:00:00 | 38.2    |
| Highway Express     | 2025-01-29 18:30:00 | 85.3    |
```

### Auto-Mapping Process

1. **Upload File**: User uploads Excel with external area names
2. **Parse Data**: System extracts area, timestamp, and density
3. **Map Areas**: Each external area is mapped to Mysore
4. **Show Results**: Toast notification shows mapping summary
5. **Store Data**: Traffic data is saved with proper Mysore areas
6. **Generate Analytics**: System creates traffic analytics automatically

### Example Upload Flow

```
Upload: bangalore_traffic.xlsx

Data:
- Silk Board, 2025-01-29 08:00, 78
- Whitefield, 2025-01-29 09:00, 65
- MG Road, 2025-01-29 10:00, 82

Mapping:
✓ Silk Board → Bannimantap (75% confidence)
✓ Whitefield → Hebbal (85% confidence)
✓ MG Road → Mysore Palace Area (90% confidence)

Result: 3 records mapped and saved successfully!
```

---

## 🎯 Realistic Traffic Scenarios

### Sample Data Generation

Download the sample Excel template to see realistic traffic patterns:

```javascript
// Sample includes:
- Morning rush: High traffic (70-95% density)
- Midday: Moderate traffic (40-60% density)  
- Afternoon: Low traffic (20-40% density)
- Evening rush: High traffic (70-90% density)
- Night: Low traffic (5-30% density)
```

### Testing Different Scenarios

#### Scenario 1: Morning Commute
```excel
Area: KRS Road
Time: 8:30 AM
Density: 75
Result: HIGH (traffic multiplier applied)
```

#### Scenario 2: Weekend Tourist Area
```excel
Area: Chamundi Hill Road
Time: Saturday 2:00 PM
Density: 50
Result: MODERATE-HIGH (weekend tourist boost)
```

#### Scenario 3: Late Night
```excel
Area: Mysore Palace Area
Time: 11:30 PM
Density: 60
Result: LOW (night reduction applied)
```

---

## 🔧 Technical Implementation

### Files Modified/Added

1. **area-mapper.ts** - Intelligent area mapping service
2. **traffic-service.ts** - Enhanced traffic calculation
3. **excel-parser.ts** - Updated parser with realistic samples
4. **Upload.tsx** - Integration with area mapper
5. **Migration SQL** - Realistic sample data

### API Endpoints Used

- `getAreas()` - Fetch Mysore area list
- `mapAreaToMysore(name)` - Map external to Mysore area
- `calculateTrafficLevel(density, time, type)` - Calculate traffic
- `insertTrafficData(records)` - Save traffic data

---

## 📝 Usage Guide

### For Administrators

1. **Upload Traffic Data**
   - Navigate to Upload page
   - Download sample template (optional)
   - Upload your Excel file
   - System automatically maps and saves data

2. **View Results**
   - Check traffic status on dashboard
   - Different areas show Clear/Moderate/Heavy
   - View analytics for patterns

### For Developers

```typescript
import { mapAreaToMysore } from '@/lib/area-mapper';
import { calculateTrafficLevel } from '@/lib/traffic-service';

// Map external area
const mapping = mapAreaToMysore("Bangalore Silk Board");
console.log(mapping.mappedArea); // "Bannimantap"

// Calculate traffic with context
const level = calculateTrafficLevel(
  65,                    // density score
  new Date(),           // current time
  'commercial'          // area type
);
console.log(level); // "high" or "medium" or "low"
```

---

## 🎨 Visual Indicators

### Traffic Level Colors
- 🟢 **Clear**: Green - Roads flowing smoothly
- 🟡 **Moderate**: Yellow - Some delays expected
- 🔴 **Heavy**: Red - Significant congestion

### Dashboard Display
Each area card shows:
- Current traffic level with color coding
- Density score percentage
- Area name with map
- Last updated timestamp

---

## 🚀 Future Enhancements

- [ ] AI-based prediction for future traffic
- [ ] Real-time camera integration
- [ ] Mobile app with notifications
- [ ] Route optimization suggestions
- [ ] Historical trend analysis
- [ ] Weather-based adjustments
