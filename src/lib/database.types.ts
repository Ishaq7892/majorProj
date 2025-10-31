export type TrafficLevel = 'low' | 'medium' | 'high';
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type LanePosition = 'lane_1' | 'lane_2' | 'lane_3' | 'lane_4';

export interface Area {
  id: string;
  name: string;
  coordinates?: unknown;
  latitude?: number;
  longitude?: number;
  region?: string | null;
  is_circle?: boolean;
  lane_count?: number;
  created_at: string;
}

export interface TrafficData {
  id: string;
  area_id: string;
  timestamp: string;
  traffic_level: TrafficLevel;
  density_score: number;
  created_at: string;
}

export interface UserUpload {
  id: string;
  user_id: string;
  filename: string;
  file_path: string;
  upload_date: string;
  status: UploadStatus;
  error_message?: string;
  created_at: string;
}

export interface TrafficAnalytics {
  id: string;
  area_id: string;
  analysis_date: string;
  peak_hours?: unknown;
  avg_density?: number | null;
  busiest_time?: string | null;
  quietest_time?: string | null;
  total_records?: number | null;
  created_at: string;
}

export interface PeakHour {
  hour: number;
  density: number;
}

export interface Lane {
  id: string;
  area_id: string;
  lane_position: LanePosition;
  lane_name: string;
  direction?: string;
  max_capacity?: number;
  created_at: string;
}

export interface LaneTrafficData {
  id: string;
  lane_id: string;
  timestamp: string;
  vehicle_count: number;
  traffic_level: TrafficLevel;
  density_score: number;
  avg_speed?: number;
  congestion_index?: number;
  created_at: string;
}

export interface LanePrediction {
  id: string;
  lane_id: string;
  prediction_time: string;
  predicted_vehicle_count: number;
  predicted_traffic_level: TrafficLevel;
  predicted_density: number;
  confidence_score?: number;
  prediction_horizon: number;
  created_at: string;
}
