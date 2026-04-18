import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  email: string;
  role: string;
  status: string;
};

const roles = [
  { value: "cashier", label: "💵 Касса" },
  { value: "kitchen", label: "👨‍🍳 Кухня" },
  { value: "hall", label: "🖥 Зал" },
  { value: "assembly", label: "📦 Сборка" },
  { value: "history", label: "📊 История" },
];

function AdminAccessRequestsPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);

  // 🔥 SAFE LOAD
  const loadUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
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

      // INSERT
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

      // UPDATE
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const updated = payload.new as Profile;

          setUsers((prev) =>
            prev.filter((u) => u.id !== updated.id)
          );
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
      alert("Роль танда!");
      return;
    }

    await supabase
      .from("profiles")
      .update({
        status: "approved",
        role,
      })
      .eq("id", id);
  };

  const rejectUser = async (id: string) => {
    await supabase
      .from("profiles")
      .update({ status: "rejected" })
      .eq("id", id);
  };

  if (loading) return <p style={{ padding: 20 }}>Жүктөлүүдө...</p>;

  return (
    <div style={{ padding: 30 }}>
      <h1>📩 Заявки</h1>

      {users.length === 0 ? (
        <p>Жок</p>
      ) : (
        users.map((user) => (
          <div key={user.id} style={{ marginBottom: 20 }}>
            <b>{user.email}</b>

            <select
              onChange={(e) =>
                setSelectedRoles((prev) => ({
                  ...prev,
                  [user.id]: e.target.value,
                }))
              }
            >
              <option value="">Роль танда</option>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <button onClick={() => approveUser(user.id)}>
              ✔ OK
            </button>

            <button onClick={() => rejectUser(user.id)}>
              ❌ X
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminAccessRequestsPage;