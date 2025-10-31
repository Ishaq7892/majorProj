import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { getTrafficDataForPeriod } from "@/lib/traffic-service";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrafficChartProps {
  timePeriod: string;
  areaId?: string;
}

export const TrafficChart = ({ timePeriod, areaId }: TrafficChartProps) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    loadChartData();
  }, [timePeriod, areaId]);

  const loadChartData = async () => {
    if (!areaId) {
      generateSampleData();
      return;
    }

    try {
      setLoading(true);
      
      const days = parseInt(timePeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const trafficData = await getTrafficDataForPeriod(areaId, startDate, endDate);

      if (trafficData.length === 0) {
        generateSampleData();
        return;
      }

      const dailyData = new Map<string, { total: number; count: number }>();
      
      trafficData.forEach((record) => {
        const date = new Date(record.timestamp).toISOString().split('T')[0];
        const current = dailyData.get(date) || { total: 0, count: 0 };
        dailyData.set(date, {
          total: current.total + record.density_score,
          count: current.count + 1,
        });
      });

      const sortedDates = Array.from(dailyData.keys()).sort();
      const labels = sortedDates.map((date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      const values = sortedDates.map((date) => {
        const data = dailyData.get(date)!;
        return data.total / data.count;
      });

      setChartData({
        labels,
        datasets: [
          {
            label: "Traffic Density",
            data: values,
            borderColor: "hsl(var(--traffic-moderate))",
            backgroundColor: "hsl(var(--traffic-moderate) / 0.1)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "hsl(var(--traffic-moderate))",
            pointBorderColor: "hsl(var(--background))",
            pointBorderWidth: 2,
          },
        ],
      });
    } catch (error) {
      console.error("Error loading chart data:", error);
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const days = parseInt(timePeriod);
    const labels = [];
    const values = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      values.push(Math.floor(Math.random() * 40) + 30);
    }

    setChartData({
      labels,
      datasets: [
        {
          label: "Traffic Density (Sample)",
          data: values,
          borderColor: "hsl(var(--traffic-moderate))",
          backgroundColor: "hsl(var(--traffic-moderate) / 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "hsl(var(--traffic-moderate))",
          pointBorderColor: "hsl(var(--background))",
          pointBorderWidth: 2,
        },
      ],
    });
    setLoading(false);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "hsl(var(--popover))",
        titleColor: "hsl(var(--popover-foreground))",
        bodyColor: "hsl(var(--popover-foreground))",
        borderColor: "hsl(var(--border))",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context: any) => `Density: ${context.parsed.y.toFixed(1)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "hsl(var(--border) / 0.1)",
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
          callback: (value: any) => `${value}%`,
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "hsl(var(--muted-foreground))",
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      {chartData && <Line data={chartData} options={options} />}
    </div>
  );
};
