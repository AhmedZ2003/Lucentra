import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BarChart3, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LoginForm = () => {
  const [role, setRole] = useState("driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .single();
        
        if (roleData?.role === "driver") {
          navigate("/driver/dashboard");
        } else {
          navigate("/manager/dashboard");
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .single();

        toast({
          title: "Login successful",
          description: "Welcome back!",
        });

        // Redirect based on role
        if (roleData?.role === "driver") {
          navigate("/driver/dashboard");
        } else {
          navigate("/manager/dashboard");
        }
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">FleetScope</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to access your dashboard</p>
        </div>

        <Card className="bg-card border-border shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center text-card-foreground">Sign In</CardTitle>
            <CardDescription className="text-center">
              Choose your role and enter your credentials
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-card-foreground">I am a:</Label>
                <RadioGroup value={role} onValueChange={setRole} className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="driver" id="driver" />
                    <Label htmlFor="driver" className="text-sm font-medium cursor-pointer">
                      Driver
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="manager" id="manager" />
                    <Label htmlFor="manager" className="text-sm font-medium cursor-pointer">
                      Fleet Manager
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-card-foreground">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="driver@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-input-border bg-input"
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-card-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-input-border bg-input"
                  required
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                size="lg"
                disabled={loading}
              >
                {loading ? "Signing in..." : `Sign in as ${role === "driver" ? "Driver" : "Fleet Manager"}`}
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-primary hover:text-primary-hover font-medium">
                    Sign up
                  </Link>
                </p>
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginForm;