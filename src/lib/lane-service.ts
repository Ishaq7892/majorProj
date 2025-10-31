import { supabase } from "@/integrations/supabase/client";
import { Lane, LaneTrafficData, LanePrediction, TrafficLevel } from "./database.types";

/**
 * Fetch all lanes for a specific area
 */
export async function getLanesByAreaId(areaId: string): Promise<Lane[]> {
  const { data, error } = await supabase
    .from("lanes")
    .select("*")
    .eq("area_id", areaId)
    .order("lane_position");

  if (error) throw error;
  return data || [];
}

/**
 * Get the latest traffic data for a specific lane
 */
export async function getLatestLaneTrafficData(laneId: string): Promise<LaneTrafficData | null> {
  const { data, error } = await supabase
    .from("lane_traffic_data")
    .select("*")
    .eq("lane_id", laneId)
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get latest traffic data for all lanes in an area
 */
export async function getLatestLaneTrafficDataForArea(areaId: string): Promise<Map<string, LaneTrafficData>> {
  const lanes = await getLanesByAreaId(areaId);
  const trafficDataMap = new Map<string, LaneTrafficData>();

  await Promise.all(
    lanes.map(async (lane) => {
      const latestData = await getLatestLaneTrafficData(lane.id);
      if (latestData) {
        trafficDataMap.set(lane.id, latestData);
      }
    })
  );

  return trafficDataMap;
}

/**
 * Get historical traffic data for a lane within a date range
 */
export async function getLaneTrafficDataForPeriod(
  laneId: string,
  startDate: Date,
  endDate: Date
): Promise<LaneTrafficData[]> {
  const { data, error } = await supabase
    .from("lane_traffic_data")
    .select("*")
    .eq("lane_id", laneId)
    .gte("timestamp", startDate.toISOString())
    .lte("timestamp", endDate.toISOString())
    .order("timestamp", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get predictions for a specific lane
 */
export async function getLanePredictions(
  laneId: string,
  horizon: number = 60
): Promise<LanePrediction[]> {
  const { data, error } = await supabase
    .from("lane_predictions")
    .select("*")
    .eq("lane_id", laneId)
    .eq("prediction_horizon", horizon)
    .gte("prediction_time", new Date().toISOString())
    .order("prediction_time", { ascending: true })
    .limit(24);

  if (error) throw error;
  return data || [];
}

/**
 * Insert lane traffic data from uploads
 */
export async function insertLaneTrafficData(
  userId: string,
  records: Omit<LaneTrafficData, "id" | "created_at">[]
): Promise<void> {
  const { error } = await supabase.rpc('insert_lane_traffic_data', {
    p_user_id: userId,
    p_records: records
  });

  if (error) throw error;
}

/**
 * Generate prediction for a lane
 */
export async function generateLanePrediction(
  laneId: string,
  predictionTime: Date,
  horizon: number,
  predictedCount: number,
  predictedLevel: TrafficLevel,
  predictedDensity: number,
  confidence: number
): Promise<void> {
  const { error } = await supabase.rpc('generate_lane_predictions', {
    p_lane_id: laneId,
    p_prediction_time: predictionTime.toISOString(),
    p_horizon: horizon,
    p_predicted_count: predictedCount,
    p_predicted_level: predictedLevel,
    p_predicted_density: predictedDensity,
    p_confidence: confidence
  });

  if (error) throw error;
}

/**
 * Calculate aggregate traffic level for all lanes in a circle
 */
export function calculateCircleTrafficLevel(
  laneTrafficData: LaneTrafficData[]
): TrafficLevel {
  if (laneTrafficData.length === 0) return 'medium';

  const avgDensity = laneTrafficData.reduce((sum, data) => sum + data.density_score, 0) / laneTrafficData.length;

  if (avgDensity < 35) return 'low';
  if (avgDensity < 65) return 'medium';
  return 'high';
}
