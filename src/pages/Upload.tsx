import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { parseExcelFile, parseLaneExcelFile, generateSampleExcelFile } from "@/lib/excel-parser";
import { createUserUpload, updateUploadStatus, insertTrafficData, generateAnalytics } from "@/lib/traffic-service";
import { getAreas } from "@/lib/traffic-service";
import { mapAreaToMysore } from "@/lib/area-mapper";
import { insertLaneTrafficData } from "@/lib/lane-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Upload = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadType, setUploadType] = useState<"regular" | "lane">("regular");

  const handleFileSelect = async (file: File) => {
    if (!user) {
      toast.error("You must be logged in to upload files");
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      let uploadId: string;
      // Parse Excel file based on upload type
      toast.info("Parsing Excel file...");
      
      if (uploadType === "lane") {
        // Handle lane-specific upload
        const parsedLaneRecords = await parseLaneExcelFile(file);
        setProgress(30);

        // Upload file to Supabase Storage
        const filePath = `${user.id}/${Date.now()}_lane_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("traffic-uploads")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        setProgress(50);

        // Create upload record
        uploadId = await createUserUpload(user.id, file.name, filePath);
        await updateUploadStatus(uploadId, "processing");
        setProgress(60);

        // Get areas to match records
        const areas = await getAreas();
        const areaMap = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));

        // Process lane records
        const validLaneRecords = [];
        const mappingLog: string[] = [];
        
        for (const record of parsedLaneRecords) {
          const originalAreaName = record.area_name;
          let areaId = areaMap.get(originalAreaName.toLowerCase());
          let mappedAreaName = originalAreaName;
          
          // If area not found, use intelligent mapping
          if (!areaId) {
            const mapping = mapAreaToMysore(originalAreaName);
            mappedAreaName = mapping.mappedArea;
            areaId = areaMap.get(mappedAreaName.toLowerCase());
            
            if (areaId) {
              mappingLog.push(
                `Mapped "${originalAreaName}" → "${mappedAreaName}" (${Math.round(mapping.confidence * 100)}% confidence)`
              );
            } else {
              console.warn(`Area not found even after mapping: ${originalAreaName}`);
              continue;
            }
          }

          // Get lanes for this area
          const { data: lanes } = await supabase
            .from("lanes")
            .select("id, lane_position")
            .eq("area_id", areaId);

          if (!lanes || lanes.length === 0) {
            console.warn(`No lanes found for area: ${mappedAreaName}`);
            continue;
          }

          // Find matching lane
          const lane = lanes.find(l => l.lane_position === record.lane_position);
          if (!lane) {
            console.warn(`Lane ${record.lane_position} not found for area: ${mappedAreaName}`);
            continue;
          }

          validLaneRecords.push({
            lane_id: lane.id,
            timestamp: record.timestamp,
            vehicle_count: record.vehicle_count,
            traffic_level: record.traffic_level,
            density_score: record.density_score,
            avg_speed: record.avg_speed
          });
        }
        
        // Show mapping summary
        if (mappingLog.length > 0) {
          toast.info("Area Mappings", {
            description: `Automatically mapped ${mappingLog.length} external area(s) to Mysore`,
          });
          console.log("Area Mapping Details:", mappingLog);
        }

        setProgress(75);

        // Insert lane traffic data
        if (validLaneRecords.length > 0) {
          await insertLaneTrafficData(user.id, validLaneRecords);
          
          // Generate analytics for each unique area from the lanes
          const uniqueLaneIds = [...new Set(validLaneRecords.map(r => r.lane_id))];
          const today = new Date();
          
          // Get area_ids from lane_ids
          const { data: laneAreaMappings } = await supabase
            .from("lanes")
            .select("id, area_id")
            .in("id", uniqueLaneIds);
            
          if (laneAreaMappings) {
            const uniqueAreaIds = [...new Set(laneAreaMappings.map(l => l.area_id))];
            for (const areaId of uniqueAreaIds) {
              await generateAnalytics(areaId, today);
            }
          }
        }
      } else {
        // Handle regular traffic data upload (existing code)
        const parsedRecords = await parseExcelFile(file);
        setProgress(30);

        // Upload file to Supabase Storage
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("traffic-uploads")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        setProgress(50);

        // Create upload record
        uploadId = await createUserUpload(user.id, file.name, filePath);
        await updateUploadStatus(uploadId, "processing");
        setProgress(60);

        // Get areas to match records
        const areas = await getAreas();
        const areaMap = new Map(areas.map((a) => [a.name.toLowerCase(), a.id]));

        // Group records by area name and assign area_id with intelligent mapping
        const validRecords = [];
        const mappingLog: string[] = [];
        
        for (const record of parsedRecords) {
          const originalAreaName = record.area_name;
          let areaId = areaMap.get(originalAreaName.toLowerCase());
          let mappedAreaName = originalAreaName;
          
          // If area not found, use intelligent mapping
          if (!areaId) {
            const mapping = mapAreaToMysore(originalAreaName);
            mappedAreaName = mapping.mappedArea;
            areaId = areaMap.get(mappedAreaName.toLowerCase());
            
            if (areaId) {
              mappingLog.push(
                `Mapped "${originalAreaName}" → "${mappedAreaName}" (${Math.round(mapping.confidence * 100)}% confidence)`
              );
            } else {
              console.warn(`Area not found even after mapping: ${originalAreaName}`);
              continue;
            }
          }

          validRecords.push({
            area_id: areaId,
            timestamp: record.timestamp,
            traffic_level: record.traffic_level,
            density_score: record.density_score,
          });
        }
        
        // Show mapping summary
        if (mappingLog.length > 0) {
          toast.info("Area Mappings", {
            description: `Automatically mapped ${mappingLog.length} external area(s) to Mysore`,
          });
          console.log("Area Mapping Details:", mappingLog);
        }

        setProgress(75);

        // Insert traffic data using secure function
        if (validRecords.length > 0) {
          await insertTrafficData(user.id, validRecords);
          
          // Generate analytics for each unique area
          const uniqueAreaIds = [...new Set(validRecords.map(r => r.area_id))];
          const today = new Date();
          
          for (const areaId of uniqueAreaIds) {
            await generateAnalytics(areaId, today);
          }
        }
      }

      setProgress(95);

      // Mark upload as completed
      await updateUploadStatus(uploadId, "completed");
      setProgress(100);

      toast.success("File uploaded successfully!", {
        description: "Traffic analysis has been generated",
      });

      setTimeout(() => {
        navigate("/analytics");
      }, 1500);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Upload failed", {
        description: error.message || "Failed to process file",
      });
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDownloadSample = () => {
    try {
      generateSampleExcelFile(uploadType === "lane");
      toast.success(`Sample ${uploadType === "lane" ? "lane traffic" : "traffic"} file downloaded!`);
    } catch (error) {
      toast.error("Failed to generate sample file");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Upload Data</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Upload Traffic Data</CardTitle>
            <CardDescription className="text-base">
              Upload your Excel file containing traffic data for analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="regular" onValueChange={(value) => setUploadType(value as "regular" | "lane")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="regular">Regular Traffic Data</TabsTrigger>
                <TabsTrigger value="lane">Lane-Specific Data</TabsTrigger>
              </TabsList>
              <TabsContent value="regular" className="pt-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Regular Traffic Data Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Accepted formats: Excel (.xlsx, .xls)</li>
                    <li>Maximum file size: 20MB</li>
                    <li>Required columns: circle, timestamp, density (0-100)</li>
                    <li>Circle names: Auto-maps external circles (e.g., from other cities) to Mysore circles</li>
                    <li>Example Mysore circles: Devegowda Circle, Metagalli Signal Junction, LIC Circle</li>
                  </ul>
                </div>
              </TabsContent>
              <TabsContent value="lane" className="pt-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Lane-Specific Traffic Data Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Accepted formats: Excel (.xlsx, .xls)</li>
                    <li>Maximum file size: 20MB</li>
                    <li>Required columns: circle, lane_position, timestamp, vehicle_count, density</li>
                    <li>Optional columns: avg_speed</li>
                    <li>Lane position must be one of: lane_1, lane_2, lane_3, lane_4</li>
                    <li>Only works for circular intersections: Devegowda Circle, Metagalli Signal Junction, Basavanahalli Junction</li>
                    <li>Vehicle count must be a positive integer</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>

            {!uploading ? (
              <FileUpload onFileSelect={handleFileSelect} maxSize={20} />
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Processing...</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h4 className="font-semibold mb-3">Need a sample template?</h4>
              <Button variant="outline" size="sm" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 mr-2" />
                Download Sample {uploadType === "lane" ? "Lane Traffic" : "Traffic"} Template
              </Button>
            </div>

            <div className="flex gap-4 pt-4">
              <Button asChild variant="outline" className="flex-1 touch-manipulation min-h-[44px]">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Traffic Status
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Upload;
