import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminCreateStaffPage.scss";

const roleOptions = [
  { value: "cashier", label: "Касса" },
  { value: "kitchen", label: "Кухня" },
  { value: "hall", label: "Зал / Монитор" },
  { value: "assembly", label: "Сборка" },
  { value: "history", label: "История" },
  { value: "admin", label: "Администратор" },
];

function AdminCreateStaffPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const canSubmit =
    normalizedEmail.length > 0 && password.trim().length >= 6 && !loading;

  const handleCreateStaff = async () => {
    if (!normalizedEmail) {
      setMessageType("error");
      setMessage("Введите email.");
      return;
    }

    if (password.trim().length < 6) {
      setMessageType("error");
      setMessage("Пароль должен быть не менее 6 символов.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setMessageType("info");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setMessageType("error");
        setMessage("Сессия не найдена. Выйдите и войдите заново.");
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-staff-user",
        {
          body: {
            email: normalizedEmail,
            password: password.trim(),
            role,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        setMessageType("error");

        if (error.message.includes("403")) {
          setMessage(
            "Доступ запрещён. У текущего пользователя должна быть роль admin."
          );
        } else {
          setMessage(error.message || "Ошибка вызова функции.");
        }

        return;
      }

      if (data?.error) {
        const errorText = String(data.error);

        if (errorText.toLowerCase().includes("admin")) {
          setMessageType("error");
          setMessage("Только администратор может создавать сотрудников.");
          return;
        }

        if (
          errorText.toLowerCase().includes("already") ||
          errorText.toLowerCase().includes("registered")
        ) {
          setMessageType("error");
          setMessage("Пользователь с таким email уже зарегистрирован.");
          return;
        }

        if (errorText.includes("Invalid role")) {
          setMessageType("error");
          setMessage("Выбрана недопустимая роль.");
          return;
        }

        setMessageType("error");
        setMessage(`Ошибка: ${errorText}`);
        return;
      }

      setMessageType("success");
      setMessage(data?.message || "Сотрудник успешно создан.");

      setEmail("");
      setPassword("");
      setRole("cashier");
      setShowPassword(false);
    } catch (err: any) {
      console.error("CREATE STAFF ERROR:", err);
      setMessageType("error");
      setMessage(err?.message || "Произошла непредвиденная ошибка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page-card">
      <div className="admin-page-header">
        <div>
          <h1>Создать сотрудника</h1>
          <p>Добавление нового сотрудника с ролью и доступом в систему</p>
        </div>
      </div>

      {message && (
        <div className={`admin-message admin-message--${messageType}`}>
          {message}
        </div>
      )}

      <div className="admin-create-staff-grid">
        <div className="admin-form-card">
          <div className="admin-form-card__head">
            <h3>Данные сотрудника</h3>
            <span>Заполните поля ниже</span>
          </div>

          <div className="admin-form">
            <label className="admin-field">
              <span>Email</span>
              <input
                type="email"
                placeholder="employee@example.com"
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span>Пароль</span>

              <div className="admin-password-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  value={password}
                  disabled={loading}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  disabled={loading}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Скрыть" : "Показать"}
                </button>
              </div>
            </label>

            <label className="admin-field">
              <span>Роль</span>
              <select
                value={role}
                disabled={loading}
                onChange={(e) => setRole(e.target.value)}
              >
                {roleOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="admin-btn admin-btn--warning admin-btn--wide"
              onClick={handleCreateStaff}
              disabled={!canSubmit}
            >
              {loading ? "Создание..." : "Создать сотрудника"}
            </button>
          </div>
        </div>

        <div className="admin-form-card admin-form-card--hint">
          <div className="admin-form-card__head">
            <h3>Подсказка</h3>
            <span>Что важно учитывать</span>
          </div>

          <div className="admin-hint-list">
            <div className="admin-hint-item">
              <strong>Email</strong>
              <p>Используйте реальный рабочий email сотрудника.</p>
            </div>

            <div className="admin-hint-item">
              <strong>Пароль</strong>
              <p>
                Лучше сразу задать сложный пароль и потом передать сотруднику.
              </p>
            </div>

            <div className="admin-hint-item">
              <strong>Роль</strong>
              <p>
                Выберите доступ только к нужному разделу: касса, кухня, зал,
                сборка или история.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCreateStaffPage;