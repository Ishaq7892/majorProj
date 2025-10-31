import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAreaByName } from "@/lib/traffic-service";
import { getLanesByAreaId } from "@/lib/lane-service";
import { getCurrentLanePredictions } from "@/lib/current-traffic-service";
import { Lane } from "@/lib/database.types";

const CIRCLES = [
  { id: "devegowda-circle", name: "Devegowda Circle" },
  { id: "metagalli-signal-junction", name: "Metagalli Signal Junction" },
  { id: "basavanahalli-junction", name: "Basavanahalli Junction" },
  { id: "lic-circle", name: "LIC Circle" },
  { id: "krishnarajendra-circle-post-office", name: "Krishnarajendra Circle Post Office" },
];

type PredictedLevel = 'low' | 'medium' | 'high';

const levelToLabel: Record<PredictedLevel, string> = {
  low: 'Low',
  medium: 'Moderate',
  high: 'High',
};

const levelToColor: Record<PredictedLevel, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

const Index = () => {
  const [selectedArea, setSelectedArea] = useState<string>(CIRCLES[0]?.id || "");
  const [lanes, setLanes] = useState<Lane[]>([]);
  const [predicted, setPredicted] = useState<PredictedLevel[]>(['medium','medium','medium','medium']);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAreaData = CIRCLES.find(a => a.id === selectedArea);

  useEffect(() => {
    const loadPredictions = async () => {
      if (!selectedAreaData) return;
      setLoading(true);
      setError(null);
      try {
        const area = await getAreaByName(selectedAreaData.name);
        if (!area) {
          setError('Selected circle not found');
          setPredicted(['medium','medium','medium','medium']);
          setLanes([]);
          return;
        }
        const lanesData = await getLanesByAreaId(area.id);
        // Ensure we have up to four lanes in order lane_1..lane_4
        const ordered = [...lanesData].sort((a,b) => a.lane_position.localeCompare(b.lane_position)).slice(0,4);
        setLanes(ordered);
        const laneIds = ordered.map(l => l.id);
        if (laneIds.length === 0) {
          setPredicted(['medium','medium','medium','medium']);
          return;
        }
        const predsMap = await getCurrentLanePredictions(laneIds);
        const levels: PredictedLevel[] = ordered.map(l => predsMap.get(l.id)?.predictedTrafficLevel || 'medium');
        // Pad to 4
        while (levels.length < 4) levels.push('medium');
        setPredicted(levels.slice(0,4));
      } catch (e: any) {
        console.error(e);
        setError(e?.message || 'Failed to load predictions');
        setPredicted(['medium','medium','medium','medium']);
      } finally {
        setLoading(false);
      }
    };
    loadPredictions();
  }, [selectedArea]);

  const Dot = ({ level }: { level: PredictedLevel }) => (
    <span className={`inline-flex items-center gap-2`}>
      <span className={`w-2.5 h-2.5 rounded-full ${level === 'low' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'}`} />
      <span className={`font-medium ${levelToColor[level]}`}>{levelToLabel[level]}</span>
    </span>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to EasyWay
          </h2>
          <p className="text-lg text-muted-foreground mb-6">
            Select a circle and view lane-wise predicted congestion
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Select Circles</CardTitle>
            <CardDescription>Choose a circle-type junction</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select circles" />
              </SelectTrigger>
              <SelectContent>
                {CIRCLES.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAreaData && (
              <div className="pt-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Lane 1 */}
                    <Card className="hover:shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Lane one</CardTitle>
                        <CardDescription>Predicted congestion</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dot level={predicted[0] || 'medium'} />
                      </CardContent>
                    </Card>

                    {/* Lane 2 */}
                    <Card className="hover:shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Lane two</CardTitle>
                        <CardDescription>Predicted congestion</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dot level={predicted[1] || 'medium'} />
                      </CardContent>
                    </Card>

                    {/* Lane 3 */}
                    <Card className="hover:shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Lane three</CardTitle>
                        <CardDescription>Predicted congestion</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dot level={predicted[2] || 'medium'} />
                      </CardContent>
                    </Card>

                    {/* Lane 4 */}
                    <Card className="hover:shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-lg">Lane four</CardTitle>
                        <CardDescription>Predicted congestion</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Dot level={predicted[3] || 'medium'} />
                      </CardContent>
                    </Card>
                  </div>
                )}
                {error && (
                  <p className="text-sm text-red-600 mt-2">{error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">📊 Upload Data</CardTitle>
              <CardDescription>Upload historical traffic data for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/upload">Go to Upload</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">📈 View Analytics</CardTitle>
              <CardDescription>Explore traffic patterns and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/analytics">Go to Analytics</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
