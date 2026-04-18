import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { useEffect, useState } from "react";

function Layout() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  const loadCount = async () => {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    setPendingCount(count || 0);
  };

  useEffect(() => {
    loadCount();

    let timeout: any;

    const channel = supabase
      .channel("count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            loadCount();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/client");
  };

  return (
    <div>
      <nav style={{ padding: 10, background: "#111", color: "#fff" }}>
        <Link to="/client" style={link}>
          Клиент
        </Link>

        {profile?.role === "admin" && (
          <>
            <Link to="/admin" style={link}>
              Админ
            </Link>

            <Link to="/admin/access-requests" style={link}>
              Заявки {pendingCount > 0 && `(${pendingCount})`}
            </Link>
          </>
        )}

        {user ? (
          <button onClick={logout}>Logout</button>
        ) : (
          <Link to="/login" style={link}>
            Login
          </Link>
        )}
      </nav>

      <Outlet />
    </div>
  );
}

export default Layout;

const link = {
  color: "#fff",
  marginRight: 10,
};