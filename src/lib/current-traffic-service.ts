/**
 * Unified Current Traffic Service
 * 
 * This service ensures ALL pages show the same traffic status
 * by using AI predictions as the single source of truth.
 */

import { predictTrafficForTime, HourlyPrediction } from './prediction-service';
import { predictMultipleLanes, LaneHourlyPrediction } from './lane-prediction-service';
import { TrafficLevel } from './database.types';

export interface CurrentTrafficStatus {
  trafficLevel: 'low' | 'medium' | 'high';
  displayLevel: 'clear' | 'moderate' | 'heavy';
  densityScore: number;
  confidence: number;
}

/**
 * Get current traffic status for a single area using AI prediction
 * This is the SINGLE SOURCE OF TRUTH for current traffic
 */
export async function getCurrentTrafficStatus(areaId: string): Promise<CurrentTrafficStatus> {
  const now = new Date();
  const predictions = await predictTrafficForTime(areaId, now);
  const currentHour = now.getHours();
  const currentPrediction = predictions.find(p => p.hour === currentHour);

  if (!currentPrediction) {
    // Fallback if no prediction available
    return {
      trafficLevel: 'medium',
      displayLevel: 'moderate',
      densityScore: 50,
      confidence: 0.3
    };
  }

  // Map to display format
  const displayMap: Record<TrafficLevel, 'clear' | 'moderate' | 'heavy'> = {
    low: 'clear',
    medium: 'moderate',
    high: 'heavy'
  };

  return {
    trafficLevel: currentPrediction.predicted_level,
    displayLevel: displayMap[currentPrediction.predicted_level],
    densityScore: currentPrediction.predicted_density,
    confidence: currentPrediction.confidence
  };
}

/**
 * Get current traffic predictions for all hours (used by AI Prediction page)
 */
export async function get24HourForecast(areaId: string): Promise<HourlyPrediction[]> {
  const now = new Date();
  return await predictTrafficForTime(areaId, now);
}

/**
 * Get current lane predictions (for multi-lane circles)
 */
export async function getCurrentLanePredictions(
  laneIds: string[]
): Promise<Map<string, LaneHourlyPrediction>> {
  const now = new Date();
  const predictionsMap = await predictMultipleLanes(laneIds, now);
  const currentHour = now.getHours();
  const currentPredictions = new Map<string, LaneHourlyPrediction>();

  for (const laneId of laneIds) {
    const predictions = predictionsMap.get(laneId);
    if (predictions && predictions.length > 0) {
      const currentPred = predictions.find(p => p.hour === currentHour);
      if (currentPred) {
        currentPredictions.set(laneId, currentPred);
      }
    }
  }

  return currentPredictions;
}

/**
 * Helper to format hour for display
 */
export function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:00 ${period}`;
}

/**
 * Get the current hour
 */
export function getCurrentHour(): number {
  return new Date().getHours();
}
