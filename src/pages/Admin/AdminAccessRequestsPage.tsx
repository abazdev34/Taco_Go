import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
];

function AdminAccessRequestsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, role, status")
      .eq("status", "pending");

    if (!error) {
      setUsers(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadUsers();

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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const approveUser = async (id: string) => {
    const role = selectedRoles[id];

    if (!role) {
      alert("Выберите роль");
      return;
    }

    await supabase
      .from("profiles")
      .update({
        status: "approved",
        role,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);
  };

  const rejectUser = async (id: string) => {
    await supabase
      .from("profiles")
      .update({
        status: "rejected",
      })
      .eq("id", id);
  };

  if (loading) return <p style={{ padding: 20 }}>Жүктөлүүдө...</p>;

  return (
    <div style={{ padding: 30 }}>
      <h1>📩 Заявки на доступ</h1>

      {users.length === 0 ? (
        <p>Нет заявок</p>
      ) : (
        <div style={{ display: "grid", gap: 20 }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                background: "#fff",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0 6px 15px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 10 }}>{user.email}</div>

              <select
                value={selectedRoles[user.id] || ""}
                onChange={(e) =>
                  setSelectedRoles((prev) => ({
                    ...prev,
                    [user.id]: e.target.value,
                  }))
                }
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <option value="">Выберите роль</option>
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => approveUser(user.id)}
                  style={{
                    flex: 1,
                    background: "green",
                    color: "#fff",
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                  }}
                >
                  ✅ Одобрить
                </button>

                <button
                  onClick={() => rejectUser(user.id)}
                  style={{
                    flex: 1,
                    background: "red",
                    color: "#fff",
                    padding: 10,
                    borderRadius: 8,
                    border: "none",
                  }}
                >
                  ❌ Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminAccessRequestsPage;