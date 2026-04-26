import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminAccessRequestsPage.scss";

type Profile = {
  id: string;
  email: string;
  role: string | null;
  status: string | null;
};

const roles = [
  { value: "cashier", label: "💵 Касса" },
  { value: "kitchen", label: "👨‍🍳 Кухня" },
  { value: "hall", label: "🖥 Зал / Монитор" },
  { value: "assembly", label: "📦 Сборка" },
  { value: "history", label: "📊 История" },
  { value: "admin", label: "🛡 Админ" },
];

function AdminAccessRequestsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">(
    "info"
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, status")
        .order("email", { ascending: true });

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка загрузки: ${error.message}`);
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось загрузить пользователей");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();

    const channel = supabase
      .channel("profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          void loadUsers();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const updateUser = async (id: string, status: string) => {
    const role = selectedRoles[id];

    if (status === "approved" && !role) {
      setMessageType("error");
      setMessage("Сначала выберите роль.");
      return;
    }

    try {
      setBusyId(id);
      setMessage("");

      const updateData =
        status === "approved"
          ? { status, role, approved_at: new Date().toISOString() }
          : { status };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", id);

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка: ${error.message}`);
        return;
      }

      setMessageType("success");
      setMessage(
        status === "approved"
          ? "Пользователь одобрен."
          : "Пользователь отклонён."
      );

      await loadUsers();
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось обновить пользователя");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page-card">
      <div className="admin-page-header">
        <div>
          <h1>Пользователи</h1>
          <p>Список сотрудников, заявки и назначение ролей</p>
        </div>
      </div>

      {message && (
        <div className={`admin-message admin-message--${messageType}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="admin-message admin-message--info">Жүктөлүүдө...</div>
      ) : users.length === 0 ? (
        <div className="admin-message admin-message--info">
          Пользователи не найдены
        </div>
      ) : (
        <div className="admin-requests-grid">
          {users.map((user) => {
            const isBusy = busyId === user.id;
            const currentStatus = user.status || "approved";
            const currentRole = selectedRoles[user.id] || user.role || "";

            return (
              <div key={user.id} className="admin-request-card">
                <div className="admin-request-card__top">
                  <div>
                    <span className="admin-request-card__label">Email</span>
                    <strong>{user.email}</strong>
                  </div>

                  <span
                    className={`admin-badge admin-badge--${currentStatus}`}
                  >
                    {currentStatus === "pending"
                      ? "Ожидает"
                      : currentStatus === "approved"
                      ? "Одобрен"
                      : "Отклонён"}
                  </span>
                </div>

                <div className="admin-request-card__body">
                  <label className="admin-field">
                    <span>Роль сотрудника</span>

                    <select
                      value={currentRole}
                      disabled={isBusy}
                      onChange={(e) =>
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [user.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Выберите роль</option>

                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="admin-request-card__actions">
                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--approve"
                    disabled={isBusy}
                    onClick={() => updateUser(user.id, "approved")}
                  >
                    {isBusy ? "..." : "Одобрить / Сохранить"}
                  </button>

                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--reject"
                    disabled={isBusy}
                    onClick={() => updateUser(user.id, "rejected")}
                  >
                    {isBusy ? "..." : "Отклонить"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminAccessRequestsPage;