import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Activity, AlertTriangle, Clock, Calendar } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SpeedAnalysisChart from "../driver/SpeedAnalysisChart";
import EventTriggersChart from "../driver/EventTriggersChart";

const DriverDetail = () => {
  const { driverId } = useParams();

  // Mock driver data - this will come from Supabase
  const driver = {
    id: driverId,
    name: 'John Driver',
    email: 'john@company.com',
    joinDate: '2024-01-15',
    totalUploads: 12,
    safetyScore: 85,
    avgSpeed: 45,
    totalDriveTime: '24.5',
    status: 'active'
  };

  // Mock recent journey data
  const recentJourneys = [
    {
      id: '1',
      date: '2024-01-20',
      duration: '2.5h',
      avgSpeed: 42,
      events: 3,
      safetyScore: 88
    },
    {
      id: '2',
      date: '2024-01-19',
      duration: '1.8h',
      avgSpeed: 38,
      events: 1,
      safetyScore: 92
    },
    {
      id: '3',
      date: '2024-01-18',
      duration: '3.2h',
      avgSpeed: 48,
      events: 5,
      safetyScore: 78
    }
  ];

  // Mock latest journey analysis data
  const latestSpeedData = [
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

  const latestEventData = [
    { event: "Hard Braking", time: 12, duration: 2, severity: "high" as const },
    { event: "Sharp Turn", time: 18, duration: 1, severity: "medium" as const },
    { event: "Acceleration", time: 25, duration: 3, severity: "low" as const }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'inactive':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/manager/dashboard" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Fleet Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{driver.name}</h1>
                <p className="text-muted-foreground">{driver.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Badge variant="outline" className={getStatusColor(driver.status)}>
                    {driver.status.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Member since {new Date(driver.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold text-card-foreground">{driver.totalUploads}</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Safety Score</p>
                  <p className={`text-2xl font-bold ${getScoreColor(driver.safetyScore)}`}>
                    {driver.safetyScore}%
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed</p>
                  <p className="text-2xl font-bold text-card-foreground">{driver.avgSpeed} mph</p>
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
                  <p className="text-2xl font-bold text-card-foreground">{driver.totalDriveTime}h</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Journey Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Activity className="h-5 w-5 text-primary" />
                Latest Speed Analysis
              </CardTitle>
              <CardDescription>
                Speed data from most recent journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpeedAnalysisChart data={latestSpeedData} />
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Latest Events
              </CardTitle>
              <CardDescription>
                Events detected in most recent journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventTriggersChart data={latestEventData} />
            </CardContent>
          </Card>
        </div>

        {/* Recent Journeys */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Journeys
            </CardTitle>
            <CardDescription>
              Overview of recent driving sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJourneys.map((journey) => (
                <div
                  key={journey.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {new Date(journey.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duration: {journey.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{journey.avgSpeed} mph</p>
                      <p className="text-xs text-muted-foreground">Avg Speed</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{journey.events}</p>
                      <p className="text-xs text-muted-foreground">Events</p>
                    </div>

                    <div className="text-center">
                      <p className={`text-sm font-medium ${getScoreColor(journey.safetyScore)}`}>
                        {journey.safetyScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">Safety</p>
                    </div>

                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Playback Section */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Latest Journey Video
            </CardTitle>
            <CardDescription>
              Video from most recent journey with synchronized analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Video player will be integrated here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDetail;