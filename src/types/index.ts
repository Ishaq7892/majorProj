export type TrafficLevel = "clear" | "moderate" | "heavy";

export interface TrafficData {
  id: string;
  area: string;
  level: TrafficLevel;
  timestamp: Date;
  densityScore?: number;
  description?: string;
}

export interface Area {
  id: string;
  name: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  region?: string;
}

export interface UserUpload {
  id: string;
  userId: string;
  filename: string;
  uploadDate: Date;
  status: "pending" | "processing" | "completed" | "failed";
}
