import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Upload, BarChart3, Activity, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import VideoUpload from "./VideoUpload";
import SpeedAnalysisChart from "./SpeedAnalysisChart";
import EventTriggersChart from "./EventTriggersChart";

const DriverDashboard = () => {
  const [hasUploadedVideo, setHasUploadedVideo] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Mock data for when analysis is complete
  const mockSpeedData = [
    { time: 0, speed: 0 },
    { time: 5, speed: 25 },
    { time: 10, speed: 45 },
    { time: 15, speed: 60 },
    { time: 20, speed: 55 },
    { time: 25, speed: 70 },
    { time: 30, speed: 45 },
    { time: 35, speed: 30 },
    { time: 40, speed: 0 }
  ];

  const mockEventData = [
    { event: "Hard Braking", time: 12, duration: 2, severity: "high" as const },
    { event: "Sharp Turn", time: 18, duration: 1, severity: "medium" as const },
    { event: "Acceleration", time: 25, duration: 3, severity: "low" as const },
    { event: "Speed Limit", time: 32, duration: 1, severity: "medium" as const }
  ];

  const handleVideoUpload = () => {
    setHasUploadedVideo(true);
    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setAnalysisComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  return (
    <div className="min-h-screen bg-background p-6">
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
              <p className="font-semibold text-foreground">John Driver</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Videos Uploaded</p>
                  <p className="text-2xl font-bold text-card-foreground">12</p>
                </div>
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed</p>
                  <p className="text-2xl font-bold text-card-foreground">45 mph</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Drive Time</p>
                  <p className="text-2xl font-bold text-card-foreground">2.5h</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Safety Score</p>
                  <p className="text-2xl font-bold text-card-foreground">85%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Video Upload Section */}
        {!hasUploadedVideo && (
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Upload className="h-5 w-5 text-primary" />
                Upload Journey Video
              </CardTitle>
              <CardDescription>
                Upload your journey video for speed analysis and event detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VideoUpload onUpload={handleVideoUpload} />
            </CardContent>
          </Card>
        )}

        {/* Analysis Progress */}
        {hasUploadedVideo && !analysisComplete && (
          <Card className="mb-8 bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <BarChart3 className="h-5 w-5 text-primary" />
                Analyzing Video...
              </CardTitle>
              <CardDescription>
                Processing your video for speed analysis and event detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Progress value={analysisProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {analysisProgress}% complete - Extracting speed data and detecting events
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysisComplete && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Speed Analysis */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Speed Analysis
                </CardTitle>
                <CardDescription>
                  Vehicle speed over journey time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpeedAnalysisChart data={mockSpeedData} />
              </CardContent>
            </Card>

            {/* Event Triggers */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Driving Events
                </CardTitle>
                <CardDescription>
                  Detected events during your journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventTriggersChart data={mockEventData} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Video Playback */}
        {analysisComplete && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Upload className="h-5 w-5 text-primary" />
                Journey Video
              </CardTitle>
              <CardDescription>
                Your uploaded video with synchronized analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Video player will be integrated here</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;