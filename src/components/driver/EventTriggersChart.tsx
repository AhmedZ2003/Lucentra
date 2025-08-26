import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'hsl(var(--destructive))';
      case 'medium':
        return 'hsl(var(--warning))';
      case 'low':
        return 'hsl(var(--success))';
      default:
        return 'hsl(var(--muted-foreground))';
    }
  };

  // Transform data for bar chart
  const chartData = data.map((event, index) => ({
    event: event.event.substring(0, 15) + (event.event.length > 15 ? '...' : ''),
    duration: event.duration,
    time: event.time,
    severity: event.severity,
    fill: getSeverityColor(event.severity)
  }));

  return (
    <div className="space-y-6">
      {data.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No events detected in this journey</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="event" 
                  stroke="hsl(var(--muted-foreground))"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: 'Duration (seconds)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  formatter={(value: any, name: any, props: any) => [
                    `${value}s`,
                    'Duration'
                  ]}
                  labelFormatter={(label: any, payload: any) => {
                    if (payload && payload[0]) {
                      const originalData = data.find(d => d.event.startsWith(label.replace('...', '')));
                      return originalData ? `${originalData.event} (at ${originalData.time} min)` : label;
                    }
                    return label;
                  }}
                />
                <Bar 
                  dataKey="duration" 
                  radius={[4, 4, 0, 0]} 
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor('high') }}></div>
              <span className="text-muted-foreground">High Severity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor('medium') }}></div>
              <span className="text-muted-foreground">Medium Severity</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: getSeverityColor('low') }}></div>
              <span className="text-muted-foreground">Low Severity</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Summary */}
      <div className="p-4 bg-card rounded-lg border border-border">
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