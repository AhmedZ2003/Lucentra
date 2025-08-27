import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Shield, BarChart3, Users, Upload } from "lucide-react";
import { Link } from "react-router-dom";

const LandingPage = () => {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-foreground mb-6 leading-tight">
            Modern Fleet Management
            <br />
            <span className="text-muted-foreground">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
            Empower your drivers with intelligent video analysis and give fleet managers 
            comprehensive insights into driving behavior, safety, and performance metrics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground px-8">
                Start Managing Fleet
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="px-8">
                Driver Access
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Complete Fleet Management Solution
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From video analysis to centralized monitoring, everything you need to manage 
              your fleet efficiently and safely.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="p-6 hover:shadow-md transition-all duration-200 bg-card hover:bg-card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Video Analysis</h3>
              <p className="text-muted-foreground text-sm">
                Upload journey videos and get instant speed analysis and event detection.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-md transition-all duration-200 bg-card hover:bg-card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Smart Analytics</h3>
              <p className="text-muted-foreground text-sm">
                Comprehensive speed plots and event triggers with visual insights.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-md transition-all duration-200 bg-card hover:bg-card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Driver Management</h3>
              <p className="text-muted-foreground text-sm">
                Centralized dashboard for monitoring all drivers and their performance.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-md transition-all duration-200 bg-card hover:bg-card-hover">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Secure Access</h3>
              <p className="text-muted-foreground text-sm">
                Role-based authentication with secure data synchronization.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Fleet Management?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join fleet managers and drivers who trust FleetScope for comprehensive 
            vehicle monitoring and analysis.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-primary hover:bg-primary-hover text-primary-foreground px-8">
              Get Started Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">FleetScope</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2024 FleetScope. Modern fleet management solutions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;