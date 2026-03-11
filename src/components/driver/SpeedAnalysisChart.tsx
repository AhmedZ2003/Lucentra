import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SpeedData {
  time: number;
  speed: number;
}

interface SpeedAnalysisChartProps {
  data: SpeedData[];
}

const SpeedAnalysisChart = ({ data }: SpeedAnalysisChartProps) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Frames', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{ value: 'Speed (ms)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-card border border-border rounded-lg p-3 shadow-md">
                    <p className="text-sm text-card-foreground">
                      Frame: {label}
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      Speed: {payload[0].value} ms
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line 
            type="monotone" 
            dataKey="speed" 
            stroke="hsl(var(--primary))" 
            strokeWidth={3}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpeedAnalysisChart;