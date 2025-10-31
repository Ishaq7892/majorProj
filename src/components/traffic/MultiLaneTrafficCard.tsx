import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LaneCard } from "./LaneCard";
import { Lane, LaneTrafficData } from "@/lib/database.types";
import { LaneHourlyPrediction } from "@/lib/lane-prediction-service";

interface MultiLaneTrafficCardProps {
  areaName: string;
  lanes: Lane[];
  laneTrafficData: Map<string, LaneTrafficData>;
  lanePredictions?: Map<string, LaneHourlyPrediction>;
  laneTrends?: Map<string, 'increasing' | 'decreasing' | 'stable'>;
  className?: string;
}

export const MultiLaneTrafficCard = ({
  areaName,
  lanes,
  laneTrafficData,
  lanePredictions,
  laneTrends,
  className
}: MultiLaneTrafficCardProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🚦</span>
          {areaName}
        </CardTitle>
        <CardDescription>Multi-lane circular intersection - Real-time and predicted traffic</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lanes.map((lane) => {
            const trafficData = laneTrafficData.get(lane.id);
            const prediction = lanePredictions?.get(lane.id);
            const trend = laneTrends?.get(lane.id);

            if (!trafficData) {
              return (
                <Card key={lane.id} className="border-2 border-gray-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-base">{lane.lane_name}</h3>
                    <p className="text-sm text-muted-foreground mt-2">No data available</p>
                  </CardContent>
                </Card>
              );
            }

            return (
              <LaneCard
                key={lane.id}
                laneId={lane.id}
                areaId={lane.area_id}
                areaName={areaName}
                laneName={lane.lane_name}
                direction={lane.direction}
                trafficLevel={trafficData.traffic_level}
                vehicleCount={trafficData.vehicle_count}
                densityScore={trafficData.density_score}
                avgSpeed={trafficData.avg_speed}
                prediction={prediction}
                trend={trend}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
