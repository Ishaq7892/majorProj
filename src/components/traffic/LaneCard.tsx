import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, Car, ArrowUp, ArrowDown, Minus, TrendingUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrafficLevel } from "@/lib/database.types";
import { LaneHourlyPrediction } from "@/lib/lane-prediction-service";
import { useNavigate } from "react-router-dom";

interface LaneCardProps {
  laneId?: string;
  areaId?: string;
  areaName?: string;
  laneName: string;
  direction?: string;
  trafficLevel: TrafficLevel;
  vehicleCount: number;
  densityScore: number;
  avgSpeed?: number;
  prediction?: LaneHourlyPrediction;
  trend?: 'increasing' | 'decreasing' | 'stable';
  className?: string;
}

const trafficConfig = {
  low: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Low Traffic",
  },
  medium: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    label: "Moderate Traffic",
  },
  high: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "Heavy Traffic",
  },
};

export const LaneCard = ({
  laneId,
  areaId,
  areaName,
  laneName,
  direction,
  trafficLevel,
  vehicleCount,
  densityScore,
  avgSpeed,
  prediction,
  trend,
  className
}: LaneCardProps) => {
  const config = trafficConfig[trafficLevel];
  const Icon = config.icon;
  const navigate = useNavigate();

  const getTrendIcon = () => {
    if (trend === 'increasing') return <ArrowUp className="w-4 h-4 text-red-500" />;
    if (trend === 'decreasing') return <ArrowDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendText = () => {
    if (trend === 'increasing') return 'Increasing';
    if (trend === 'decreasing') return 'Decreasing';
    return 'Stable';
  };

  return (
    <Card className={cn("border-2", config.borderColor, className)}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-base">{laneName}</h3>
              {direction && (
                <p className="text-sm text-muted-foreground">{direction}</p>
              )}
            </div>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>

          {/* Status Badge */}
          <Badge className={cn(config.bgColor, config.color, "border-0")}>
            {config.label}
          </Badge>

          {/* Current Stats */}
          <div className={cn("rounded-lg p-3", config.bgColor)}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4" />
                <span className="font-medium">{vehicleCount}</span>
                <span className="text-xs text-muted-foreground">vehicles</span>
              </div>
              <div>
                <span className="font-medium">{densityScore.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground"> density</span>
              </div>
            </div>
            
            {avgSpeed && (
              <div className="mt-2 text-sm">
                <span className="font-medium">{avgSpeed.toFixed(0)} km/h</span>
                <span className="text-xs text-muted-foreground"> avg speed</span>
              </div>
            )}
          </div>

          {/* Prediction Section */}
          {prediction && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>Next Hour Prediction</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {getTrendIcon()}
                  <span className="text-muted-foreground">{getTrendText()}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Expected Vehicles</p>
                  <p className="font-semibold">{prediction.predictedVehicleCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected Density</p>
                  <p className="font-semibold">{prediction.predictedDensity.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="mt-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    trafficConfig[prediction.predictedTrafficLevel].color,
                    trafficConfig[prediction.predictedTrafficLevel].bgColor
                  )}
                >
                  {trafficConfig[prediction.predictedTrafficLevel].label}
                </Badge>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({Math.round(prediction.confidence * 100)}% confidence)
                </span>
              </div>
            </div>
          )}

          {/* View Details Button */}
          {laneId && areaId && (
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={() => navigate(`/lane/${areaId}/${laneId}`, {
                state: { laneName, areaName, trafficLevel, vehicleCount, densityScore, avgSpeed }
              })}
            >
              <MapPin className="w-4 h-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
