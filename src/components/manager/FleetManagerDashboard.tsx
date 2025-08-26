import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, TrendingUp, Clock, Eye } from "lucide-react";
import { Link } from "react-router-dom";

interface Driver {
  id: string;
  name: string;
  email: string;
  lastUpload: string;
  totalUploads: number;
  safetyScore: number;
  status: 'active' | 'inactive' | 'warning';
}

const FleetManagerDashboard = () => {
  // Mock data for drivers - this will come from Supabase
  const drivers: Driver[] = [
    {
      id: '1',
      name: 'John Driver',
      email: 'john@company.com',
      lastUpload: '2 hours ago',
      totalUploads: 12,
      safetyScore: 85,
      status: 'active'
    },
    {
      id: '2',
      name: 'Sarah Wilson',
      email: 'sarah@company.com',
      lastUpload: '1 day ago',
      totalUploads: 18,
      safetyScore: 92,
      status: 'active'
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@company.com',
      lastUpload: '3 days ago',
      totalUploads: 8,
      safetyScore: 67,
      status: 'warning'
    },
    {
      id: '4',
      name: 'Emily Davis',
      email: 'emily@company.com',
      lastUpload: '1 week ago',
      totalUploads: 25,
      safetyScore: 88,
      status: 'inactive'
    }
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

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter(d => d.status === 'active').length;
  const avgSafetyScore = Math.round(drivers.reduce((sum, d) => sum + d.safetyScore, 0) / drivers.length);
  const totalUploads = drivers.reduce((sum, d) => sum + d.totalUploads, 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Fleet Manager Dashboard</h1>
              <p className="text-muted-foreground">Monitor and manage your driver fleet</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Fleet Manager</p>
              <p className="font-semibold text-foreground">Admin User</p>
            </div>
          </div>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Drivers</p>
                  <p className="text-2xl font-bold text-card-foreground">{totalDrivers}</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Drivers</p>
                  <p className="text-2xl font-bold text-card-foreground">{activeDrivers}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Safety Score</p>
                  <p className="text-2xl font-bold text-card-foreground">{avgSafetyScore}%</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card hover:bg-card-hover transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Videos</p>
                  <p className="text-2xl font-bold text-card-foreground">{totalUploads}</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Drivers List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-card-foreground">
              <Users className="h-5 w-5 text-primary" />
              Driver Management
            </CardTitle>
            <CardDescription>
              View and manage all drivers in your fleet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {drivers.map((driver) => (
                <div
                  key={driver.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {driver.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{driver.name}</h3>
                      <p className="text-sm text-muted-foreground">{driver.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">{driver.totalUploads}</p>
                      <p className="text-xs text-muted-foreground">Videos</p>
                    </div>
                    
                    <div className="text-center">
                      <p className={`text-sm font-medium ${getScoreColor(driver.safetyScore)}`}>
                        {driver.safetyScore}%
                      </p>
                      <p className="text-xs text-muted-foreground">Safety</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">{driver.lastUpload}</p>
                      <p className="text-xs text-muted-foreground">Last Upload</p>
                    </div>

                    <Badge 
                      variant="outline" 
                      className={getStatusColor(driver.status)}
                    >
                      {driver.status.toUpperCase()}
                    </Badge>

                    <Link to={`/manager/driver/${driver.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FleetManagerDashboard;