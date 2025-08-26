import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface EventData {
  event: string;
  time: number;
  duration: number;
  severity: 'low' | 'medium' | 'high';
}

interface EventTriggersChartProps {
  data: EventData[];
}

const EventTriggersChart = ({ data }: EventTriggersChartProps) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'low':
        return <Info className="h-4 w-4 text-success" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No events detected in this journey</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((event, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {getSeverityIcon(event.severity)}
                <div>
                  <p className="font-medium text-foreground">{event.event}</p>
                  <p className="text-sm text-muted-foreground">
                    At {event.time} min • Duration: {event.duration}s
                  </p>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={getSeverityColor(event.severity)}
              >
                {event.severity.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}
      
      {/* Summary */}
      <div className="mt-6 p-4 bg-card rounded-lg border border-border">
        <h4 className="font-semibold text-card-foreground mb-2">Event Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-destructive">
              {data.filter(e => e.severity === 'high').length}
            </p>
            <p className="text-xs text-muted-foreground">High Severity</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">
              {data.filter(e => e.severity === 'medium').length}
            </p>
            <p className="text-xs text-muted-foreground">Medium Severity</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-success">
              {data.filter(e => e.severity === 'low').length}
            </p>
            <p className="text-xs text-muted-foreground">Low Severity</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventTriggersChart;