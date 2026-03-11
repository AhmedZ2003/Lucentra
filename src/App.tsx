import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginForm from "./components/auth/LoginForm";
import SignupForm from "./components/auth/SignupForm";
import DriverDashboardPage from "./pages/DriverDashboardPage";
import FleetManagerDashboardPage from "./pages/FleetManagerDashboardPage";
import DriverDetailPage from "./pages/DriverDetailPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />

            {/* Protected routes with allowedRoles */}
            <Route 
              path="/driver/dashboard" 
              element={<ProtectedRoute allowedRoles={["driver"]}><DriverDashboardPage /></ProtectedRoute>} 
            />
            <Route 
              path="/manager/dashboard" 
              element={<ProtectedRoute allowedRoles={["manager"]}><FleetManagerDashboardPage /></ProtectedRoute>} 
            />
            <Route 
              path="/manager/driver/:driverId" 
              element={<ProtectedRoute allowedRoles={["manager"]}><DriverDetailPage /></ProtectedRoute>} 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
