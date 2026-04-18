import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import "./LoginPage.scss";

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await signIn(normalizedEmail, password);

      if (error) {
        alert(error.message || "Ошибка входа");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/client", { replace: true });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", user.id)
        .maybeSingle();

      console.log("LOGIN USER:", user);
      console.log("LOGIN PROFILE:", profile);
      console.log("LOGIN PROFILE ERROR:", profileError);

      if (profileError) {
        alert(profileError.message || "Ошибка загрузки профиля");
        navigate("/client", { replace: true });
        return;
      }

      if (!profile) {
        alert("Профиль не найден");
        navigate("/client", { replace: true });
        return;
      }

      if (profile.status !== "approved") {
        navigate("/pending-approval", { replace: true });
        return;
      }

      if (profile.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      if (profile.role === "cashier") {
        navigate("/cashier", { replace: true });
        return;
      }

      if (profile.role === "kitchen") {
        navigate("/kitchen", { replace: true });
        return;
      }

      if (profile.role === "hall") {
        navigate("/monitor", { replace: true });
        return;
      }

      if (profile.role === "assembly") {
        navigate("/assembly", { replace: true });
        return;
      }

      if (profile.role === "history") {
        navigate("/history", { replace: true });
        return;
      }

      navigate("/client", { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">TacoGo</h1>
        <p className="login-subtitle">Вход в систему</p>

        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          Нет аккаунта?{" "}
          <Link to="/register" style={{ fontWeight: 700, color: "#111" }}>
            Зарегистрироваться
          </Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;