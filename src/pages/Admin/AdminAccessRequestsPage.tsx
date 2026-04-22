import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminAccessRequestsPage.scss";

type Profile = {
  id: string;
  email: string;
  role: string | null;
  status: string;
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
        .eq("status", "pending")
        .order("email", { ascending: true });

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка загрузки: ${error.message}`);
        return;
      }

      setUsers(data || []);
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось загрузить заявки");
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
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const newUser = payload.new as Profile;

          if (newUser.status === "pending") {
            setUsers((prev) => {
              if (prev.find((u) => u.id === newUser.id)) return prev;
              return [newUser, ...prev];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Profile;

          if (updated.status !== "pending") {
            setUsers((prev) => prev.filter((u) => u.id !== updated.id));
          } else {
            setUsers((prev) =>
              prev.map((user) => (user.id === updated.id ? updated : user))
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const approveUser = async (id: string) => {
    const role = selectedRoles[id];

    if (!role) {
      setMessageType("error");
      setMessage("Сначала выберите роль.");
      return;
    }

    try {
      setBusyId(id);
      setMessage("");

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "approved",
          role,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка одобрения: ${error.message}`);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setMessageType("success");
      setMessage("Заявка успешно одобрена.");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось одобрить заявку");
    } finally {
      setBusyId(null);
    }
  };

  const rejectUser = async (id: string) => {
    try {
      setBusyId(id);
      setMessage("");

      const { error } = await supabase
        .from("profiles")
        .update({
          status: "rejected",
        })
        .eq("id", id);

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка отклонения: ${error.message}`);
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== id));
      setMessageType("success");
      setMessage("Заявка отклонена.");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось отклонить заявку");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="admin-page-card">
      <div className="admin-page-header">
        <div>
          <h1>Заявки на доступ</h1>
          <p>Одобрение новых сотрудников и назначение ролей</p>
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
        <div className="admin-message admin-message--info">Нет заявок</div>
      ) : (
        <div className="admin-requests-grid">
          {users.map((user) => {
            const isBusy = busyId === user.id;

            return (
              <div key={user.id} className="admin-request-card">
                <div className="admin-request-card__top">
                  <div>
                    <span className="admin-request-card__label">Email</span>
                    <strong>{user.email}</strong>
                  </div>

                  <span className="admin-badge admin-badge--pending">
                    Ожидает
                  </span>
                </div>

                <div className="admin-request-card__body">
                  <label className="admin-field">
                    <span>Роль сотрудника</span>
                    <select
                      value={selectedRoles[user.id] || ""}
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
                    onClick={() => approveUser(user.id)}
                  >
                    {isBusy ? "..." : "Одобрить"}
                  </button>

                  <button
                    type="button"
                    className="admin-action-btn admin-action-btn--reject"
                    disabled={isBusy}
                    onClick={() => rejectUser(user.id)}
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