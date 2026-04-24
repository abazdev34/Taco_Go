import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function HomeRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) return <div>Загрузка...</div>;

  // ✅ ЭҢ МААНИЛҮҮ: логин жок болсо → client
  if (!user) return <Navigate to="/client" replace />;

  if (!profile) return <Navigate to="/client" replace />;

  const role = normalize(profile.role);
  const status = normalize(profile.status);

  if (status !== "approved") {
    return <Navigate to="/pending-approval" replace />;
  }

  switch (role) {
    case "admin":
      return <Navigate to="/admin" replace />;
    case "cashier":
      return <Navigate to="/cashier" replace />;
    case "kitchen":
      return <Navigate to="/kitchen" replace />;
    case "hall":
      return <Navigate to="/monitor" replace />;
    case "assembly":
      return <Navigate to="/assembly" replace />;
    case "history":
      return <Navigate to="/history" replace />;
    default:
      return <Navigate to="/client" replace />;
  }
}

export default HomeRedirect;