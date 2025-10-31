# Multi-Lane Traffic System Guide

## Overview

The multi-lane traffic system extends the traffic monitoring application to support circular intersections (like Devegowda Circle) with individual lane tracking, real-time monitoring, and AI-powered predictions.

## Features

### 1. Individual Lane Tracking
- **4-Lane Support**: Each circular intersection has 4 separate lanes (typically North, East, South, West entries)
- **Lane-Specific Data**: 
  - Vehicle count per lane
  - Traffic density percentage
  - Average speed (km/h)
  - Congestion index
  - Real-time traffic level (Low/Moderate/Heavy)

### 2. Visual Indicators
Each lane card displays:
- **Traffic Level Badge**: Color-coded (Green=Low, Yellow=Moderate, Red=Heavy)
- **Vehicle Count**: Current number of vehicles
- **Density Score**: Percentage representation of congestion
- **Average Speed**: Current average speed in km/h

### 3. AI Prediction Model

#### Prediction Algorithm
The system uses historical pattern analysis to predict:
- **Vehicle Count**: Expected number of vehicles in the next hour
- **Traffic Level**: Predicted congestion (Low/Moderate/Heavy)
- **Density**: Predicted congestion percentage
- **Confidence Score**: Reliability of the prediction (0-100%)

#### Prediction Features
- **24-Hour Forecasts**: Hourly predictions for the entire day
- **Pattern Recognition**: Learns from 30 days of historical data
- **Time-Based Adjustments**:
  - Morning peak (7-10 AM): +30% traffic
  - Evening peak (5-8 PM): +40% traffic
  - Lunch time (12-2 PM): +15% traffic
  - Late night (11 PM-6 AM): -50% traffic
- **Day-of-Week Adjustments**: Weekend traffic reduced by 15%

#### Trend Analysis
Each lane shows a trend indicator:
- **⬆️ Increasing**: Traffic expected to worsen in next 3 hours
- **⬇️ Decreasing**: Traffic expected to improve
- **➖ Stable**: Traffic levels expected to remain constant

### 4. Real-Time Updates
- Automatic data refresh
- Live traffic status per lane
- Instant prediction updates

## Database Schema

### Tables

#### `lanes`
Stores lane configuration for circular intersections:
```sql
- id: UUID (primary key)
- area_id: UUID (references areas)
- lane_position: ENUM (lane_1, lane_2, lane_3, lane_4)
- lane_name: TEXT (e.g., "Lane 1 - North Entry")
- direction: TEXT (e.g., "North", "East")
- max_capacity: INTEGER (vehicles per minute)
```

#### `lane_traffic_data`
Stores real-time traffic data for each lane:
```sql
- id: UUID (primary key)
- lane_id: UUID (references lanes)
- timestamp: TIMESTAMPTZ
- vehicle_count: INTEGER
- traffic_level: ENUM (low, medium, high)
- density_score: NUMERIC (0-100)
- avg_speed: NUMERIC (km/h)
- congestion_index: NUMERIC (0-10)
```

#### `lane_predictions`
Stores AI-generated predictions:
```sql
- id: UUID (primary key)
- lane_id: UUID (references lanes)
- prediction_time: TIMESTAMPTZ
- predicted_vehicle_count: INTEGER
- predicted_traffic_level: ENUM (low, medium, high)
- predicted_density: NUMERIC (0-100)
- confidence_score: NUMERIC (0-1)
- prediction_horizon: INTEGER (minutes ahead)
```

## Frontend Components

### 1. `LaneCard.tsx`
Individual lane display component showing:
- Lane name and direction
- Current traffic status
- Vehicle count and density
- Average speed
- Next hour prediction
- Trend indicator

### 2. `MultiLaneTrafficCard.tsx`
Container component displaying all 4 lanes in a grid layout for circular intersections.

### 3. Updated `TrafficStatus.tsx`
Main page that:
- Detects if area is a circular intersection
- Loads lane-specific data if applicable
- Shows multi-lane view for circles
- Falls back to single status for regular areas

## Backend Services

### 1. `lane-service.ts`
Core functions for lane data management:
- `getLanesByAreaId()`: Fetch all lanes for an area
- `getLatestLaneTrafficData()`: Get current traffic data for a lane
- `getLatestLaneTrafficDataForArea()`: Get traffic data for all lanes
- `getLaneTrafficDataForPeriod()`: Historical data retrieval
- `insertLaneTrafficData()`: Upload new traffic data

### 2. `lane-prediction-service.ts`
AI prediction engine:
- `predictLaneTrafficForTime()`: Generate 24-hour predictions
- `predictMultipleLanes()`: Batch predictions for multiple lanes
- `getCurrentLanePrediction()`: Get current hour prediction
- `predictCongestionTrend()`: Calculate traffic trend (3-hour forecast)

## Usage

### Viewing Multi-Lane Traffic
1. Navigate to a circular intersection (e.g., Mysore Palace Area, Vijayanagar, Bannimantap)
2. The system automatically detects it's a circle and displays the multi-lane view
3. Each lane shows its individual traffic conditions
4. Predictions appear below current stats for each lane

### Understanding the Display

**Lane Card Example:**
```
Lane 1 - North Entry        [🔴]
North

🟡 Moderate Traffic

🚗 65 vehicles    45.5% density
35 km/h avg speed

📈 Next Hour Prediction
Expected Vehicles: 72
Expected Density: 52.3%
🟡 Moderate Traffic (85% confidence)
⬆️ Increasing
```

### Adding New Circular Intersections

1. **Mark area as circle** in database:
```sql
UPDATE areas 
SET is_circle = true, lane_count = 4 
WHERE name = 'Your Circle Name';
```

2. **Create lanes** (automatically done by migration):
```sql
INSERT INTO lanes (area_id, lane_position, lane_name, direction)
VALUES 
  (area_id, 'lane_1', 'Lane 1 - North Entry', 'North'),
  (area_id, 'lane_2', 'Lane 2 - East Entry', 'East'),
  (area_id, 'lane_3', 'Lane 3 - South Entry', 'South'),
  (area_id, 'lane_4', 'Lane 4 - West Entry', 'West');
```

3. **Upload traffic data** using the upload feature with lane-specific information

## Data Upload Format

When uploading data for multi-lane areas, include:
```json
{
  "lane_id": "uuid-of-lane",
  "timestamp": "2025-10-29T10:30:00Z",
  "vehicle_count": 75,
  "traffic_level": "high",
  "density_score": 68.5,
  "avg_speed": 28.5,
  "congestion_index": 7.2
}
```

## API Integration

### Fetch Lane Data
```typescript
import { getLanesByAreaId, getLatestLaneTrafficDataForArea } from '@/lib/lane-service';

const lanes = await getLanesByAreaId(areaId);
const trafficData = await getLatestLaneTrafficDataForArea(areaId);
```

### Generate Predictions
```typescript
import { predictMultipleLanes } from '@/lib/lane-prediction-service';

const laneIds = lanes.map(l => l.id);
const predictions = await predictMultipleLanes(laneIds, new Date());
```

## Prediction Model Details

### Data Requirements
- Minimum 7 days of historical data for basic predictions
- Optimal: 30 days of historical data for accurate predictions
- Falls back to typical patterns if insufficient data

### Confidence Scoring
```
Confidence = (data_availability × 0.7) + (low_variance × 0.3)

Where:
- data_availability = (number_of_records / 30) capped at 0.95
- low_variance = 1 - min(variance / 100, 1)
```

### Traffic Level Thresholds
- **Low**: Density < 35%
- **Moderate**: Density 35-65%
- **Heavy**: Density > 65%

## Performance Considerations

- Predictions are cached for the current hour
- Lane data is fetched in parallel for optimal performance
- Historical data queries are limited to 30-day windows
- Indexes on `lane_id` and `timestamp` ensure fast queries

## Future Enhancements

Potential improvements:
1. Machine learning model training on historical patterns
2. Weather impact integration
3. Special event detection
4. Real-time camera feed integration
5. Mobile app push notifications for predicted heavy traffic
6. Route optimization based on lane predictions

## Troubleshooting

### No Lane Data Displayed
- Verify area has `is_circle = true` and `lane_count > 0`
- Check if lanes exist in `lanes` table for the area
- Ensure traffic data has been uploaded for lanes

### Low Prediction Confidence
- Upload more historical data (aim for 30 days)
- Ensure data consistency across different times of day
- Verify timestamps are accurate

### Predictions Not Updating
- Check browser console for errors
- Verify API connectivity to Supabase
- Ensure lane IDs are correct
