import { Navigate, Outlet, useLocation } from "react-router-dom";
import { RouteFallback } from "@/components/RouteFallback";
import { useAuth } from "./useAuth";

export function ProtectedRoute() {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <RouteFallback />;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
