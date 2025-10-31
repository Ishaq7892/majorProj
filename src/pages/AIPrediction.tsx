import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Calendar, Clock, Zap, TrendingUp, AlertCircle, CheckCircle, Navigation } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getAreaByName } from "@/lib/traffic-service";
import { mapAreaToMysore } from "@/lib/area-mapper";
import { predictTrafficForTime, analyzeWeeklyPatterns, generateRouteRecommendations, HourlyPrediction, WeeklyPattern, RouteRecommendation } from "@/lib/prediction-service";

const CIRCLES = [
  { id: "devegowda-circle", name: "Devegowda Circle" },
  { id: "metagalli-signal-junction", name: "Metagalli Signal Junction" },
  { id: "basavanahalli-junction", name: "Basavanahalli Junction" },
  { id: "lic-circle", name: "LIC Circle" },
  { id: "krishnarajendra-circle-post-office", name: "Krishnarajendra Circle Post Office" },
];

const AIPrediction = () => {
  const [selectedCircle, setSelectedCircle] = useState<string>(CIRCLES[0]?.id || "");
  const [areaId, setAreaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Prediction data
  const [hourlyPredictions, setHourlyPredictions] = useState<HourlyPrediction[]>([]);
  const [weeklyPatterns, setWeeklyPatterns] = useState<WeeklyPattern[]>([]);
  const [recommendations, setRecommendations] = useState<RouteRecommendation[]>([]);
  
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [loadingPatterns, setLoadingPatterns] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  // Load area ID on mount and when circle changes
  useEffect(() => {
    loadAreaId();
    loadRecommendations();
  }, [selectedCircle]);

  // Load predictions when area ID is available
  useEffect(() => {
    if (areaId) {
      loadPredictions();
      loadWeeklyPatterns();
    }
  }, [areaId]);

  const loadAreaId = async () => {
    try {
      const selectedCircleData = CIRCLES.find(c => c.id === selectedCircle);
      if (selectedCircleData) {
        const area = await getAreaByName(selectedCircleData.name);
        if (area) {
          setAreaId(area.id);
        } else {
          // Fallback: map the circle name to a known Mysore area
          const mapping = mapAreaToMysore(selectedCircleData.name);
          const mapped = await getAreaByName(mapping.mappedArea);
          if (mapped) {
            setAreaId(mapped.id);
            toast.info(`Mapped circle "${selectedCircleData.name}" to "${mapping.mappedArea}" (${Math.round(mapping.confidence * 100)}% match)`);
          } else {
            setAreaId(null);
            toast.error(`Circle "${selectedCircleData.name}" not found in database`);
          }
        }
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadPredictions = async () => {
    if (!areaId) return;
    
    setLoadingPredictions(true);
    try {
      const predictions = await predictTrafficForTime(areaId, new Date());
      setHourlyPredictions(predictions);
    } catch (err: any) {
      toast.error("Failed to load predictions", {
        description: err.message
      });
    } finally {
      setLoadingPredictions(false);
    }
  };

  const loadWeeklyPatterns = async () => {
    if (!areaId) return;
    
    setLoadingPatterns(true);
    try {
      const patterns = await analyzeWeeklyPatterns(areaId);
      setWeeklyPatterns(patterns);
    } catch (err: any) {
      toast.error("Failed to load weekly patterns", {
        description: err.message
      });
    } finally {
      setLoadingPatterns(false);
    }
  };

  const loadRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const recs = await generateRouteRecommendations();
      setRecommendations(recs);
    } catch (err: any) {
      toast.error("Failed to load recommendations", {
        description: err.message
      });
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const getTrafficLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'ideal': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'avoid': return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'proceed': return <Navigation className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'ideal': return <Badge className="bg-green-600">Ideal Route</Badge>;
      case 'avoid': return <Badge variant="destructive">Avoid</Badge>;
      case 'proceed': return <Badge variant="secondary">Proceed with Caution</Badge>;
    }
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
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
        <ErrorMessage message={error} />
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
              <BreadcrumbPage>AI Prediction</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">AI Traffic Prediction</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get intelligent traffic forecasts based on historical patterns and real-time analysis
          </p>
        </div>

        {/* Circle Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Circle</CardTitle>
            <CardDescription>Choose a circle to view AI predictions</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedCircle} onValueChange={setSelectedCircle}>
              <SelectTrigger>
                <SelectValue placeholder="Select a circle" />
              </SelectTrigger>
              <SelectContent>
                {CIRCLES.map((circle) => (
                  <SelectItem key={circle.id} value={circle.id}>
                    {circle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Feature 1: Smart Time Predictions */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <CardTitle>24-Hour Traffic Forecast</CardTitle>
            </div>
            <CardDescription>
              Hourly predictions based on historical patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPredictions ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : hourlyPredictions.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {hourlyPredictions.map((pred) => (
                  <div key={pred.hour} className="p-3 rounded-lg border hover:border-primary transition-colors">
                    <div className="text-sm font-medium mb-1">{formatHour(pred.hour)}</div>
                    <Badge className={`${getTrafficLevelColor(pred.predicted_level)} text-xs mb-1`}>
                      {pred.predicted_level}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {pred.predicted_density}% density
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(pred.confidence * 100)}% confidence
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No prediction data available. Upload traffic data to enable predictions.</p>
            )}
          </CardContent>
        </Card>

        {/* Feature 2: Weekly Pattern Analysis */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <CardTitle>Weekly Traffic Patterns</CardTitle>
            </div>
            <CardDescription>
              Understand how traffic changes throughout the week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPatterns ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : weeklyPatterns.length > 0 ? (
              <div className="space-y-3">
                {weeklyPatterns.map((pattern) => (
                  <div key={pattern.dayIndex} className="flex items-center justify-between p-4 rounded-lg border hover:border-primary transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="font-semibold w-24">{pattern.day}</div>
                      <Badge className={`${getTrafficLevelColor(pattern.trafficLevel)}`}>
                        {pattern.trafficLevel}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        Avg: {pattern.avgDensity}% density
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Peak: {formatHour(pattern.peakHour)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No weekly pattern data available.</p>
            )}
          </CardContent>
        </Card>

        {/* Feature 3: Real-time Recommendations */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <CardTitle>Route Recommendations</CardTitle>
                </div>
                <CardDescription>
                  Intelligent suggestions to avoid traffic congestion
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadRecommendations}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRecommendations ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec) => (
                  <div key={rec.areaId} className="p-4 rounded-lg border hover:border-primary transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {getRecommendationIcon(rec.recommendation)}
                        <div>
                          <h4 className="font-semibold">{rec.area}</h4>
                          <p className="text-sm text-muted-foreground">{rec.reason}</p>
                        </div>
                      </div>
                      {getRecommendationBadge(rec.recommendation)}
                    </div>
                    
                    <div className="flex gap-4 mt-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current: </span>
                        <Badge className={`${getTrafficLevelColor(rec.currentLevel)} text-xs`}>
                          {rec.currentLevel}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Next Hour: </span>
                        <Badge className={`${getTrafficLevelColor(rec.predictedLevel)} text-xs`}>
                          {rec.predictedLevel}
                        </Badge>
                      </div>
                    </div>
                    
                    {rec.alternativeRoutes && rec.alternativeRoutes.length > 0 && (
                      <div className="mt-3 p-2 bg-muted/50 rounded">
                        <p className="text-xs font-medium mb-1">Alternative Circles:</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.alternativeRoutes.map((alt, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {alt}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No recommendations available.</p>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button asChild variant="outline" className="w-full">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Main Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIPrediction;
