import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";

type RoleRouteProps = {
  allowedRoles: string[];
  children: ReactNode;
};

function RoleRoute({ allowedRoles, children }: RoleRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <Navigate to="/client" replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default RoleRoute;