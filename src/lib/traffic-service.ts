import { supabase } from "@/integrations/supabase/client";
import { Area, TrafficData, TrafficLevel, UserUpload, TrafficAnalytics } from "./database.types";

// Helper function to extract coordinates from PostGIS POINT
function extractCoordinates(coordinates: unknown): { latitude: number; longitude: number } | null {
  if (!coordinates) return null;
  
  // PostGIS POINT format: "POINT(longitude latitude)"
  if (typeof coordinates === 'string') {
    const match = coordinates.match(/POINT\(([\d.-]+)\s+([\d.-]+)\)/);
    if (match) {
      return {
        longitude: parseFloat(match[1]),
        latitude: parseFloat(match[2])
      };
    }
  }
  
  // If coordinates is already an object with x, y properties
  if (typeof coordinates === 'object' && 'x' in coordinates && 'y' in coordinates) {
    return {
      longitude: coordinates.x,
      latitude: coordinates.y
    };
  }
  
  return null;
}

// Areas
export async function getAreas(): Promise<Area[]> {
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .order("name");

  if (error) throw error;
  
  // Extract coordinates from PostGIS POINT format
  return (data || []).map(area => {
    const coords = extractCoordinates(area.coordinates);
    return {
      ...area,
      latitude: coords?.latitude,
      longitude: coords?.longitude
    };
  });
}

export async function getAreaByName(name: string): Promise<Area | null> {
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    // Use partial match to tolerate minor naming differences
    .ilike("name", `%${name}%`)
    .order("name")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) return null;
  
  // Extract coordinates from PostGIS POINT format
  const coords = extractCoordinates(data.coordinates);
  return {
    ...data,
    latitude: coords?.latitude,
    longitude: coords?.longitude
  };
}

// Traffic Data
export async function getLatestTrafficData(areaId: string): Promise<TrafficData | null> {
  const { data, error } = await supabase
    .from("traffic_data")
    .select("*")
    .eq("area_id", areaId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTrafficDataForPeriod(
  areaId: string,
  startDate: Date,
  endDate: Date
): Promise<TrafficData[]> {
  const { data, error } = await supabase
    .from("traffic_data")
    .select("*")
    .eq("area_id", areaId)
    .gte("timestamp", startDate.toISOString())
    .lte("timestamp", endDate.toISOString())
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function insertTrafficData(
  userId: string,
  records: Omit<TrafficData, "id" | "created_at">[]
): Promise<void> {
  const { error } = await supabase.rpc('insert_traffic_data_from_upload', {
    p_user_id: userId,
    p_records: records
  });

  if (error) throw error;
}

// Calculate traffic level based on density score with contextual adjustments
export function calculateTrafficLevel(
  densityScore: number, 
  timestamp?: Date,
  areaType?: string
): TrafficLevel {
  let adjustedScore = densityScore;
  
  // Time-based adjustments (peak hours)
  if (timestamp) {
    const hour = timestamp.getHours();
    const day = timestamp.getDay();
    
    // Morning peak (7 AM - 10 AM)
    if (hour >= 7 && hour < 10) {
      adjustedScore *= 1.3; // 30% increase during morning rush
    }
    // Evening peak (5 PM - 8 PM)
    else if (hour >= 17 && hour < 20) {
      adjustedScore *= 1.4; // 40% increase during evening rush
    }
    // Lunch time (12 PM - 2 PM)
    else if (hour >= 12 && hour < 14) {
      adjustedScore *= 1.15; // 15% increase during lunch
    }
    // Late night (11 PM - 6 AM)
    else if (hour >= 23 || hour < 6) {
      adjustedScore *= 0.5; // 50% reduction at night
    }
    
    // Weekend adjustments
    if (day === 0 || day === 6) { // Sunday or Saturday
      adjustedScore *= 0.85; // 15% reduction on weekends
    }
  }
  
  // Area type adjustments
  if (areaType) {
    switch (areaType) {
      case 'highway':
        adjustedScore *= 1.1; // Highways typically have higher flow
        break;
      case 'residential':
        adjustedScore *= 0.9; // Residential areas typically calmer
        break;
      case 'commercial':
        adjustedScore *= 1.15; // Commercial areas busier
        break;
      case 'tourist':
        // Tourist areas vary by weekend
        if (timestamp) {
          const day = timestamp.getDay();
          if (day === 0 || day === 6) {
            adjustedScore *= 1.2; // Busier on weekends
          }
        }
        break;
    }
  }
  
  // Cap the adjusted score
  adjustedScore = Math.min(adjustedScore, 100);
  
  // Determine traffic level with realistic thresholds
  if (adjustedScore < 35) return 'low';
  if (adjustedScore < 65) return 'medium';
  return 'high';
}

// User Uploads
export async function createUserUpload(
  userId: string,
  filename: string,
  filePath: string
): Promise<string> {
  const { data, error } = await supabase
    .from("user_uploads")
    .insert({
      user_id: userId,
      filename,
      file_path: filePath,
      status: 'pending'
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateUploadStatus(
  uploadId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const { error } = await supabase
    .from("user_uploads")
    .update({ status, error_message: errorMessage })
    .eq("id", uploadId);

  if (error) throw error;
}

export async function getUserUploads(userId: string): Promise<UserUpload[]> {
  const { data, error } = await supabase
    .from("user_uploads")
    .select("*")
    .eq("user_id", userId)
    .order("upload_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Traffic Analytics
export async function getTrafficAnalytics(
  areaId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TrafficAnalytics[]> {
  let query = supabase
    .from("traffic_analytics")
    .select("*")
    .eq("area_id", areaId);

  if (startDate) {
    query = query.gte("analysis_date", startDate.toISOString().split('T')[0]);
  }
  if (endDate) {
    query = query.lte("analysis_date", endDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query.order("analysis_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function generateAnalytics(areaId: string, date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all traffic data for the day
  const trafficData = await getTrafficDataForPeriod(areaId, startOfDay, endOfDay);

  if (trafficData.length === 0) return;

  // Calculate analytics
  const hourlyData = new Map<number, { total: number; count: number }>();
  let totalDensity = 0;

  trafficData.forEach((record) => {
    const hour = new Date(record.timestamp).getHours();
    const current = hourlyData.get(hour) || { total: 0, count: 0 };
    hourlyData.set(hour, {
      total: current.total + record.density_score,
      count: current.count + 1,
    });
    totalDensity += record.density_score;
  });

  // Calculate peak hours
  const peakHours = Array.from(hourlyData.entries())
    .map(([hour, data]) => ({
      hour,
      density: data.total / data.count,
    }))
    .sort((a, b) => b.density - a.density);

  // Find busiest and quietest times
  const busiestHour = peakHours[0]?.hour;
  const quietestHour = peakHours[peakHours.length - 1]?.hour;

  // Insert or update analytics using secure function
  const { error } = await supabase.rpc('generate_analytics_safe', {
    p_area_id: areaId,
    p_analysis_date: date.toISOString().split('T')[0],
    p_peak_hours: peakHours,
    p_avg_density: totalDensity / trafficData.length,
    p_busiest_time: busiestHour !== undefined ? `${busiestHour.toString().padStart(2, '0')}:00` : null,
    p_quietest_time: quietestHour !== undefined ? `${quietestHour.toString().padStart(2, '0')}:00` : null,
    p_total_records: trafficData.length,
  });

  if (error) throw error;
}
