import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TrafficStatusCard } from "@/components/traffic/TrafficStatusCard";
import { MultiLaneTrafficCard } from "@/components/traffic/MultiLaneTrafficCard";
import { MapComponent } from "@/components/map/MapComponent";
import { Button } from "@/components/ui/button";
import { RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { getAreaByName } from "@/lib/traffic-service";
import { getLanesByAreaId, getLatestLaneTrafficDataForArea } from "@/lib/lane-service";
import { predictCongestionTrend } from "@/lib/lane-prediction-service";
import { getCurrentTrafficStatus, getCurrentLanePredictions } from "@/lib/current-traffic-service";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { Lane, LaneTrafficData } from "@/lib/database.types";
import { LaneHourlyPrediction } from "@/lib/lane-prediction-service";

const TrafficStatus = () => {
  const { area } = useParams<{ area: string }>();
  const areaName = area?.replace(/-/g, " ") || "Unknown Circle";
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<"clear" | "moderate" | "heavy">("moderate");
  const [densityScore, setDensityScore] = useState<number>(0);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  
  // Multi-lane state
  const [isCircle, setIsCircle] = useState(false);
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [laneTrafficData, setLaneTrafficData] = useState<Map<string, LaneTrafficData>>(new Map());
  const [lanePredictions, setLanePredictions] = useState<Map<string, LaneHourlyPrediction>>(new Map());
  const [laneTrends, setLaneTrends] = useState<Map<string, 'increasing' | 'decreasing' | 'stable'>>(new Map());

  const loadTrafficData = async () => {
    try {
      setLoading(true);
      setError(null);

      const areaData = await getAreaByName(areaName);
      if (!areaData) {
        setError(`Circle "${areaName}" not found`);
        return;
      }

      // Set coordinates from area data
      setLatitude(areaData.latitude);
      setLongitude(areaData.longitude);
      setIsCircle(areaData.is_circle || false);

      // Check if this is a circular intersection with lanes
      if (areaData.is_circle && areaData.lane_count && areaData.lane_count > 0) {
        // Load lane-specific data
        await loadLaneData(areaData.id);
      } else {
        // Load traditional single-status data using AI prediction
        await loadSingleAreaData(areaData.id);
      }
    } catch (err: any) {
      console.error("Error loading traffic data:", err);
      setError(err.message || "Failed to load traffic data");
    } finally {
      setLoading(false);
    }
  };

  const loadSingleAreaData = async (areaId: string) => {
    try {
      // Use unified current traffic service
      const status = await getCurrentTrafficStatus(areaId);
      setTrafficLevel(status.displayLevel);
      setDensityScore(status.densityScore);
    } catch (err: any) {
      console.error("Error loading single area data:", err);
      setTrafficLevel("moderate");
      setDensityScore(50);
    }
  };

  const loadLaneData = async (areaId: string) => {
    try {
      // Fetch lanes for this area
      const lanesData = await getLanesByAreaId(areaId);
      setLanes(lanesData);

      if (lanesData.length === 0) {
        return;
      }

      // Use unified service for current lane predictions
      const laneIds = lanesData.map(lane => lane.id);
      const currentPredictions = await getCurrentLanePredictions(laneIds);
      
      // Build traffic data and trends from predictions
      const now = new Date();
      const updatedTrafficDataMap = new Map<string, LaneTrafficData>();
      const trends = new Map<string, 'increasing' | 'decreasing' | 'stable'>();

      // Fetch actual lane data for reference (speed, etc.)
      const actualTrafficDataMap = await getLatestLaneTrafficDataForArea(areaId);

      for (const lane of lanesData) {
        const laneId = lane.id;
        const currentPred = currentPredictions.get(laneId);
        
        if (currentPred) {
          // Use prediction data to create lane traffic data
          const actualData = actualTrafficDataMap.get(laneId);
          const syntheticData: LaneTrafficData = {
            id: actualData?.id || laneId,
            lane_id: laneId,
            timestamp: actualData?.timestamp || now.toISOString(),
            vehicle_count: currentPred.predictedVehicleCount,
            traffic_level: currentPred.predictedTrafficLevel,
            density_score: currentPred.predictedDensity,
            avg_speed: actualData?.avg_speed,
            congestion_index: actualData?.congestion_index,
            created_at: actualData?.created_at || now.toISOString()
          };
          updatedTrafficDataMap.set(laneId, syntheticData);

          // Calculate trend
          const trendData = await predictCongestionTrend(laneId, 3);
          trends.set(laneId, trendData.trend);
        } else if (actualTrafficDataMap.has(laneId)) {
          // Fallback to actual data if no predictions
          updatedTrafficDataMap.set(laneId, actualTrafficDataMap.get(laneId)!);
        }
      }

      setLaneTrafficData(updatedTrafficDataMap);
      setLanePredictions(currentPredictions);
      setLaneTrends(trends);

      // Calculate overall area traffic level from AI predictions
      if (updatedTrafficDataMap.size > 0) {
        const avgDensity = Array.from(updatedTrafficDataMap.values())
          .reduce((sum, data) => sum + data.density_score, 0) / updatedTrafficDataMap.size;
        setDensityScore(avgDensity);
        
        const levelMap: Record<string, "clear" | "moderate" | "heavy"> = {
          low: "clear",
          medium: "moderate",
          high: "heavy",
        };
        const avgLevel = avgDensity < 35 ? 'low' : avgDensity < 65 ? 'medium' : 'high';
        setTrafficLevel(levelMap[avgLevel] || "moderate");
      }
    } catch (err: any) {
      console.error("Error loading lane data:", err);
      toast.error("Failed to load lane data", {
        description: err.message
      });
    }
  };

  useEffect(() => {
    loadTrafficData();
  }, [areaName]);

  const handleRefresh = () => {
    toast.info("Refreshing traffic data...");
    loadTrafficData();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ErrorMessage message={error} />
          <div className="mt-4">
            <Button asChild>
              <Link to="/">Return to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="capitalize">{areaName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold capitalize flex items-center gap-2">
            <MapPin className="w-8 h-8" />
            {areaName}
          </h1>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="touch-manipulation min-h-[44px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="space-y-6">
          {isCircle && lanes.length > 0 ? (
            <MultiLaneTrafficCard
              areaName={areaName}
              lanes={lanes}
              laneTrafficData={laneTrafficData}
              lanePredictions={lanePredictions}
              laneTrends={laneTrends}
            />
          ) : (
            <TrafficStatusCard
              level={trafficLevel}
              area={areaName}
            />
          )}

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Interactive Map</h3>
              <MapComponent 
                area={areaName} 
                trafficLevel={trafficLevel}
                latitude={latitude}
                longitude={longitude}
              />
              <p className="text-sm text-muted-foreground mt-4">
                Density Score: {densityScore.toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild variant="outline" className="flex-1 touch-manipulation min-h-[44px]">
              <Link to="/">Check Different Circle</Link>
            </Button>
            <Button asChild className="flex-1 touch-manipulation min-h-[44px]">
              <Link to="/analytics">View Analytics</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficStatus;
