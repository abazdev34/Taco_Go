import { useAuth } from "../context/AuthContext";

function PendingApprovalPage() {
  const { profile, signOut, refreshProfile } = useAuth();

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Ожидание подтверждения</h1>

        <p style={styles.text}>
          Ваш аккаунт пока не подтвержден администратором.
        </p>

        <div style={styles.info}>
          <div>
            <strong>Email:</strong> {profile?.email || "—"}
          </div>
          <div>
            <strong>Роль:</strong> {profile?.role || "user"}
          </div>
          <div>
            <strong>Статус:</strong> {profile?.status || "pending"}
          </div>
        </div>

        <div style={styles.actions}>
          <button style={styles.primaryButton} onClick={refreshProfile}>
            Проверить снова
          </button>

          <button style={styles.secondaryButton} onClick={signOut}>
            Выйти
          </button>
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
    background: "#f5f7fb",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "540px",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "24px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
  },
  title: {
    margin: "0 0 12px",
    fontSize: "28px",
    fontWeight: 800,
    color: "#111",
  },
  text: {
    margin: "0 0 20px",
    color: "#555",
    lineHeight: 1.5,
  },
  info: {
    display: "grid",
    gap: "8px",
    marginBottom: "20px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    background: "#111",
    color: "#fff",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    border: "1px solid #d0d5dd",
    background: "#fff",
    color: "#111",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 700,
  },
};

export default PendingApprovalPage;