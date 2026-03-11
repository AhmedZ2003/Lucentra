import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface EventData {
  event: string;
  time: number;     // minutes from start
  duration: number; // seconds
  severity: "low" | "medium" | "high";
}

interface EventTriggersChartProps {
  fps?: number;
  data?: EventData[];
  framesToShow?: number;   // exact number of X-axis buckets
  tickStep?: number;       // X tick spacing (default 2 → 0,2,4,...)
}

const DEFAULT_FRAMES = 50;
const MIN_SIDE_PAD = 5;

const EventTriggersChart = ({
  fps = 30,
  data,
  framesToShow = DEFAULT_FRAMES,
  tickStep = 2,
}: EventTriggersChartProps) => {
  // Demo events
  const demoEvents: EventData[] = [
    { event: "Overspeeding",            time: 0.10, duration: 2.0, severity: "high" },
    { event: "Pedestrian Endangerment", time: 0.35, duration: 1.5, severity: "medium" },
    { event: "Close Following",         time: 0.55, duration: 1.2, severity: "low" },
  ];
  const events = data && data.length ? data : demoEvents;

  // const EVENT_COLOR: Record<string, string> = {
  //   "Overspeeding": "#60A5FA",
  //   "Pedestrian Endangerment": "#F59E0B",
  //   "Close Following": "#10B981",
  // };
  // const SEVERITY_COLOR: Record<EventData["severity"], string> = {
  //   high: "#ef4444",
  //   medium: "#f59e0b",
  //   low: "#10b981",
  // };

    const EVENT_PALETTE = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // green
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#14b8a6", // teal
    ];

    const SEVERITY_COLOR: Record<EventData["severity"], string> = {
      high: "#ef4444",
      medium: "#f59e0b",
      low: "#10b981",
    };

  const timeToFrame = (t: number) => Math.floor(t);
  const secsToFrames = (d: number) => Math.floor(d);

  const buildFull = () => {
    const uniqueEvents = Array.from(new Set(events.map((d) => d.event)));
    let maxEnd = 0;
    for (const e of events) {
      const end = timeToFrame(e.time) + secsToFrames(e.duration);
      if (end > maxEnd) maxEnd = end;
    }
    const full = Array.from({ length: maxEnd + 1 }, (_, i) => {
      const row: Record<string, number> = { frame: i };
      uniqueEvents.forEach((ev) => (row[ev] = 0));
      return row;
    });
    events.forEach((ev) => {
      const start = timeToFrame(ev.time);
      const end = start + secsToFrames(ev.duration);
      for (let i = start; i <= end && i < full.length; i++) full[i][ev.event] = 1;
    });
    return { full, uniqueEvents };
  };

  // Centered downsample → always framesToShow buckets
  const createFixedTimeline = () => {
    const { full, uniqueEvents } = buildFull();
    const B = framesToShow;
    const usable = Math.max(1, B - MIN_SIDE_PAD * 2);

    const mkRow = (i: number) => {
      const row: Record<string, number> = { frame: i };
      uniqueEvents.forEach((ev) => (row[ev] = 0));
      return row;
    };

    const buckets: Array<Record<string, number>> = Array.from({ length: B }, (_, i) => mkRow(i));

    if (full.length <= usable) {
      const offset = MIN_SIDE_PAD + Math.floor((usable - full.length) / 2);
      for (let i = 0; i < full.length; i++) {
        const dst = offset + i;
        if (dst < B) {
          uniqueEvents.forEach((ev) => {
            if (full[i][ev] === 1) buckets[dst][ev] = 1;
          });
        }
      }
    } else {
      const start = MIN_SIDE_PAD;
      const denom = Math.max(full.length - 1, 1);
      for (let i = 0; i < full.length; i++) {
        const b = start + Math.floor((i * (usable - 1)) / denom);
        if (b >= 0 && b < B) {
          uniqueEvents.forEach((ev) => {
            if (full[i][ev] === 1) buckets[b][ev] = 1;
          });
        }
      }
    }
    return { frames: buckets, uniqueEvents };
  };

  const { frames: chartData, uniqueEvents } = createFixedTimeline();

  // const colorForEvent = (ev: string) => {
  //   if (EVENT_COLOR[ev]) return EVENT_COLOR[ev];
  //   const rank = { low: 0, medium: 1, high: 2 } as const;
  //   let strongest: EventData["severity"] | null = null;
  //   events.filter((d) => d.event === ev).forEach((d) => {
  //     if (!strongest || rank[d.severity] > rank[strongest]) strongest = d.severity;
  //   });
  //   return strongest ? SEVERITY_COLOR[strongest] : "#64748b";
  // };

    const colorForEvent = (ev: string, index: number) => {
    const paletteColor = EVENT_PALETTE[index % EVENT_PALETTE.length];

    // If you want special named events to always keep fixed colors, define them here
    const fixedEventColors: Record<string, string> = {
      "Pedestrian Endangerment": "#ef4444",
      "Trailgating": "#3b82f6",
      "Overspeeding": "#f59e0b",
      "Close Following": "#10b981",
    };

      if (fixedEventColors[ev]) return fixedEventColors[ev];

      return paletteColor;
    };

  // --- NEW: explicit even-number ticks: 0,2,4,6,... ---
  const xTicks = Array.from(
    { length: Math.floor((framesToShow - 1) / tickStep) + 1 },
    (_, i) => i * tickStep
  );

  return (
    <div className="space-y-6">

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              type="number"
              dataKey="frame"
              domain={[0, framesToShow - 1]}
              ticks={xTicks}                 // << show 0,2,4,6,...
              allowDecimals={false}
              label={{ value: "Frames", position: "insideBottom", offset: -5 }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 1]}
              allowDecimals={false}
              label={{ value: "Event Occurred", angle: -90, position: "insideLeft" }}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const triggered = payload
                    .filter((p) => p && typeof p.value === "number" && p.value === 1)
                    .map((p) => p.name)
                    .join(", ");
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-md">
                      <p className="text-sm text-card-foreground">Frame: {label}</p>
                      <p className="text-sm font-semibold text-primary">
                        {triggered ? `Event(s): ${triggered}` : "No event"}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            
            {uniqueEvents.map((ev,index) => (
              <Line
                key={ev}
                type="stepAfter"
                dataKey={ev}
                stroke={colorForEvent(ev, index)}
                dot={false}
                strokeWidth={3}
                isAnimationActive={false}
              />
            ))}

          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EventTriggersChart;

