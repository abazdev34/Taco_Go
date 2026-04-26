import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import "./AdminUsersPage.scss";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at?: string | null;
  approved_at?: string | null;
};

const roleOptions = [
  { value: "admin", label: "Админ" },
  { value: "cashier", label: "Касса" },
  { value: "kitchen", label: "Кухня" },
  { value: "hall", label: "Зал / Монитор" },
  { value: "assembly", label: "Сборка" },
  { value: "history", label: "История" },
  { value: "client", label: "Клиент" }, // 🔥 МААНИЛҮҮ
];

function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "info">("info");
  const [search, setSearch] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, status, created_at, approved_at")
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
      .channel("admin-users-live")
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

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) =>
      `${user.email || ""} ${user.role || ""} ${user.status || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [users, search]);

  const updateRole = async (id: string, newRole: string) => {
    try {
      setActionLoadingId(id);
      setMessage("");

      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", id);

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка изменения роли: ${error.message}`);
        return;
      }

      setUsers((prev) =>
        prev.map((user) => (user.id === id ? { ...user, role: newRole } : user))
      );

      setMessageType("success");
      setMessage("Роль обновлена.");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось изменить роль");
    } finally {
      setActionLoadingId(null);
    }
  };

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      setActionLoadingId(id);
      setMessage("");

      const approvedAt = status === "approved" ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("profiles")
        .update({
          status,
          approved_at: approvedAt,
        })
        .eq("id", id);

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка: ${error.message}`);
        return;
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, status, approved_at: approvedAt } : user
        )
      );

      setMessageType("success");
      setMessage(status === "approved" ? "Одобрен" : "Отклонён");
    } catch (error: any) {
      setMessageType("error");
      setMessage(error?.message || "Не удалось обновить статус");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-page-card">
      <div className="admin-page-header">
        <h1>Пользователи</h1>
      </div>

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={loadUsers}>Обновить</button>
      </div>

      {message && (
        <div className={`admin-message admin-message--${messageType}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="admin-message admin-message--info">Загрузка...</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((user) => {
              const isBusy = actionLoadingId === user.id;

              return (
                <tr key={user.id}>
                  <td>{user.email}</td>

                  <td>
                    <select
                      value={user.role || ""}
                      disabled={isBusy}
                      onChange={(e) => updateRole(user.id, e.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td>{user.status}</td>

                  <td>
                    <button
                      disabled={isBusy}
                      onClick={() => updateStatus(user.id, "approved")}
                    >
                      ✔
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => updateStatus(user.id, "rejected")}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminUsersPage;