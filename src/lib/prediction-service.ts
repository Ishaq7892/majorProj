import { getTrafficDataForPeriod, getAreas, getAreaByName } from './traffic-service';
import { Area, TrafficData, TrafficLevel } from './database.types';
import { getAreaCharacteristics, mapAreaToMysore } from './area-mapper';

export interface HourlyPrediction {
  hour: number;
  predicted_level: TrafficLevel;
  predicted_density: number;
  confidence: number;
}

export interface WeeklyPattern {
  day: string;
  dayIndex: number;
  avgDensity: number;
  peakHour: number;
  trafficLevel: TrafficLevel;
}

export interface RouteRecommendation {
  area: string;
  areaId: string;
  currentLevel: TrafficLevel;
  predictedLevel: TrafficLevel;
  recommendation: 'avoid' | 'proceed' | 'ideal';
  reason: string;
  alternativeRoutes?: string[];
}

/**
 * Predict traffic for a specific hour based on historical data
 */
export async function predictTrafficForTime(
  areaId: string,
  targetDate: Date
): Promise<HourlyPrediction[]> {
  // Get historical data for the past 30 days
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 30);
  
  const historicalData = await getTrafficDataForPeriod(areaId, startDate, targetDate);
  
  // Group by hour
  const hourlyData: Map<number, { densities: number[]; levels: TrafficLevel[] }> = new Map();
  
  for (const record of historicalData) {
    const hour = new Date(record.timestamp).getHours();
    const existing = hourlyData.get(hour) || { densities: [], levels: [] };
    existing.densities.push(record.density_score);
    existing.levels.push(record.traffic_level);
    hourlyData.set(hour, existing);
  }
  
  // Generate predictions for each hour
  const predictions: HourlyPrediction[] = [];
  
  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData.get(hour);
    
    if (data && data.densities.length > 0) {
      // Calculate average and apply time-based adjustments
      const avgDensity = data.densities.reduce((a, b) => a + b, 0) / data.densities.length;
      const variance = calculateVariance(data.densities, avgDensity);
      
      // Apply day-of-week adjustment
      const dayOfWeek = targetDate.getDay();
      let adjustedDensity = avgDensity;
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        adjustedDensity *= 0.85; // Weekend reduction
      }
      
      // Confidence based on data availability and variance
      const confidence = Math.min(
        (data.densities.length / 30) * 0.7 + (1 - Math.min(variance / 100, 1)) * 0.3,
        0.95
      );
      
      predictions.push({
        hour,
        predicted_level: calculateLevelFromDensity(adjustedDensity),
        predicted_density: Math.round(adjustedDensity * 10) / 10,
        confidence: Math.round(confidence * 100) / 100
      });
    } else {
      // No historical data - use typical patterns
      predictions.push({
        hour,
        predicted_level: getTypicalLevelForHour(hour),
        predicted_density: getTypicalDensityForHour(hour),
        confidence: 0.3
      });
    }
  }
  
  return predictions;
}

/**
 * Analyze weekly traffic patterns
 */
export async function analyzeWeeklyPatterns(areaId: string): Promise<WeeklyPattern[]> {
  // Get data for past 4 weeks
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);
  
  const historicalData = await getTrafficDataForPeriod(areaId, startDate, endDate);
  
  // Group by day of week
  const weeklyData: Map<number, { densities: number[]; hourlyDensity: Map<number, number[]> }> = new Map();
  
  for (const record of historicalData) {
    const date = new Date(record.timestamp);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    const existing = weeklyData.get(dayOfWeek) || { 
      densities: [], 
      hourlyDensity: new Map() 
    };
    
    existing.densities.push(record.density_score);
    
    const hourDensities = existing.hourlyDensity.get(hour) || [];
    hourDensities.push(record.density_score);
    existing.hourlyDensity.set(hour, hourDensities);
    
    weeklyData.set(dayOfWeek, existing);
  }
  
  // Generate weekly patterns
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const patterns: WeeklyPattern[] = [];
  
  for (let day = 0; day < 7; day++) {
    const data = weeklyData.get(day);
    
    if (data && data.densities.length > 0) {
      const avgDensity = data.densities.reduce((a, b) => a + b, 0) / data.densities.length;
      
      // Find peak hour
      let peakHour = 17; // Default evening
      let maxDensity = 0;
      
      for (const [hour, densities] of data.hourlyDensity.entries()) {
        const hourAvg = densities.reduce((a, b) => a + b, 0) / densities.length;
        if (hourAvg > maxDensity) {
          maxDensity = hourAvg;
          peakHour = hour;
        }
      }
      
      patterns.push({
        day: dayNames[day],
        dayIndex: day,
        avgDensity: Math.round(avgDensity * 10) / 10,
        peakHour,
        trafficLevel: calculateLevelFromDensity(avgDensity)
      });
    } else {
      // Default pattern
      patterns.push({
        day: dayNames[day],
        dayIndex: day,
        avgDensity: day === 0 || day === 6 ? 35 : 55,
        peakHour: 17,
        trafficLevel: day === 0 || day === 6 ? 'low' : 'medium'
      });
    }
  }
  
  return patterns;
}

/**
 * Generate route recommendations based on current and predicted traffic
 */
export async function generateRouteRecommendations(
  targetTime?: Date
): Promise<RouteRecommendation[]> {
  // Restrict recommendations to specified circles (display names),
  // resolve each to an actual area via direct lookup or mapping fallback
  const targetCircles = [
    'Devegowda Circle',
    'Metagalli Signal Junction',
    'LIC Circle',
    'Krishnarajendra Circle Post Office',
    'Basavanahalli Junction'
  ];

  const resolvedPairs: { area: Area; displayName: string }[] = [];
  const seen = new Set<string>();

  for (const name of targetCircles) {
    let resolved = await getAreaByName(name);
    if (!resolved) {
      const mapping = mapAreaToMysore(name);
      resolved = await getAreaByName(mapping.mappedArea);
    }
    if (resolved && !seen.has(resolved.id)) {
      resolvedPairs.push({ area: resolved, displayName: name });
      seen.add(resolved.id);
    }
  }

  // If we couldn't resolve any, gracefully fall back to circles (or all areas)
  let fallbackAreas: Area[] = [];
  if (resolvedPairs.length === 0) {
    const allAreas = await getAreas();
    const circleAreas = allAreas.filter(a => a.is_circle);
    fallbackAreas = circleAreas.length > 0 ? circleAreas : allAreas;
    // Use DB names as display names in fallback
    for (const area of fallbackAreas) {
      if (!seen.has(area.id)) {
        resolvedPairs.push({ area, displayName: area.name });
        seen.add(area.id);
      }
    }
  }

  const recommendations: RouteRecommendation[] = [];
  const now = targetTime || new Date();
  
  for (const { area, displayName } of resolvedPairs) {
    try {
      // Get predictions for this area
      const predictions = await predictTrafficForTime(area.id, now);
      const currentHour = now.getHours();
      const currentPrediction = predictions.find(p => p.hour === currentHour);
      const nextHourPrediction = predictions.find(p => p.hour === (currentHour + 1) % 24);
      
      if (!currentPrediction) continue;
      
      // Determine recommendation
      let recommendation: 'avoid' | 'proceed' | 'ideal' = 'proceed';
      let reason = '';
      const alternativeRoutes: string[] = [];
      
      if (currentPrediction.predicted_level === 'high') {
        recommendation = 'avoid';
        reason = `Heavy traffic expected (${currentPrediction.predicted_density}% density)`;
        
        // Find alternative circles from resolved set with lower traffic
        const alternatives = resolvedPairs
          .filter(p => {
            const characteristics = getAreaCharacteristics(p.area.name);
            return p.area.id !== area.id && characteristics.type !== 'highway';
          })
          .slice(0, 2);
        
        alternativeRoutes.push(...alternatives.map(p => p.displayName));
      } else if (currentPrediction.predicted_level === 'low') {
        recommendation = 'ideal';
        reason = `Clear roads (${currentPrediction.predicted_density}% density)`;
      } else {
        recommendation = 'proceed';
        
        if (nextHourPrediction && nextHourPrediction.predicted_level === 'high') {
          reason = `Moderate now, but expect heavy traffic in 1 hour`;
        } else {
          reason = `Moderate traffic (${currentPrediction.predicted_density}% density)`;
        }
      }
      
      recommendations.push({
        area: displayName,
        areaId: area.id,
        currentLevel: currentPrediction.predicted_level,
        predictedLevel: nextHourPrediction?.predicted_level || currentPrediction.predicted_level,
        recommendation,
        reason,
        alternativeRoutes: alternativeRoutes.length > 0 ? alternativeRoutes : undefined
      });
    } catch (error) {
      console.error(`Error generating recommendation for ${area.name}:`, error);
    }
  }
  
  return recommendations;
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
