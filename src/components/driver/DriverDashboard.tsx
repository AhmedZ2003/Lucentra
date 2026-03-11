import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, Activity, AlertTriangle, Info, Loader2, FileVideo, X, Download, ChevronDown } from "lucide-react";
import { useState, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import VideoPlayer from "@/components/driver/VideoPlayer"; 
import EventTriggersChart from "@/components/driver/EventTriggersChart"; 
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/integrations/FireBase/firebase"; 
import { doc, setDoc } from "firebase/firestore";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// Cloudinary's JavaScript SDK for Browser
import { Cloudinary } from "@cloudinary/url-gen";

// Initialize Cloudinary instance
const cld = new Cloudinary({
  cloud: {
    cloudName: "dppbnxmov", // Your Cloudinary cloud name
  },
});

// ==========================
// Download Speed Data Modal
// ==========================
const DownloadSpeedModal = ({ 
  speedData, 
  isOpen, 
  onClose 
}: { 
  speedData: { frame: number; speed: number }[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [downloadOption, setDownloadOption] = useState<'all' | 'range' | 'threshold'>('all');
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(speedData.length - 1);
  const [threshold, setThreshold] = useState<number>(50);

  const filterData = () => {
    switch (downloadOption) {
      case 'all':
        return speedData;
      case 'range':
        return speedData.filter(d => d.frame >= startFrame && d.frame <= endFrame);
      case 'threshold':
        return speedData.filter(d => d.speed >= threshold);
      default:
        return speedData;
    }
  };

  const downloadAsCSV = () => {
    const data = filterData();
    const csvContent = [
      'frame_number,frame_speed',
      ...data.map(d => `frame_${d.frame},${d.speed}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed_data_${downloadOption}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const data = filterData();
    const jsonObj = data.reduce((acc, d) => {
      acc[`frame_${d.frame}`] = d.speed;
      return acc;
    }, {} as Record<string, number>);
    
    const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed_data_${downloadOption}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsTXT = () => {
    const data = filterData();
    const txtContent = data.map(d => `frame_${d.frame} ${d.speed}`).join('\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed_data_${downloadOption}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Speed Data
          </CardTitle>
          <CardDescription>Choose download options and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Download Option Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Download Option</label>
            <select 
              value={downloadOption} 
              onChange={(e) => setDownloadOption(e.target.value as any)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            >
              <option value="all">All Frames</option>
              <option value="range">Frame Range</option>
              <option value="threshold">Above Threshold</option>
            </select>
          </div>

          {/* Frame Range Inputs */}
          {downloadOption === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Frame</label>
                <input
                  type="number"
                  min={0}
                  max={speedData.length - 1}
                  value={startFrame}
                  onChange={(e) => setStartFrame(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Frame</label>
                <input
                  type="number"
                  min={0}
                  max={speedData.length - 1}
                  value={endFrame}
                  onChange={(e) => setEndFrame(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                />
              </div>
            </div>
          )}

          {/* Threshold Input */}
          {downloadOption === 'threshold' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Speed Threshold (ms)</label>
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-background border border-border rounded-md"
              />
            </div>
          )}

          {/* Preview Count */}
          <div className="text-sm text-muted-foreground">
            {filterData().length} frame(s) will be downloaded
          </div>

          {/* Download Format Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={downloadAsCSV}>
                Download as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsJSON}>
                Download as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsTXT}>
                Download as TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================
// Download Event Data Modal
// ==========================
const DownloadEventsModal = ({
  eventData,
  isOpen,
  onClose,
}: {
  eventData: { event: string; time: number; duration: number; severity: "low" | "medium" | "high" }[];
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [downloadOption, setDownloadOption] = useState<"all" | "event" | "severity">("all");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "low" | "medium" | "high">("all");

  const uniqueEvents = Array.from(new Set(eventData.map((e) => e.event))).filter(Boolean);

  const filterData = () => {
    switch (downloadOption) {
      case "event":
        return selectedEvent === "all"
          ? eventData
          : eventData.filter((e) => e.event === selectedEvent);
      case "severity":
        return selectedSeverity === "all"
          ? eventData
          : eventData.filter((e) => e.severity === selectedSeverity);
      default:
        return eventData;
    }
  };

  const downloadAsCSV = () => {
    const data = filterData();
    const csvContent = [
      "event,start_frame,duration_frames,severity",
      ...data.map((e) => `${e.event},${e.time},${e.duration},${e.severity}`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danger_events_${downloadOption}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const data = filterData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danger_events_${downloadOption}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsTXT = () => {
    const data = filterData();
    const txtContent = data
      .map((e) => `event=${e.event}, start_frame=${e.time}, duration_frames=${e.duration}, severity=${e.severity}`)
      .join("\n");

    const blob = new Blob([txtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danger_events_${downloadOption}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Event Data
          </CardTitle>
          <CardDescription>Choose event download options and format</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Download Option</label>
            <select
              value={downloadOption}
              onChange={(e) => setDownloadOption(e.target.value as any)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md"
            >
              <option value="all">All Events</option>
              <option value="event">Specific Event</option>
              <option value="severity">By Severity</option>
            </select>
          </div>

          {downloadOption === "event" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Event</label>
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md"
              >
                <option value="all">All Events</option>
                {uniqueEvents.map((eventName) => (
                  <option key={eventName} value={eventName}>
                    {eventName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {downloadOption === "severity" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Severity</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md"
              >
                <option value="all">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {filterData().length} event(s) will be downloaded
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Download
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={downloadAsCSV}>Download as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsJSON}>Download as JSON</DropdownMenuItem>
              <DropdownMenuItem onClick={downloadAsTXT}>Download as TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// ==========================
// Small Buffer Indicator
// ==========================
const BufferIndicator = () => {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="w-full">
        {/* shimmer bar */}
        <div className="relative h-2 w-full overflow-hidden rounded bg-muted">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Analyzing video…</p>
    </div>
  );
};

// ==========================
// Upload component
// ==========================
const VideoUpload = ({ onUpload }: { onUpload: (file: File) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("video/") || /\.(mp4|webm|ogv|ogg|mov|mkv|avi|m3u8|mpd|mp4v)$/i.test(file.name)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (files && files.length > 0) setSelectedFile(files[0]);
  };

  const handleUpload = () => { if (selectedFile) onUpload(selectedFile); };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024; const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const detectedExt = selectedFile?.name.split(".").pop()?.toLowerCase();

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,.m3u8,.mpd"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Upload Journey Video</h3>
            <p className="text-muted-foreground mb-4">Drag and drop your video, or click to browse</p>
            <p className="text-sm text-muted-foreground">
              Supports MP4, WebM, Ogg, MOV, MKV, AVI, HLS (.m3u8), DASH (.mpd)
            </p>
          </div>
          <Button variant="outline" type="button">
            <Upload className="mr-2 h-4 w-4" />
            Choose File
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileVideo className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} {detectedExt ? `• .${detectedExt}` : ""}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={(e) => { e.stopPropagation(); handleUpload(); }} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            <Upload className="mr-2 h-4 w-4" />
            Upload and Analyze Video
          </Button>
        </div>
      )}
    </div>
  );
};

// ==========================
// Speed chart
// ==========================
const SpeedAnalysisChart = ({ data }: { data: { frame: number; speed: number }[] }) => (
  <div className="w-full h-64">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="frame"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: "Frame Number", position: "insideBottom", offset: -5 }}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: "Speed (ms)", angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-md">
                  <p className="text-sm text-card-foreground">Frame: {label}</p>
                  <p className="text-sm font-semibold text-primary">
                    Speed: {typeof payload[0].value === "number" ? (payload[0].value as number).toFixed(2) : payload[0].value} ms
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
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>
);



// ==========================
// Driver Dashboard
// ==========================
const DriverDashboard = () => {
  const [hasUploadedVideo, setHasUploadedVideo] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [speedData, setSpeedData] = useState<{ frame: number; speed: number }[]>([]);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [formatNotice, setFormatNotice] = useState<string>("");
  const [detectedFormat, setDetectedFormat] = useState<string>("");
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);            //States to download Speed Data
  const [isEventDownloadModalOpen, setIsEventDownloadModalOpen] = useState(false);  //States to download Event Data
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string>("");
  // const [dangerEvents, setDangerEvents] = useState<(string | null)[]>([]);
  const [dangerEvents, setDangerEvents] = useState<
    { event: string; time: number; duration: number; severity: "low" | "medium" | "high" }[]
  >([]);
  const [isDpflowComplete, setIsDpflowComplete] = useState(false);
  const [isDangerComplete, setIsDangerComplete] = useState(false);

  const { user, profile, profileName } = useAuth();

  // Stats (clamp negatives to 0)
  const calculateStats = () => {
    if (speedData.length === 0) return { avg: 0, max: 0, min: 0 };
    const speeds = speedData.map(d => Math.max(0, d.speed));
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const max = Math.max(...speeds);
    const min = Math.min(...speeds);
    return { avg: avg.toFixed(2), max: max.toFixed(2), min: min.toFixed(2) };
  };
  const stats = calculateStats();

  const normalizeDangerEvents = (
      events: any[],
      fps: number = 30
    ): { event: string; time: number; duration: number; severity: "low" | "medium" | "high" }[] => {
      if (!Array.isArray(events)) return [];

      return events
        .filter(Boolean)
        .map((item) => {
          // Case 1: backend already returns full objects
          if (typeof item === "object" && item.event) {
            return {
              event: String(item.event),
              time: Number(item.time ?? 0),
              duration: Number(item.duration ?? 1),
              severity: (item.severity ?? "medium") as "low" | "medium" | "high",
            };
          }

          // Case 2: backend returns simple strings like "Pedestrian Endangerment"
          return {
            event: String(item),
            time: 0,
            duration: 1,
            severity: "medium" as const,
          };
        });
    };

    const getMostTriggeredEvent = () => {
        if (dangerEvents.length === 0) return "N/A";

        const counts = dangerEvents.reduce((acc, item) => {
          const key = item.event?.trim();
          if (!key) return acc;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        return top ? top[0] : "N/A";
      };

  const handleVideoUpload = async (file: File) => {
    setHasUploadedVideo(true);
    setError(""); setFormatNotice("");
    setUploadedVideoFile(file);

    setAnalysisComplete(false);
    setIsDpflowComplete(false);
    setIsDangerComplete(false);
    setProcessedVideoUrl("");
    setDangerEvents([]);

    // /* =========================
    //    Helpers (format detection)
    //    ========================= */
    const EXT_TO_MIME: Record<string, string> = {
      mp4: "video/mp4",
      webm: "video/webm",
      ogv: "video/ogg",
      ogg: "video/ogg",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      m3u8: "application/vnd.apple.mpegurl",
      mpd: "application/dash+xml",
    };
    const guessMimeFromName = (name: string, fallback?: string) => {
      const ext = name.split(".").pop()?.toLowerCase() || "";
      return EXT_TO_MIME[ext] || fallback || "video/mp4";
    };

    const canBrowserPlay = (mime: string) => {
    const v = document.createElement("video"); return v.canPlayType(mime);
    };

    // Detect / hint format
    const mimeGuess = guessMimeFromName(file.name, file.type || undefined);
    setDetectedFormat(mimeGuess);
    const support = canBrowserPlay(mimeGuess);
    if (mimeGuess === EXT_TO_MIME.m3u8) setFormatNotice("HLS (.m3u8) detected. Safari plays this natively; other browsers typically require hls.js.");
    else if (mimeGuess === EXT_TO_MIME.mpd) setFormatNotice("DASH (.mpd) detected. Most browsers require dash.js.");
    else if (!support) setFormatNotice(`This format (${mimeGuess}) may not play in all browsers. Prefer MP4 (H.264/AAC) for widest compatibility.`);

    // Preview URL
    const blob = new Blob([file], { type: mimeGuess });
    const videoUrl = URL.createObjectURL(blob);
    setUploadedVideoUrl(videoUrl);


    // Prepare form data
    // const formData = new FormData();
    // formData.append("video", file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Car Footage"); // Replace with your upload preset

    try {
      // FLEXINET
      // const response = await fetch("http://localhost:8000/api/predict-video-speeds", {
      // method: "POST",
      // body: formData,
      // });


      // CONV-LSTM
      // const response = await fetch("http://localhost:5000/api/analyze-video", {
      //   method: "POST",
      //   body: formData,
      // });

      // ORIGINAL VIDEO UPLOAD TO CLOUDINARY!
      const cloudinaryRes = await fetch(`https://api.cloudinary.com/v1_1/dppbnxmov/video/upload`, {
      method: "POST",
      body: formData,
    });

      const cloudinaryData = await cloudinaryRes.json();

      if (!cloudinaryRes.ok) {
        throw new Error(cloudinaryData.error?.message || "Cloudinary upload failed");
      }

      // Get Cloudinary URL and Public ID
      const uploadedVideoUrl = cloudinaryData.secure_url;
      const publicId = cloudinaryData.public_id;
      setUploadedVideoUrl(uploadedVideoUrl);

      // Optical Flow
      // const response = await fetch("http://localhost:8000/api/analyze-video", {
      //   method: "POST",
      //   body: formData,
      // });

    //   const response = await fetch("http://localhost:8000/api/analyze-video", {
    //   method: "POST",
    //   body: JSON.stringify({ videoUrl: uploadedVideoUrl }),
    //   headers: { "Content-Type": "application/json" },
    // });

    //   if (!response.ok) {
    //     throw new Error(`Server error: ${response.statusText}`);
    //   }

    //   const result = await response.json();

    //   // Convert returned speeds[] -> chart data (force negatives to 0 & non-finite to 0)
    //   const chartData = (result.speeds as number[]).map((speed, index) => ({
    //     frame: index,
    //     speed: Number(Math.max(0, Number.isFinite(speed) ? speed : 0).toFixed(2)),
    //   }));

    //   setSpeedData(chartData);
    //   setAnalysisComplete(true);

    // const response = await fetch("http://localhost:8000/api/analyze-video", {
    //     method: "POST",
    //     body: JSON.stringify({ videoUrl: uploadedVideoUrl }),
    //     headers: { "Content-Type": "application/json" },
    //   });

    //   if (!response.ok) {
    //     throw new Error(`DPFlow server error: ${response.statusText}`);
    //   }

    //   const result = await response.json();

    //   const chartData = (result.speeds as number[]).map((speed, index) => ({
    //     frame: index,
    //     speed: Number(Math.max(0, Number.isFinite(speed) ? speed : 0).toFixed(2)),
    //   }));

    //   setSpeedData(chartData);
    //   setIsDpflowComplete(true);

    // // Now call danger detection after DPFlow is done
    //   const dangerResponse = await fetch("http://localhost:8001/api/detect-danger", {
    //     method: "POST",
    //     body: JSON.stringify({
    //       videoUrl: uploadedVideoUrl,
    //       frameWeights: chartData.map((d) => d.speed),
    //     }),
    //     headers: { "Content-Type": "application/json" },
    //   });

    //   if (!dangerResponse.ok) {
    //     throw new Error(`Danger detection server error: ${dangerResponse.statusText}`);
    //   }

    //   const dangerResult = await dangerResponse.json();

      const dpflowPromise = fetch("http://localhost:8000/api/analyze-video", {
        method: "POST",
        body: JSON.stringify({ videoUrl: uploadedVideoUrl }),
        headers: { "Content-Type": "application/json" },
      });

      const dangerPromise = fetch("http://localhost:8001/api/detect-danger", {
        method: "POST",
        body: JSON.stringify({
          videoUrl: uploadedVideoUrl,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const [dpflowResponse, dangerResponse] = await Promise.all([dpflowPromise, dangerPromise]);

      if (!dpflowResponse.ok) {
        throw new Error(`DPFlow server error: ${dpflowResponse.statusText}`);
      }

      if (!dangerResponse.ok) {
        throw new Error(`Danger detection server error: ${dangerResponse.statusText}`);
      }

      const [dpflowResult, dangerResult] = await Promise.all([
        dpflowResponse.json(),
        dangerResponse.json(),
      ]);

      const chartData = (dpflowResult.speeds as number[]).map((speed, index) => ({
        frame: index,
        speed: Number(Math.max(0, Number.isFinite(speed) ? speed : 0).toFixed(2)),
      }));

      setSpeedData(chartData);
      setIsDpflowComplete(true);

      const normalizedEvents = normalizeDangerEvents(dangerResult.events || []);

      setProcessedVideoUrl(dangerResult.annotatedVideoUrl || uploadedVideoUrl);
      setDangerEvents(normalizedEvents);
      setIsDangerComplete(true);

      // Final UI should appear only when both are done
      setAnalysisComplete(true);

      // Save to Firestore after analysis complete
      if (profileName && user?.uid) {
      const driverName = profileName;
      await setDoc(doc(db, "driverSpeeds", user?.uid), {
        name: driverName,
        // videoUrl: uploadedVideoUrl,
        // cloudinaryPublicId: publicId,
        annotatedVideoUrl: dangerResult.annotatedVideoUrl || "",
        annotatedVideoPublicId: dangerResult.annotatedVideoPublicId || "",
        speedData: chartData,
        dangerEvents: normalizedEvents,
        updatedAt: new Date().toISOString(),
      });
    }

    } catch (err) {
      console.error("Error uploading video:", err);
      setError(err instanceof Error ? err.message : "Failed to analyze video");

      // Fallback mock data (clamped to 0) — buffer sign will switch off once we set complete
      setTimeout(() => {
        const mockData = Array.from({ length: 100 }, (_, i) => ({
          frame: i,
          speed: Math.max(0, Math.random() * 10 + 50),
        }));
        setSpeedData(mockData);
        setAnalysisComplete(true);
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <DownloadSpeedModal 
        speedData={speedData} 
        isOpen={isDownloadModalOpen} 
        onClose={() => setIsDownloadModalOpen(false)} 
      />

      <DownloadEventsModal
        eventData={dangerEvents}
        isOpen={isEventDownloadModalOpen}
        onClose={() => setIsEventDownloadModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Driver Dashboard</h1>
              <p className="text-muted-foreground">Upload and analyze your journey videos</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <p className="font-semibold text-foreground">{profileName}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.avg} ms</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Speed</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.max} ms</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Min Speed</p>
                  <p className="text-2xl font-bold text-card-foreground">{stats.min} ms</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">Most Triggered Event</p>
                   <p className="text-2xl font-bold text-card-foreground">{getMostTriggeredEvent()}</p>
                 </div>
                 <AlertTriangle className="h-8 w-8 text-primary" />
               </div>
             </CardContent>
           </Card>
        </div>

        {/* Video Upload */}
        {!hasUploadedVideo && (
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Upload className="h-5 w-5 text-primary" />
                Upload Journey Video
              </CardTitle>
              <CardDescription>Upload your journey video for speed analysis and event detection</CardDescription>
            </CardHeader>
            <CardContent>
              <VideoUpload onUpload={handleVideoUpload} />
            </CardContent>
          </Card>
        )}

        {/* Format Notice */}
        {formatNotice && (
          <Card className="mb-6 bg-card border-border">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm text-card-foreground"><strong>Format:</strong> {detectedFormat}</p>
                <p className="text-sm text-muted-foreground mt-1">{formatNotice}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="mt-8 bg-destructive/10 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Buffering */}
        {hasUploadedVideo && !analysisComplete && (
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Activity className="h-5 w-5 text-primary animate-pulse" />
                Analyzing Video...
              </CardTitle>
              <CardDescription>Processing your video for speed analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <BufferIndicator />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {analysisComplete && (
          <div className="space-y-8">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Speed Analysis
                </CardTitle>
                <CardDescription>Vehicle speed per frame</CardDescription>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setIsDownloadModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Data
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <SpeedAnalysisChart data={speedData} />
              </CardContent>
            </Card>

            {/* <VideoPlayer videoUrl={uploadedVideoUrl} videoFile={uploadedVideoFile} speedData={speedData} /> */}
            <VideoPlayer
              videoUrl={processedVideoUrl || uploadedVideoUrl}
              videoFile={null}
              speedData={speedData}
            />
            

            <Card className="bg-card border-border">
              <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-card-foreground">
                          <AlertTriangle className="h-5 w-5 text-primary" />
                          Event Triggers
                        </CardTitle>
                        <CardDescription>Detected danger events across the video timeline</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEventDownloadModalOpen(true)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Events
                      </Button>
                    </div>
                  </CardHeader>
              <CardContent>
                <EventTriggersChart
                    data={dangerEvents}
                    fps={30}
                    framesToShow={Math.max(speedData.length, 1)}
                  />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;

