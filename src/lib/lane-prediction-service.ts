import { getLaneTrafficDataForPeriod } from './lane-service';
import { LaneTrafficData, TrafficLevel } from './database.types';

export interface LanePredictionResult {
  laneId: string;
  hour: number;
  predictedVehicleCount: number;
  predictedTrafficLevel: TrafficLevel;
  predictedDensity: number;
  confidence: number;
}

export interface LaneHourlyPrediction {
  hour: number;
  predictedVehicleCount: number;
  predictedTrafficLevel: TrafficLevel;
  predictedDensity: number;
  confidence: number;
}

/**
 * Predict traffic for a specific lane over the next 24 hours
 */
export async function predictLaneTrafficForTime(
  laneId: string,
  targetDate: Date
): Promise<LaneHourlyPrediction[]> {
  // Get historical data for the past 30 days
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 30);
  
  const historicalData = await getLaneTrafficDataForPeriod(laneId, startDate, targetDate);
  
  // Group by hour
  const hourlyData: Map<number, { vehicleCounts: number[]; densities: number[] }> = new Map();
  
  for (const record of historicalData) {
    const hour = new Date(record.timestamp).getHours();
    const existing = hourlyData.get(hour) || { vehicleCounts: [], densities: [] };
    existing.vehicleCounts.push(record.vehicle_count);
    existing.densities.push(record.density_score);
    hourlyData.set(hour, existing);
  }
  
  // Generate predictions for each hour
  const predictions: LaneHourlyPrediction[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData.get(hour);
    
    if (data && data.vehicleCounts.length > 0) {
      // Calculate averages
      const avgVehicleCount = data.vehicleCounts.reduce((a, b) => a + b, 0) / data.vehicleCounts.length;
      const avgDensity = data.densities.reduce((a, b) => a + b, 0) / data.densities.length;
      const variance = calculateVariance(data.densities, avgDensity);
      
      // Apply day-of-week adjustment
      const dayOfWeek = targetDate.getDay();
      let adjustedCount = avgVehicleCount;
      let adjustedDensity = avgDensity;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        adjustedCount *= 0.85; // Weekend reduction
        adjustedDensity *= 0.85;
      }
      
      // Apply time-based patterns
      adjustedCount = applyTimePatterns(adjustedCount, hour);
      adjustedDensity = applyTimePatterns(adjustedDensity, hour);
      
      // Confidence based on data availability and variance
      const confidence = Math.min(
        (data.densities.length / 30) * 0.7 + (1 - Math.min(variance / 100, 1)) * 0.3,
        0.95
      );
      
      predictions.push({
        hour,
        predictedVehicleCount: Math.round(adjustedCount),
        predictedTrafficLevel: calculateLevelFromDensity(adjustedDensity),
        predictedDensity: Math.round(adjustedDensity * 10) / 10,
        confidence: Math.round(confidence * 100) / 100
      });
    } else {
      // No historical data - use typical patterns
      const typicalCount = getTypicalVehicleCountForHour(hour);
      const typicalDensity = getTypicalDensityForHour(hour);
      
      predictions.push({
        hour,
        predictedVehicleCount: typicalCount,
        predictedTrafficLevel: getTypicalLevelForHour(hour),
        predictedDensity: typicalDensity,
        confidence: 0.3
      });
    }
  }
  
  return predictions;
}

/**
 * Predict traffic for multiple lanes
 */
export async function predictMultipleLanes(
  laneIds: string[],
  targetDate: Date
): Promise<Map<string, LaneHourlyPrediction[]>> {
  const predictions = new Map<string, LaneHourlyPrediction[]>();
  
  await Promise.all(
    laneIds.map(async (laneId) => {
      try {
        const lanePredictions = await predictLaneTrafficForTime(laneId, targetDate);
        predictions.set(laneId, lanePredictions);
      } catch (error) {
        console.error(`Error predicting lane ${laneId}:`, error);
        predictions.set(laneId, []);
      }
    })
  );
  
  return predictions;
}

/**
 * Get current prediction for a lane
 */
export async function getCurrentLanePrediction(
  laneId: string
): Promise<LaneHourlyPrediction | null> {
  const now = new Date();
  const predictions = await predictLaneTrafficForTime(laneId, now);
  const currentHour = now.getHours();
  
  return predictions.find(p => p.hour === currentHour) || null;
}

/**
 * Predict congestion trends for the next few hours
 */
export async function predictCongestionTrend(
  laneId: string,
  hoursAhead: number = 3
): Promise<{
  trend: 'increasing' | 'decreasing' | 'stable';
  predictions: LaneHourlyPrediction[];
}> {
  const now = new Date();
  const predictions = await predictLaneTrafficForTime(laneId, now);
  const currentHour = now.getHours();
  
  // Get predictions for next N hours
  const futurePredictions = predictions
    .filter(p => p.hour >= currentHour && p.hour < currentHour + hoursAhead)
    .slice(0, hoursAhead);
  
  if (futurePredictions.length < 2) {
    return { trend: 'stable', predictions: futurePredictions };
  }
  
  // Analyze trend
  const densities = futurePredictions.map(p => p.predictedDensity);
  const avgFirstHalf = densities.slice(0, Math.ceil(densities.length / 2))
    .reduce((a, b) => a + b, 0) / Math.ceil(densities.length / 2);
  const avgSecondHalf = densities.slice(Math.ceil(densities.length / 2))
    .reduce((a, b) => a + b, 0) / Math.floor(densities.length / 2);
  
  const difference = avgSecondHalf - avgFirstHalf;
  
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (difference > 10) {
    trend = 'increasing';
  } else if (difference < -10) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }
  
  return { trend, predictions: futurePredictions };
}

// Helper functions

function calculateVariance(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

function calculateLevelFromDensity(density: number): TrafficLevel {
  if (density < 35) return 'low';
  if (density < 65) return 'medium';
  return 'high';
}

function applyTimePatterns(value: number, hour: number): number {
  // Morning peak (7-9 AM)
  if (hour >= 7 && hour < 10) {
    return value * 1.3;
  }
  // Evening peak (5-8 PM)
  else if (hour >= 17 && hour < 20) {
    return value * 1.4;
  }
  // Lunch time (12-2 PM)
  else if (hour >= 12 && hour < 14) {
    return value * 1.15;
  }
  // Late night (11 PM - 6 AM)
  else if (hour >= 23 || hour < 6) {
    return value * 0.5;
  }
  
  return value;
}

function getTypicalLevelForHour(hour: number): TrafficLevel {
  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
    return 'high';
  } else if (hour >= 22 || hour < 6) {
    return 'low';
  }
  return 'medium';
}

function getTypicalDensityForHour(hour: number): number {
  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
    return 75;
  } else if (hour >= 22 || hour < 6) {
    return 15;
  }
  return 45;
}

function getTypicalVehicleCountForHour(hour: number): number {
  if ((hour >= 7 && hour < 10) || (hour >= 17 && hour < 20)) {
    return 80; // High traffic
  } else if (hour >= 22 || hour < 6) {
    return 15; // Low traffic
  }
  return 50; // Medium traffic
}
