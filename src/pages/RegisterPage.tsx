import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        alert(error.message || "Ошибка регистрации");
        return;
      }

      const user = data.user;

      if (!user) {
        alert("Пользователь не создан");
        return;
      }

      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          email: normalizedEmail,
          role: "client",
          status: "pending",
        });

        if (profileError) {
          alert(profileError.message || "Ошибка создания профиля");
          return;
        }
      }

      navigate("/pending-approval", { replace: true });
    } catch (err) {
      console.error(err);
      alert("Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">TacoGo</h1>
        <p className="login-subtitle">Регистрация</p>

        <form onSubmit={handleRegister} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            disabled={loading}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            disabled={loading}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Загрузка..." : "Зарегистрироваться"}
          </button>
        </form>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          Уже есть аккаунт?{" "}
          <Link to="/login" style={{ fontWeight: 700, color: "#111" }}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;