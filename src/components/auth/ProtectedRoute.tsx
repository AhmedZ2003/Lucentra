import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth"; // Assuming this provides user and role

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[]; // Accept allowed roles for this route (driver/manager)
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (!allowedRoles.includes(profile?.role || "")) {
        navigate("/unauthorized"); // Redirect if role doesn't match
      }
    }
  }, [user, loading, profile, allowedRoles, navigate]);

  if (loading || !profile) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};
