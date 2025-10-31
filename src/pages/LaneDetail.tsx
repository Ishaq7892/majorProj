import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Gauge, Activity } from "lucide-react";
import { TrafficLevel } from "@/lib/database.types";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { MapWithCircle } from "@/components/map/MapWithCircle";

interface LaneDetailState {
  laneName?: string;
  areaName?: string;
  trafficLevel?: TrafficLevel;
  vehicleCount?: number;
  densityScore?: number;
  avgSpeed?: number;
}

export default function LaneDetail() {
  const { areaId, laneId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LaneDetailState;

  const [loading, setLoading] = useState(true);
  const [areaData, setAreaData] = useState<{
    name: string;
    latitude?: number;
    longitude?: number;
    is_circle?: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchAreaData = async () => {
      if (!areaId) return;

      try {
        const { data, error } = await supabase
          .from("areas")
          .select("name, latitude, longitude, is_circle")
          .eq("id", areaId)
          .single();

        if (error) throw error;

        setAreaData(data);
      } catch (error) {
        console.error("Error fetching area data:", error);
        toast.error("Failed to load area data");
      } finally {
        setLoading(false);
      }
    };

    fetchAreaData();
  }, [areaId]);

  const trafficConfig = {
    low: {
      color: "text-green-600",
      bgColor: "bg-green-50",
      label: "Low Traffic",
    },
    medium: {
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      label: "Moderate Traffic",
    },
    high: {
      color: "text-red-600",
      bgColor: "bg-red-50",
      label: "Heavy Traffic",
    },
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  const config = state?.trafficLevel ? trafficConfig[state.trafficLevel] : trafficConfig.low;
  const areaName = state?.areaName || areaData?.name || "Unknown Area";
  const laneName = state?.laneName || "Lane";

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{laneName}</h1>
        <p className="text-muted-foreground">{areaName}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Statistics */}
        <div className="lg:col-span-1 space-y-4">
          {/* Traffic Level Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Status</CardTitle>
              <CardDescription>Real-time traffic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {state?.trafficLevel && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Traffic Level</p>
                  <Badge className={`${config.bgColor} ${config.color} border-0`}>
                    {config.label}
                  </Badge>
                </div>
              )}

              {state?.vehicleCount !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Car className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{state.vehicleCount}</p>
                    <p className="text-xs text-muted-foreground">Vehicles</p>
                  </div>
                </div>
              )}

              {state?.densityScore !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Activity className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{state.densityScore.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Density Score</p>
                  </div>
                </div>
              )}

              {state?.avgSpeed !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Gauge className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{state.avgSpeed.toFixed(0)} km/h</p>
                    <p className="text-xs text-muted-foreground">Average Speed</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Area Location</CardTitle>
              <CardDescription>
                {areaData?.is_circle ? "Circular intersection area" : "Traffic monitoring area"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MapWithCircle
                area={areaName}
                latitude={areaData?.latitude}
                longitude={areaData?.longitude}
                showCircle={areaData?.is_circle || false}
                trafficLevel={state?.trafficLevel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
