import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { TrafficChart } from "@/components/charts/TrafficChart";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getTrafficAnalytics, getUserUploads, getAreaByName } from "@/lib/traffic-service";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PeakHour } from "@/lib/database.types";

const CIRCLES = [
  { id: "devegowda-circle", name: "Devegowda Circle" },
  { id: "metagalli-signal-junction", name: "Metagalli Signal Junction" },
  { id: "basavanahalli-junction", name: "Basavanahalli Junction" },
  { id: "lic-circle", name: "LIC Circle" },
  { id: "krishnarajendra-circle-post-office", name: "Krishnarajendra Circle Post Office" },
];

const Analytics = () => {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState("7");
  const [selectedCircle, setSelectedCircle] = useState<string>(CIRCLES[0]?.id || "");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [areaId, setAreaId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user, selectedCircle]);

  useEffect(() => {
    if (areaId) {
      loadAnalytics();
    }
  }, [areaId, timePeriod]);

  const loadData = async () => {
    try {
      // Get the selected circle's data
      const selectedCircleData = CIRCLES.find(c => c.id === selectedCircle);
      if (selectedCircleData) {
        const area = await getAreaByName(selectedCircleData.name);
        if (area) {
          setAreaId(area.id);
        } else {
          setAreaId(null);
          toast.error(`Circle "${selectedCircleData.name}" not found in database`);
        }
      }

      if (user) {
        const uploads = await getUserUploads(user.id);
        setUploadCount(uploads.length);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!areaId) return;

    try {
      const days = parseInt(timePeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analyticsData = await getTrafficAnalytics(areaId, startDate, endDate);
      
      if (analyticsData.length > 0) {
        // Get the most recent analytics
        const recent = analyticsData[0];
        setAnalytics(recent);
      } else {
        setAnalytics(null);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    }
  };

  const handleExport = () => {
    toast.success("Exporting data...", {
      description: "Your traffic analytics will be downloaded shortly",
    });
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

  const peakHours = analytics?.peak_hours ? (analytics.peak_hours as PeakHour[]) : [];
  const busiestHour = peakHours.length > 0 ? peakHours[0] : null;
  const quietestHour = peakHours.length > 0 ? peakHours[peakHours.length - 1] : null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold">Traffic Analytics</h1>
          <div className="flex items-center gap-3">
            <Select value={selectedCircle} onValueChange={setSelectedCircle}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select circle" />
              </SelectTrigger>
              <SelectContent>
                {CIRCLES.map((circle) => (
                  <SelectItem key={circle.id} value={circle.id}>
                    {circle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timePeriod} onValueChange={setTimePeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} className="touch-manipulation min-h-[44px]">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {analytics ? (
          <>
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peak Traffic Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {busiestHour ? `${busiestHour.hour}:00` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {busiestHour ? `Density: ${busiestHour.density.toFixed(1)}%` : "No data"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Density</CardTitle>
                  <TrendingUp className="h-4 w-4 text-traffic-heavy" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {analytics.avg_density ? `${analytics.avg_density.toFixed(1)}%` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Overall traffic level
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quietest Time</CardTitle>
                  <TrendingDown className="h-4 w-4 text-traffic-clear" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {quietestHour ? `${quietestHour.hour}:00` : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {quietestHour ? `Density: ${quietestHour.density.toFixed(1)}%` : "No data"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Traffic Density Over Time</CardTitle>
                <CardDescription>
                  Traffic patterns for the selected time period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrafficChart timePeriod={timePeriod} areaId={areaId || ""} />
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Data Source Information</CardTitle>
                <CardDescription>
                  Information about your uploaded data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Uploads:</span>
                    <span className="font-medium">{uploadCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Records Analyzed:</span>
                    <span className="font-medium">{analytics.total_records || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time Period:</span>
                    <span className="font-medium">Last {timePeriod} days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No analytics data available for the selected circle and time period.
              </p>
              <Button asChild className="mt-4">
                <Link to="/upload">Upload Traffic Data</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button asChild variant="outline" className="flex-1">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Traffic Status
            </Link>
          </Button>
          <Button asChild className="flex-1">
            <Link to="/upload">Upload New Data</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
