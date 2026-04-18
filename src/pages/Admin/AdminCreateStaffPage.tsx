import { useState } from "react";
import { supabase } from "../../lib/supabase";

function AdminCreateStaffPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const handleCreateStaff = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("info");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessageType("error");
        setMessage("Сессия не найдена. Пожалуйста, войдите заново.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("create-staff-user", {
        body: {
          email,
          password,
          full_name: fullName,
          role,
        },
      });

      console.log("FUNCTION DATA:", data);
      console.log("FUNCTION ERROR:", error);

      if (error) {
        let errorText = error.message;

        try {
          if ("context" in error && error.context) {
            errorText = await error.context.text();
          }
        } catch {}

        if (errorText.includes("already been registered")) {
          setMessageType("error");
          setMessage("Пользователь с таким email уже зарегистрирован.");
          return;
        }

        if (errorText.includes("Only admin")) {
          setMessageType("error");
          setMessage("Только администратор может создавать сотрудников.");
          return;
        }

        if (errorText.includes("Unauthorized")) {
          setMessageType("error");
          setMessage("Ошибка авторизации. Пожалуйста, войдите снова.");
          return;
        }

        if (errorText.includes("invalid input value for enum app_role")) {
          setMessageType("error");
          setMessage("Выбрана недопустимая роль.");
          return;
        }

        setMessageType("error");
        setMessage(`Ошибка: ${errorText}`);
        return;
      }

      setMessageType("success");
      setMessage("Сотрудник успешно создан.");

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("cashier");
    } catch (err: any) {
      console.error("HANDLE CREATE STAFF ERROR:", err);
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

      <div className="admin-form">
        <input
          type="text"
          placeholder="ФИО"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

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

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="cashier">Касса</option>
          <option value="kitchen">Кухня</option>
          <option value="hall">Зал / Монитор</option>
          <option value="assembly">Сборка</option>
          <option value="history">История</option>
          <option value="admin">Админ</option>
        </select>

        <button
          className="admin-btn admin-btn--warning"
          onClick={handleCreateStaff}
          disabled={loading || !fullName || !email || !password}
        >
          {loading ? "Создание..." : "Создать сотрудника"}
        </button>
      </div>
    </div>
  );
}

export default AdminCreateStaffPage;