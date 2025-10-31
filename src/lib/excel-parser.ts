import * as XLSX from 'xlsx';
import { TrafficData, LaneTrafficData, LanePosition } from './database.types';
import { calculateTrafficLevel } from './traffic-service';

export interface ExcelRow {
  area?: string;
  circle?: string;  // Support 'circle' as alias for 'area'
  timestamp?: string | Date;
  density?: number | string;
}

export interface LaneExcelRow {
  area?: string;
  circle?: string;  // Support 'circle' as alias for 'area'
  lane_position?: string;
  timestamp?: string | Date;
  vehicle_count?: number | string;
  density?: number | string;
  avg_speed?: number | string;
}

export interface ParsedTrafficRecord {
  area_name: string;
  timestamp: string;
  traffic_level: 'low' | 'medium' | 'high';
  density_score: number;
}

export interface ParsedLaneTrafficRecord {
  area_name: string;
  lane_position: LanePosition;
  timestamp: string;
  vehicle_count: number;
  traffic_level: 'low' | 'medium' | 'high';
  density_score: number;
  avg_speed?: number;
}

export async function parseExcelFile(file: File): Promise<ParsedTrafficRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse to JSON
        const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { 
          defval: null,
          raw: false 
        });

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        const trafficRecords: ParsedTrafficRecord[] = [];

        for (const row of jsonData) {
          // Support both 'area' and 'circle' column names
          const locationName = row.circle || row.area;
          
          // Skip empty rows
          if (!locationName || !row.timestamp || row.density === undefined) {
            continue;
          }

          // Sanitize area name to prevent injection
          const areaName = locationName.toString().trim().substring(0, 100);
          if (!areaName || areaName.length < 2) {
            console.warn(`Invalid area name: ${row.area}`);
            continue;
          }

          const densityScore = parseFloat(row.density.toString());
          
          // Validate density score with strict bounds
          if (isNaN(densityScore) || densityScore < 0 || densityScore > 100) {
            console.warn(`Invalid density score: ${row.density}`);
            continue;
          }

          // Parse timestamp
          let timestamp: Date;
          if (typeof row.timestamp === 'string') {
            timestamp = new Date(row.timestamp);
          } else {
            timestamp = row.timestamp as Date;
          }

          if (isNaN(timestamp.getTime())) {
            console.warn(`Invalid timestamp: ${row.timestamp}`);
            continue;
          }

          trafficRecords.push({
            area_name: areaName,
            timestamp: timestamp.toISOString(),
            traffic_level: calculateTrafficLevel(densityScore, timestamp),
            density_score: densityScore,
          });
        }

        if (trafficRecords.length === 0) {
          reject(new Error('No valid traffic records found in Excel file'));
          return;
        }

        resolve(trafficRecords);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsBinaryString(file);
  });
}

export async function parseLaneExcelFile(file: File): Promise<ParsedLaneTrafficRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse to JSON
        const jsonData: LaneExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { 
          defval: null,
          raw: false 
        });

        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }

        const laneTrafficRecords: ParsedLaneTrafficRecord[] = [];

        for (const row of jsonData) {
          // Support both 'area' and 'circle' column names
          const locationName = row.circle || row.area;
          
          // Skip empty rows or rows without required fields
          if (!locationName || !row.timestamp || !row.lane_position || 
              row.vehicle_count === undefined || row.density === undefined) {
            continue;
          }

          // Sanitize area name to prevent injection
          const areaName = locationName.toString().trim().substring(0, 100);
          if (!areaName || areaName.length < 2) {
            console.warn(`Invalid area name: ${row.area}`);
            continue;
          }

          // Validate lane position
          const lanePosition = row.lane_position.toString().trim().toLowerCase();
          if (!['lane_1', 'lane_2', 'lane_3', 'lane_4'].includes(lanePosition)) {
            console.warn(`Invalid lane position: ${row.lane_position}. Must be one of: lane_1, lane_2, lane_3, lane_4`);
            continue;
          }

          const vehicleCount = parseInt(row.vehicle_count.toString());
          if (isNaN(vehicleCount) || vehicleCount < 0) {
            console.warn(`Invalid vehicle count: ${row.vehicle_count}`);
            continue;
          }

          const densityScore = parseFloat(row.density.toString());
          if (isNaN(densityScore) || densityScore < 0 || densityScore > 100) {
            console.warn(`Invalid density score: ${row.density}`);
            continue;
          }

          // Parse avg_speed if provided
          let avgSpeed: number | undefined = undefined;
          if (row.avg_speed !== undefined && row.avg_speed !== null) {
            avgSpeed = parseFloat(row.avg_speed.toString());
            if (isNaN(avgSpeed) || avgSpeed < 0) {
              console.warn(`Invalid average speed: ${row.avg_speed}`);
              avgSpeed = undefined;
            }
          }

          // Parse timestamp
          let timestamp: Date;
          if (typeof row.timestamp === 'string') {
            timestamp = new Date(row.timestamp);
          } else {
            timestamp = row.timestamp as Date;
          }

          if (isNaN(timestamp.getTime())) {
            console.warn(`Invalid timestamp: ${row.timestamp}`);
            continue;
          }

          laneTrafficRecords.push({
            area_name: areaName,
            lane_position: lanePosition as LanePosition,
            timestamp: timestamp.toISOString(),
            vehicle_count: vehicleCount,
            traffic_level: calculateTrafficLevel(densityScore, timestamp),
            density_score: densityScore,
            avg_speed: avgSpeed
          });
        }

        if (laneTrafficRecords.length === 0) {
          reject(new Error('No valid lane traffic records found in Excel file'));
          return;
        }

        resolve(laneTrafficRecords);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsBinaryString(file);
  });
}

export function generateSampleExcelFile(isLaneSpecific: boolean = false): void {
  const now = new Date();
  
  if (isLaneSpecific) {
    // Generate lane-specific sample data
    const sampleLaneData = [
      // Morning rush hour - Lane 1 (North Entry)
      { 
        circle: 'Mysore Palace Area', 
        lane_position: 'lane_1',
        timestamp: new Date(now.setHours(8, 30, 0)).toISOString(), 
        vehicle_count: 45,
        density: 72.5,
        avg_speed: 18.2
      },
      // Morning rush hour - Lane 2 (East Entry)
      { 
        circle: 'Mysore Palace Area', 
        lane_position: 'lane_2',
        timestamp: new Date(now.setHours(8, 30, 0)).toISOString(), 
        vehicle_count: 38,
        density: 65.3,
        avg_speed: 22.5
      },
      // Morning rush hour - Lane 3 (South Entry)
      { 
        circle: 'Mysore Palace Area', 
        lane_position: 'lane_3',
        timestamp: new Date(now.setHours(8, 30, 0)).toISOString(), 
        vehicle_count: 52,
        density: 78.9,
        avg_speed: 15.7
      },
      // Morning rush hour - Lane 4 (West Entry)
      { 
        circle: 'Mysore Palace Area', 
        lane_position: 'lane_4',
        timestamp: new Date(now.setHours(8, 30, 0)).toISOString(), 
        vehicle_count: 41,
        density: 68.2,
        avg_speed: 20.1
      },
      // Mid-day - Vijayanagar Circle
      { 
        circle: 'Vijayanagar', 
        lane_position: 'lane_1',
        timestamp: new Date(now.setHours(12, 15, 0)).toISOString(), 
        vehicle_count: 28,
        density: 45.7,
        avg_speed: 25.3
      },
      { 
        circle: 'Vijayanagar', 
        lane_position: 'lane_2',
        timestamp: new Date(now.setHours(12, 15, 0)).toISOString(), 
        vehicle_count: 32,
        density: 52.1,
        avg_speed: 23.8
      },
      { 
        circle: 'Vijayanagar', 
        lane_position: 'lane_3',
        timestamp: new Date(now.setHours(12, 15, 0)).toISOString(), 
        vehicle_count: 25,
        density: 41.5,
        avg_speed: 27.2
      },
      { 
        circle: 'Vijayanagar', 
        lane_position: 'lane_4',
        timestamp: new Date(now.setHours(12, 15, 0)).toISOString(), 
        vehicle_count: 30,
        density: 49.8,
        avg_speed: 24.5
      },
      // Evening - Bannimantap Circle
      { 
        circle: 'Bannimantap', 
        lane_position: 'lane_1',
        timestamp: new Date(now.setHours(18, 0, 0)).toISOString(), 
        vehicle_count: 55,
        density: 82.3,
        avg_speed: 12.8
      },
      { 
        circle: 'Bannimantap', 
        lane_position: 'lane_2',
        timestamp: new Date(now.setHours(18, 0, 0)).toISOString(), 
        vehicle_count: 48,
        density: 75.6,
        avg_speed: 15.2
      },
      { 
        circle: 'Bannimantap', 
        lane_position: 'lane_3',
        timestamp: new Date(now.setHours(18, 0, 0)).toISOString(), 
        vehicle_count: 60,
        density: 88.9,
        avg_speed: 10.5
      },
      { 
        circle: 'Bannimantap', 
        lane_position: 'lane_4',
        timestamp: new Date(now.setHours(18, 0, 0)).toISOString(), 
        vehicle_count: 52,
        density: 79.2,
        avg_speed: 14.3
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleLaneData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lane Traffic Data');

    // Generate Excel file
    XLSX.writeFile(workbook, 'mysore_lane_traffic_sample.xlsx');
  } else {
    // Generate regular traffic data (existing code)
    const sampleData = [
      // Morning rush hour - high traffic
      { 
        circle: 'Mysore Palace Area', 
        timestamp: new Date(now.setHours(8, 30, 0)).toISOString(), 
        density: 72.5 
      },
      { 
        circle: 'KRS Road', 
        timestamp: new Date(now.setHours(8, 45, 0)).toISOString(), 
        density: 85.3 
      },
      // Mid-morning - moderate traffic
      { 
        circle: 'Gokulam', 
        timestamp: new Date(now.setHours(11, 0, 0)).toISOString(), 
        density: 38.2 
      },
      { 
        circle: 'Vijayanagar', 
        timestamp: new Date(now.setHours(11, 30, 0)).toISOString(), 
        density: 54.7 
      },
      // Lunch time - moderate to high
      { 
        circle: 'Bannimantap', 
        timestamp: new Date(now.setHours(13, 0, 0)).toISOString(), 
        density: 61.4 
      },
      // Afternoon - low to moderate
      { 
        circle: 'Saraswathipuram', 
        timestamp: new Date(now.setHours(15, 30, 0)).toISOString(), 
        density: 28.9 
      },
      { 
        circle: 'Kuvempunagar', 
        timestamp: new Date(now.setHours(16, 0, 0)).toISOString(), 
        density: 32.1 
      },
      // Evening rush - high traffic
      { 
        circle: 'Jayalakshmipuram', 
        timestamp: new Date(now.setHours(18, 30, 0)).toISOString(), 
        density: 78.9 
      },
      { 
        circle: 'Hebbal', 
        timestamp: new Date(now.setHours(18, 45, 0)).toISOString(), 
        density: 69.2 
      },
      // Evening tourist area
      { 
        circle: 'Chamundi Hill Road', 
        timestamp: new Date(now.setHours(19, 15, 0)).toISOString(), 
        density: 52.3 
      },
      // Night - low traffic
      { 
        circle: 'Mysore Palace Area', 
        timestamp: new Date(now.setHours(22, 30, 0)).toISOString(), 
        density: 18.7 
      },
      // Example with external area names (will be auto-mapped)
      { 
        circle: 'MG Road', // Will map to Mysore Palace Area
        timestamp: new Date(now.setHours(10, 0, 0)).toISOString(), 
        density: 45.0 
      },
      { 
        area: 'Residential Layout', // Will map to Gokulam
        timestamp: new Date(now.setHours(14, 0, 0)).toISOString(), 
        density: 25.5 
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Traffic Data');

    // Generate Excel file
    XLSX.writeFile(workbook, 'mysore_traffic_sample.xlsx');
  }
}
