import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedName = fullName.trim();

      if (!normalizedEmail) {
        setErrorMessage("Введите email");
        return;
      }

      if (!password || password.length < 6) {
        setErrorMessage("Пароль должен содержать минимум 6 символов");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName || null,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || "Не удалось зарегистрироваться");
        return;
      }

      if (data.user && trimmedName) {
        await supabase
          .from("profiles")
          .update({ full_name: trimmedName })
          .eq("id", data.user.id);
      }

      setSuccessMessage(
        "Регистрация выполнена. Теперь дождитесь подтверждения администратора."
      );

      setFullName("");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (error: any) {
      console.error("REGISTER ERROR:", error);
      setErrorMessage(error?.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Регистрация сотрудника</h1>
        <p style={styles.subtitle}>
          После регистрации доступ должен подтвердить администратор.
        </p>

        <form onSubmit={handleRegister} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Имя</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Введите имя"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="Введите email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Пароль</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {errorMessage && <div style={styles.error}>{errorMessage}</div>}
          {successMessage && <div style={styles.success}>{successMessage}</div>}

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <div style={styles.footer}>
          Уже есть аккаунт?{" "}
          <Link to="/login" style={styles.link}>
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    background: "#f5f7fb",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "28px",
    fontWeight: 800,
    color: "#111",
  },
  subtitle: {
    margin: "0 0 20px",
    color: "#555",
    lineHeight: 1.5,
  },
  form: {
    display: "grid",
    gap: "14px",
  },
  field: {
    display: "grid",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#344054",
  },
  input: {
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d0d5dd",
    fontSize: "15px",
    outline: "none",
  },
  button: {
    border: "none",
    background: "#111",
    color: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "14px",
  },
  error: {
    background: "#fee4e2",
    color: "#b42318",
    border: "1px solid #fecdca",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  success: {
    background: "#ecfdf3",
    color: "#027a48",
    border: "1px solid #abefc6",
    borderRadius: "10px",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  footer: {
    marginTop: "18px",
    fontSize: "14px",
    color: "#555",
  },
  link: {
    color: "#111",
    fontWeight: 700,
    textDecoration: "none",
  },
};

export default RegisterPage;