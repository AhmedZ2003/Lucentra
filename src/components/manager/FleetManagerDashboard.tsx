import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SpeedAnalysisChart from "@/components/driver/SpeedAnalysisChart";
import EventTriggersChart from "@/components/manager/EventTriggersChart";
import { db } from "@/integrations/FireBase/firebase";
import { Users, Eye, Activity, AlertTriangle, Download, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Cloudinary } from "@cloudinary/url-gen";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DriverRecord {
  id: string;
  name: string;
  speed: number;
  videoUrl: string;
  annotatedVideoUrl?: string;
  annotatedVideoPublicId?: string;
  dangerEvents?: {
    event: string;
    time: number;
    duration: number;
    severity: "low" | "medium" | "high";
  }[];
  updatedAt?: string;
}

const cld = new Cloudinary({
  cloud: {
    cloudName: "dppbnxmov",
  },
});

// ==========================
// Download Speed Data Modal
// ==========================
const DownloadSpeedModal = ({ 
  speedData, 
  isOpen, 
  onClose,
  driverName
}: { 
  speedData: { time: number; speed: number }[];
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
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
        return speedData.filter(d => d.time >= startFrame && d.time <= endFrame);
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
      ...data.map(d => `frame_${d.time},${d.speed}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${driverName}_speed_data_${downloadOption}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const data = filterData();
    const jsonObj = data.reduce((acc, d) => {
      acc[`frame_${d.time}`] = d.speed;
      return acc;
    }, {} as Record<string, number>);
    
    const blob = new Blob([JSON.stringify(jsonObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${driverName}_speed_data_${downloadOption}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsTXT = () => {
    const data = filterData();
    const txtContent = data.map(d => `frame_${d.time} ${d.speed}`).join('\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${driverName}_speed_data_${downloadOption}.txt`;
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
          <CardDescription>Download {driverName}'s speed data</CardDescription>
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
  driverName,
}: {
  eventData: { event: string; time: number; duration: number; severity: "low" | "medium" | "high" }[];
  isOpen: boolean;
  onClose: () => void;
  driverName: string;
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
    a.download = `${driverName}_danger_events_${downloadOption}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const data = filterData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${driverName}_danger_events_${downloadOption}.json`;
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
    a.download = `${driverName}_danger_events_${downloadOption}.txt`;
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
          <CardDescription>Download {driverName}'s event data</CardDescription>
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

const FleetManagerDashboard = () => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);
  const [driverSpeedData, setDriverSpeedData] = useState<{ time: number; speed: number }[]>([]);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);            //States to download Speed Data
  const [isEventDownloadModalOpen, setIsEventDownloadModalOpen] = useState(false);  //States to download Event Data
  const [videoFPS, setVideoFPS] = useState<number>(30); // Video FPS
  const [driverDangerEvents, setDriverDangerEvents] = useState<
    { event: string; time: number; duration: number; severity: "low" | "medium" | "high" }[]
  >([]);

  const calculateStats = () => {
    if (driverSpeedData.length === 0) return { avg: 0, max: 0, min: 0 };
    const speeds = driverSpeedData.map(d => Math.max(0, d.speed));
    const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const max = Math.max(...speeds);
    const min = Math.min(...speeds);
    return { avg: avg.toFixed(2), max: max.toFixed(2), min: min.toFixed(2) };
  };
  const stats = calculateStats();

  const { profileName } = useAuth();

  // Fetch Driver's Processed Annotated Video
  const getDriverVideoUrl = (driver: DriverRecord) => {
    if (driver.annotatedVideoUrl) {
      return driver.annotatedVideoUrl;
    }

    if (driver.annotatedVideoPublicId) {
      return cld.video(driver.annotatedVideoPublicId).toURL();
    }

    return driver.videoUrl;
  };

  // Fetch all driver speeds from Firestore
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "driverSpeeds"));
        const data: DriverRecord[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<DriverRecord, "id">),
        }));
        setDrivers(data);
      } catch (err) {
        console.error("Error fetching drivers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  // Fetch the selected driver's speed and event data
  // const fetchDriverSpeedData = async (driverId: string) => {
  //     try {
  //       setLoading(true);
  //       const driverRef = doc(db, "driverSpeeds", driverId);
  //       const driverDoc = await getDoc(driverRef);

  //       if (driverDoc.exists()) {
  //         const data = driverDoc.data();

  //         if (data && Array.isArray(data.speedData)) {
  //           const speedData = data.speedData.map((entry: { frame: number; speed: number }) => ({
  //             time: entry.frame,
  //             speed: entry.speed,
  //           }));
  //           setDriverSpeedData(speedData);
  //         } else {
  //           setDriverSpeedData([]);
  //           console.error("No speed data found for this driver.");
  //         }

  //         if (data && Array.isArray(data.dangerEvents)) {
  //           const cleanedEvents = data.dangerEvents.filter(
  //             (item: any) =>
  //               item &&
  //               item.event &&
  //               !["none", "null", "undefined"].includes(String(item.event).trim().toLowerCase())
  //           );
  //           setDriverDangerEvents(cleanedEvents);
  //         } else {
  //           setDriverDangerEvents([]);
  //         }
  //       } else {
  //         setDriverSpeedData([]);
  //         setDriverDangerEvents([]);
  //         console.error("Driver not found or has no speed data.");
  //       }
  //     } catch (err) {
  //       console.error("Error fetching driver speed data:", err);
  //       setDriverSpeedData([]);
  //       setDriverDangerEvents([]);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const fetchDriverSpeedData = async (driverId: string) => {
      try {
        setLoading(true);
        const driverRef = doc(db, "driverSpeeds", driverId);
        const driverDoc = await getDoc(driverRef);

        if (driverDoc.exists()) {
          const data = driverDoc.data();

          if (data && Array.isArray(data.speedData)) {
            const speedData = data.speedData.map((entry: { frame: number; speed: number }) => ({
              time: entry.frame,
              speed: entry.speed,
            }));
            setDriverSpeedData(speedData);
          } else {
            setDriverSpeedData([]);
            console.error("No speed data found for this driver.");
          }

          if (data && Array.isArray(data.dangerEvents)) {
            const cleanedEvents = data.dangerEvents.filter(
              (item: any) =>
                item &&
                item.event &&
                !["none", "null", "undefined"].includes(String(item.event).trim().toLowerCase())
            );
            setDriverDangerEvents(cleanedEvents);
          } else {
            setDriverDangerEvents([]);
          }
        } else {
          setDriverSpeedData([]);
          setDriverDangerEvents([]);
          console.error("Driver not found or has no speed data.");
        }
      } catch (err) {
        console.error("Error fetching driver speed data:", err);
        setDriverSpeedData([]);
        setDriverDangerEvents([]);
      } finally {
        setLoading(false);
      }
    };

    const getMostTriggeredEvent = () => {
      if (driverDangerEvents.length === 0) return "N/A";

      const counts = driverDangerEvents.reduce((acc, item) => {
        acc[item.event] = (acc[item.event] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    };

  // Calculate FPS from video metadata when driver is selected
  useEffect(() => {
    if (selectedDriver && driverSpeedData.length > 0) {
      const video = document.getElementById("driver-video") as HTMLVideoElement;
      if (video) {
        const handleMetadata = () => {
          // Calculate FPS from video duration and total frames
          const totalFrames = driverSpeedData[driverSpeedData.length - 1].time;
          const duration = video.duration;
          if (duration > 0) {
            const calculatedFPS = totalFrames / duration;
            setVideoFPS(calculatedFPS);
            console.log(`Calculated FPS: ${calculatedFPS.toFixed(2)}`);
          }
        };
        
        if (video.readyState >= 1) {
          handleMetadata();
        } else {
          video.addEventListener('loadedmetadata', handleMetadata);
          return () => video.removeEventListener('loadedmetadata', handleMetadata);
        }
      }
    }
  }, [selectedDriver, driverSpeedData]);

  // Render the driver's details and the speed chart
  const handleViewDetails = (driver: DriverRecord) => {
      setSelectedDriver(driver);
      setDriverSpeedData([]);
      setDriverDangerEvents([]);
      setCurrentSpeed(null);
      fetchDriverSpeedData(driver.id);
    };

  // Show video and speed chart for selected driver
  const renderDriverDetails = () => {
    if (selectedDriver && driverSpeedData.length > 0) {
      return (
        <div className="mt-6 space-y-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Driver Details</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Video Display */}
              <div className="relative mt-4">
                <video
                  id="driver-video"
                  width="100%"
                  controls
                  onTimeUpdate={handleTimeUpdate}
                >
                  <source src={getDriverVideoUrl(selectedDriver)} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                {currentSpeed !== null && (
                  <div className="absolute top-4 left-4 bg-background/80 text-foreground px-3 py-1 rounded-md text-sm shadow-md">
                    Speed: {currentSpeed.toFixed(2)} ms
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return null;
  };

  // Track video time and calculate the corresponding speed
  const handleTimeUpdate = () => {
    const video = document.getElementById("driver-video") as HTMLVideoElement;
    if (!video || driverSpeedData.length === 0) return;

    const currentTime = video.currentTime;
    
    // Calculate frame number more accurately using round instead of floor
    const frameNumber = Math.round(currentTime * videoFPS);
    
    // Find the matching speed data entry
    const matchingData = driverSpeedData.find(d => d.time === frameNumber);
    
    if (matchingData) {
      setCurrentSpeed(matchingData.speed);
    } else {
      // If exact match not found, find closest frame
      const closestData = driverSpeedData.reduce((prev, curr) => {
        return Math.abs(curr.time - frameNumber) < Math.abs(prev.time - frameNumber) ? curr : prev;
      });
      setCurrentSpeed(closestData.speed);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading driver records...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <DownloadSpeedModal 
        speedData={driverSpeedData} 
        isOpen={isDownloadModalOpen} 
        onClose={() => setIsDownloadModalOpen(false)}
        driverName={selectedDriver?.name || "driver"}
      />
      <DownloadEventsModal
      eventData={driverDangerEvents}
      isOpen={isEventDownloadModalOpen}
      onClose={() => setIsEventDownloadModalOpen(false)}
      driverName={selectedDriver?.name || "driver"}
    />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Manager Dashboard</h1>
              <p className="text-muted-foreground">Monitor and manage your drivers' performance</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <p className="font-semibold text-foreground">{profileName}</p>
            </div>
          </div>
        </div>

        {/* Drivers List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Users className="h-5 w-5 text-primary" />
              Driver Records
            </CardTitle>
            <CardDescription>
              Overview of drivers who uploaded video data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No record found.
              </p>
            ) : (
              <div className="space-y-4">
                {drivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">{driver.name}</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(driver)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Display Driver Details and Speed Chart */}
        {selectedDriver && driverSpeedData.length > 0 && (
          <div className="mt-6 space-y-8">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Driver Details</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">Name: {selectedDriver.name}</p>
              </CardContent>
            </Card>

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

            {/* Speed Chart */}
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
                <SpeedAnalysisChart data={driverSpeedData} />
              </CardContent>
            </Card>

            {/* Event Triggers Chart */}
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
            data={driverDangerEvents}
            fps={videoFPS || 30}
            framesToShow={Math.max(driverSpeedData.length, 1)}
          />
        </CardContent>
      </Card>
          </div>
        )}
        {/* Display Driver Details and Speed Chart */}
        {renderDriverDetails()}
      </div>
    </div>
  );
};

export default FleetManagerDashboard;
