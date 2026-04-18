import { useState } from "react";
import { supabase } from "../../lib/supabase";

function AdminCreateStaffPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("manager");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleCreateStaff = async () => {
    try {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("SESSION ERROR:", sessionError);
      console.log("SESSION:", session);
      console.log("TOKEN:", session?.access_token);

      const {
        data: userData,
        error: userError,
      } = await supabase.auth.getUser();

      console.log("GET USER DATA:", userData);
      console.log("GET USER ERROR:", userError);

      if (!session?.access_token) {
        setMessage("Session жок. Кайра login бол.");
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
        setMessage(`Ката: ${error.message}`);
        return;
      }

      setMessage("Staff user ийгиликтүү түзүлдү ✅");
      setEmail("");
      setPassword("");
      setFullName("");
      setRole("manager");
    } catch (err: any) {
      console.error("HANDLE CREATE STAFF ERROR:", err);
      setMessage(err?.message || "Күтүлбөгөн ката чыкты");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "500px" }}>
      <h1>Staff түзүү</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
        <input
          type="text"
          placeholder="Толук аты"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ padding: "10px" }}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: "10px" }}
        />

        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: "10px" }}
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={{ padding: "10px" }}
        >
          <option value="manager">manager</option>
          <option value="staff">staff</option>
          <option value="cashier">cashier</option>
          <option value="courier">courier</option>
        </select>

        <button
          onClick={handleCreateStaff}
          disabled={loading}
          style={{ padding: "12px", cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Жүктөлүүдө..." : "Staff түзүү"}
        </button>

        {message && (
          <div style={{ marginTop: "12px", padding: "10px", border: "1px solid #ccc" }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminCreateStaffPage;