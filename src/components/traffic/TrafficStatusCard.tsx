import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrafficLevel = "clear" | "moderate" | "heavy";

interface TrafficStatusCardProps {
  level: TrafficLevel;
  area: string;
  description?: string;
  className?: string;
}

const trafficConfig = {
  clear: {
    icon: CheckCircle2,
    color: "text-traffic-clear",
    bgColor: "bg-traffic-clear/10",
    borderColor: "border-traffic-clear",
    label: "Clear Traffic",
    message: "Roads are clear and flowing smoothly",
  },
  moderate: {
    icon: AlertTriangle,
    color: "text-traffic-moderate",
    bgColor: "bg-traffic-moderate/10",
    borderColor: "border-traffic-moderate",
    label: "Moderate Traffic",
    message: "Some delays expected, plan accordingly",
  },
  heavy: {
    icon: XCircle,
    color: "text-traffic-heavy",
    bgColor: "bg-traffic-heavy/10",
    borderColor: "border-traffic-heavy",
    label: "Heavy Traffic",
    message: "Significant delays, consider alternate routes",
  },
};

export const TrafficStatusCard = ({ 
  level, 
  area, 
  description, 
  className 
}: TrafficStatusCardProps) => {
  const config = trafficConfig[level];
  const Icon = config.icon;

  return (
    <Card className={cn("border-2", config.borderColor, className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🚦</span>
          {area}
        </CardTitle>
        <CardDescription>Current traffic status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={cn("rounded-lg p-6 flex flex-col items-center text-center", config.bgColor)}>
          <Icon className={cn("w-16 h-16 mb-4", config.color)} />
          <h3 className={cn("text-2xl font-bold mb-2", config.color)}>
            {config.label}
          </h3>
          <p className="text-muted-foreground">
            {description || config.message}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
