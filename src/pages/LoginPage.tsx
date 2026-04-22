import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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

      navigate("/", { replace: true });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      alert("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-hero__overlay" />

          <div className="login-hero__content">
            <div className="login-hero__logo-wrap">
              <img
                src="/logo-burritos.jpg"
                alt="Бурритос"
                className="login-hero__logo"
              />
            </div>

            <h1 className="login-hero__title">БУРРИТОС</h1>
            <p className="login-hero__subtitle">МЕКСИКАНСКАЯ КУХНЯ</p>
            <p className="login-hero__desc">
              Свежие ингредиенты. Настоящий вкус Мексики.
            </p>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-card">
            <div className="login-card__top">
              <div className="login-card__badge">🌮</div>
              <h2>Добро пожаловать!</h2>
              <p>Войдите в систему для продолжения</p>
            </div>

            <form onSubmit={handleLogin} className="login-form">
              <label className="login-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="Введите ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="login-field">
                <span>Пароль</span>
                <input
                  type="password"
                  placeholder="Введите ваш пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              <button type="submit" disabled={loading} className="login-submit">
                {loading ? "Загрузка..." : "Войти в систему"}
              </button>
            </form>

            <div className="login-footer">
              Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;