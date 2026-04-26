import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function HomeRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Загрузка...</div>;

  if (!user) return <Navigate to="/client" replace />;

  if (!profile) return <Navigate to="/pending-approval" replace />;

  const role = normalize(profile.role);
  const status = normalize(profile.status);

  if (status !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "cashier") return <Navigate to="/cashier" replace />;
  if (role === "kitchen") return <Navigate to="/kitchen" replace />;
  if (role === "hall") return <Navigate to="/monitor" replace />;
  if (role === "assembly") return <Navigate to="/assembly" replace />;
  if (role === "history") return <Navigate to="/history" replace />;

  return <Navigate to="/pending-approval" replace />;
}

export default HomeRedirect;