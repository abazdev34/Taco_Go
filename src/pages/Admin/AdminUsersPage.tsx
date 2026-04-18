import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  status: string | null;
  created_at: string | null;
  approved_at: string | null;
};

const roleLabels: Record<string, string> = {
  admin: "Админ",
  cashier: "Касса",
  kitchen: "Кухня",
  hall: "Зал / Монитор",
  assembly: "Сборка",
  history: "История",
  client: "Клиент",
};

const roleOptions = [
  { value: "admin", label: "Админ" },
  { value: "cashier", label: "Касса" },
  { value: "kitchen", label: "Кухня" },
  { value: "hall", label: "Зал / Монитор" },
  { value: "assembly", label: "Сборка" },
  { value: "history", label: "История" },
  { value: "client", label: "Клиент" },
];

function getRoleLabel(role: string | null) {
  if (!role) return "-";
  return roleLabels[role] || role;
}

function getStatusLabel(status: string | null) {
  if (!status) return "-";
  if (status === "approved") return "Одобрен";
  if (status === "pending") return "Ожидает";
  if (status === "rejected") return "Отклонён";
  return status;
}

function getStatusClass(status: string | null) {
  if (status === "approved") return "admin-badge admin-badge--approved";
  if (status === "pending") return "admin-badge admin-badge--pending";
  if (status === "rejected") return "admin-badge admin-badge--rejected";
  return "admin-badge";
}

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
        .order("created_at", { ascending: false });

      if (error) {
        setMessageType("error");
        setMessage(`Ошибка загрузки: ${error.message}`);
        return;
      }

      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) => {
      const email = (user.email || "").toLowerCase();
      const role = (user.role || "").toLowerCase();
      const status = (user.status || "").toLowerCase();

      return (
        email.includes(q) ||
        role.includes(q) ||
        status.includes(q) ||
        getRoleLabel(user.role).toLowerCase().includes(q)
      );
    });
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
      setMessage("Роль успешно обновлена.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="admin-page-card">
      <div className="admin-page-header">
        <div>
          <h1>Пользователи</h1>
          <p>Управление ролями, статусами и сотрудниками</p>
        </div>
      </div>

      <div className="admin-toolbar">
        <input
          type="text"
          placeholder="Поиск по email, роли, статусу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {message && (
        <div className={`admin-message admin-message--${messageType}`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="admin-message admin-message--info">Загрузка...</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Регистрация</th>
                <th>Одобрение</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5}>Пользователи не найдены</td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const isBusy = actionLoadingId === user.id;

                  return (
                    <tr key={user.id}>
                      <td>{user.email || "-"}</td>
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
                      <td>
                        <span className={getStatusClass(user.status)}>
                          {getStatusLabel(user.status)}
                        </span>
                      </td>
                      <td>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleString("ru-RU")
                          : "-"}
                      </td>
                      <td>
                        {user.approved_at
                          ? new Date(user.approved_at).toLocaleString("ru-RU")
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminUsersPage;