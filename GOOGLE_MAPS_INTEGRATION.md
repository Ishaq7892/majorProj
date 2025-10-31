# Google Maps Integration Guide

## Overview
The Google Maps integration in this AI Traffic Management System displays live location markers based on latitude and longitude values fetched from the backend (Supabase).

## How It Works

### 1. Database Structure
The `areas` table in Supabase stores location data with PostGIS POINT coordinates:
```sql
CREATE TABLE areas (
  id UUID PRIMARY KEY,
  name TEXT,
  region TEXT,
  coordinates POINT -- Format: POINT(longitude latitude)
);
```

### 2. Backend Service (`traffic-service.ts`)
The service extracts coordinates from PostGIS POINT format and adds them to the Area object:
```typescript
const coords = extractCoordinates(area.coordinates);
return {
  ...area,
  latitude: coords?.latitude,
  longitude: coords?.longitude
};
```

### 3. Map Component (`MapComponent.tsx`)
The MapComponent accepts latitude and longitude props:
```typescript
<MapComponent 
  area="Mysore Palace Area"
  trafficLevel="moderate"
  latitude={12.3052}
  longitude={76.6548}
/>
```

### 4. View Details Page (`TrafficStatus.tsx`)
The TrafficStatus page fetches area data and passes coordinates to the map:
```typescript
const areaData = await getAreaByName(areaName);
setLatitude(areaData.latitude);
setLongitude(areaData.longitude);

// Later in render:
<MapComponent 
  area={areaName} 
  trafficLevel={trafficLevel}
  latitude={latitude}
  longitude={longitude}
/>
```

## Features
- **Live Coordinates**: Maps display exact locations based on backend lat/lng
- **Fallback Geocoding**: If coordinates aren't available, falls back to address-based geocoding
- **Traffic Layer**: Shows live Google Maps traffic overlay
- **Interactive Controls**: Zoom, street view, and fullscreen controls
- **Marker Animation**: Animated marker drop at the location
- **External Link**: Quick link to open location in full Google Maps

## API Key
The Google Maps API key is stored in `MapComponent.tsx`:
```typescript
const GOOGLE_MAPS_API_KEY = "AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8";
```

**Note**: For production, move this to environment variables:
```env
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

## Usage Example

### Displaying a Map with Backend Data
```typescript
import { MapComponent } from "@/components/map/MapComponent";
import { getAreaByName } from "@/lib/traffic-service";

function MyComponent() {
  const [area, setArea] = useState(null);

  useEffect(() => {
    const loadArea = async () => {
      const data = await getAreaByName("Gokulam");
      setArea(data);
    };
    loadArea();
  }, []);

  return (
    <MapComponent 
      area={area?.name || "Loading..."}
      latitude={area?.latitude}
      longitude={area?.longitude}
      trafficLevel="clear"
    />
  );
}
```

### Adding New Areas to Database
To add new areas with coordinates, insert into Supabase:
```sql
INSERT INTO areas (name, region, coordinates) VALUES
  ('New Area', 'Region Name', POINT(longitude, latitude));
```

Example for Mysore areas:
```sql
INSERT INTO areas (name, region, coordinates) VALUES
  ('Mysore Palace Area', 'Central Mysore', POINT(76.6548, 12.3052)),
  ('Gokulam', 'North Mysore', POINT(76.6387, 12.2919));
```

## Benefits
1. **Accuracy**: Uses exact coordinates from your database
2. **Performance**: No need to geocode on every map load
3. **Reliability**: Doesn't depend on geocoding API availability
4. **Control**: You manage the exact locations displayed
5. **Fallback**: Still works with geocoding if coordinates are missing

## Troubleshooting

### Map Not Loading
- Check that Google Maps API key is valid
- Ensure the API has Maps JavaScript API enabled
- Check browser console for errors

### Wrong Location Displayed
- Verify coordinates in database are in correct format: POINT(longitude latitude)
- Note: PostGIS uses (lng, lat) order, not (lat, lng)
- Check that `extractCoordinates()` function is working correctly

### No Coordinates Available
The system will automatically fall back to geocoding the area name. Make sure area names are descriptive (e.g., "Gokulam, Mysore" instead of just "Area 1").

