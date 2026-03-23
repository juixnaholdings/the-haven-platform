import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingScreen } from "../components/LoadingScreen";
import { useAuth } from "./AuthContext";

export function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <LoadingScreen label="Restoring your session..." />;
  }

  if (!isAuthenticated) {
    const nextPath = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(nextPath)}`} replace />;
  }

  return <Outlet />;
}
