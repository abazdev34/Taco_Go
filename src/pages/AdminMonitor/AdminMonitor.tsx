import { useEffect, useMemo, useState } from "react";
import {
  fetchActiveOrders,
  fetchHistoryOrders,
  updateOrderComment,
  updateOrderStatus,
} from "../../api/orders";
import { subscribeOrderSync } from "../../lib/orderSync";
import { IOrderRow, TOrderStatus } from "../../types/order";

type TTab = "active" | "history";

const statusOptions: TOrderStatus[] = [
  "new",
  "preparing",
  "ready",
  "completed",
];

function AdminMonitor() {
  const [tab, setTab] = useState<TTab>("active");
  const [orders, setOrders] = useState<IOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        tab === "active"
          ? await fetchActiveOrders()
          : await fetchHistoryOrders();

      setOrders(data);
    } catch (err) {
      console.error(err);
      setError("Заказдарды жүктөөдө ката чыкты");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [tab]);

  useEffect(() => {
    const unsubscribe = subscribeOrderSync((message) => {
      setOrders((prev) => {
        const exists = prev.some((item) => item.id === message.payload.id);

        if (message.type === "ORDER_CREATED") {
          if (tab === "history") return prev;
          if (exists) return prev;
          return [message.payload, ...prev];
        }

        if (message.type === "ORDER_UPDATED") {
          if (tab === "history") {
            if (message.payload.status === "completed") {
              if (exists) {
                return prev.map((item) =>
                  item.id === message.payload.id ? message.payload : item
                );
              }
              return [message.payload, ...prev];
            }
            return prev.filter((item) => item.id !== message.payload.id);
          }

          if (message.payload.status === "completed") {
            return prev.filter((item) => item.id !== message.payload.id);
          }

          if (exists) {
            return prev.map((item) =>
              item.id === message.payload.id ? message.payload : item
            );
          }

          return [message.payload, ...prev];
        }

        if (message.type === "ORDER_COMPLETED") {
          if (tab === "history") {
            if (exists) {
              return prev.map((item) =>
                item.id === message.payload.id ? message.payload : item
              );
            }
            return [message.payload, ...prev];
          }

          return prev.filter((item) => item.id !== message.payload.id);
        }

        return prev;
      });
    });

    return unsubscribe;
  }, [tab]);

  const stats = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    const newCount = orders.filter((o) => o.status === "new").length;
    const preparingCount = orders.filter((o) => o.status === "preparing").length;
    const readyCount = orders.filter((o) => o.status === "ready").length;
    const completedCount = orders.filter((o) => o.status === "completed").length;

    return {
      totalOrders,
      totalRevenue,
      newCount,
      preparingCount,
      readyCount,
      completedCount,
    };
  }, [orders]);

  const handleStatusChange = async (id: string, status: TOrderStatus) => {
    try {
      setSavingId(id);
      const updated = await updateOrderStatus(id, status);

      setOrders((prev) => {
        if (tab === "active" && updated.status === "completed") {
          return prev.filter((item) => item.id !== id);
        }

        if (tab === "history" && updated.status === "completed") {
          const exists = prev.some((item) => item.id === id);
          if (exists) {
            return prev.map((item) => (item.id === id ? updated : item));
          }
          return [updated, ...prev];
        }

        return prev.map((item) => (item.id === id ? updated : item));
      });
    } catch (err) {
      console.error(err);
      alert("Статусту өзгөртүү мүмкүн болгон жок");
    } finally {
      setSavingId(null);
    }
  };

  const handleCommentSave = async (id: string, comment: string) => {
    try {
      setSavingId(id);
      const updated = await updateOrderComment(id, comment);

      setOrders((prev) =>
        prev.map((item) => (item.id === id ? updated : item))
      );
    } catch (err) {
      console.error(err);
      alert("Комментарийди сактоо мүмкүн болгон жок");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Orders</h1>
          <p style={styles.subtitle}>Заказдарды толук башкаруу</p>
        </div>

        <button style={styles.refreshButton} onClick={loadOrders}>
          Жаңыртуу
        </button>
      </div>

      <div style={styles.tabs}>
        <button
          style={{
            ...styles.tabButton,
            ...(tab === "active" ? styles.activeTabButton : {}),
          }}
          onClick={() => setTab("active")}
        >
          Active Orders
        </button>

        <button
          style={{
            ...styles.tabButton,
            ...(tab === "history" ? styles.activeTabButton : {}),
          }}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Бардыгы</div>
          <div style={styles.statValue}>{stats.totalOrders}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Жалпы сумма</div>
          <div style={styles.statValue}>{stats.totalRevenue} ₸</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>New</div>
          <div style={styles.statValue}>{stats.newCount}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Preparing</div>
          <div style={styles.statValue}>{stats.preparingCount}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Ready</div>
          <div style={styles.statValue}>{stats.readyCount}</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Completed</div>
          <div style={styles.statValue}>{stats.completedCount}</div>
        </div>
      </div>

      {loading && <div style={styles.message}>Жүктөлүүдө...</div>}
      {!!error && <div style={styles.error}>{error}</div>}

      {!loading && !orders.length && (
        <div style={styles.empty}>Заказ табылган жок</div>
      )}

      <div style={styles.grid}>
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            loading={savingId === order.id}
            onStatusChange={handleStatusChange}
            onCommentSave={handleCommentSave}
            readOnlyStatus={tab === "history"}
          />
        ))}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: IOrderRow;
  loading: boolean;
  readOnlyStatus?: boolean;
  onStatusChange: (id: string, status: TOrderStatus) => void;
  onCommentSave: (id: string, comment: string) => void;
}

function OrderCard({
  order,
  loading,
  onStatusChange,
  onCommentSave,
  readOnlyStatus = false,
}: OrderCardProps) {
  const [comment, setComment] = useState(order.comment || "");

  useEffect(() => {
    setComment(order.comment || "");
  }, [order.comment]);

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.orderNumber}>#{order.order_number}</div>
          <div style={styles.meta}>
            {order.customer_name}
            {order.table_number ? ` • Стол ${order.table_number}` : ""}
          </div>
        </div>

        <div style={styles.badge}>{order.source || "cashier"}</div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Статус</div>
        {readOnlyStatus ? (
          <div style={styles.statusText}>{order.status}</div>
        ) : (
          <select
            style={styles.select}
            value={order.status}
            disabled={loading}
            onChange={(e) =>
              onStatusChange(order.id, e.target.value as TOrderStatus)
            }
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Тамактар</div>
        <div style={styles.itemsList}>
          {order.items.map((item) => (
            <div key={`${order.id}-${item.id}`} style={styles.itemRow}>
              <span>
                {item.title} {item.quantity ? `x${item.quantity}` : ""}
              </span>
              <strong>{(item.price || 0) * (item.quantity || 1)} ₸</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Комментарий</div>
        <textarea
          style={styles.textarea}
          value={comment}
          disabled={loading}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Комментарий..."
        />
        <button
          style={styles.saveButton}
          disabled={loading}
          onClick={() => onCommentSave(order.id, comment)}
        >
          Сактоо
        </button>
      </div>

      <div style={styles.footer}>
        <div>
          <div style={styles.total}>{order.total} ₸</div>
          <div style={styles.date}>
            {new Date(order.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    margin: "6px 0 0",
    color: "#666",
  },
  tabs: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  tabButton: {
    border: "1px solid #ddd",
    background: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  activeTabButton: {
    background: "#111",
    color: "#fff",
    border: "1px solid #111",
  },
  refreshButton: {
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "12px",
  },
  statCard: {
    border: "1px solid #e5e5e5",
    borderRadius: "14px",
    padding: "16px",
    background: "#fff",
  },
  statLabel: {
    color: "#666",
    fontSize: "14px",
    marginBottom: "8px",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  card: {
    border: "1px solid #e5e5e5",
    borderRadius: "16px",
    padding: "16px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  orderNumber: {
    fontSize: "20px",
    fontWeight: 700,
  },
  meta: {
    color: "#666",
    marginTop: "4px",
  },
  badge: {
    background: "#f3f3f3",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  sectionTitle: {
    fontWeight: 700,
    fontSize: "14px",
  },
  select: {
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
  statusText: {
    fontWeight: 600,
    textTransform: "capitalize",
  },
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    borderBottom: "1px dashed #eee",
    paddingBottom: "6px",
  },
  textarea: {
    minHeight: "90px",
    borderRadius: "10px",
    border: "1px solid #ccc",
    padding: "10px 12px",
    resize: "vertical",
    fontFamily: "inherit",
  },
  saveButton: {
    alignSelf: "flex-start",
    border: "none",
    background: "#111",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: "4px",
  },
  total: {
    fontSize: "22px",
    fontWeight: 700,
  },
  date: {
    color: "#777",
    fontSize: "13px",
    marginTop: "4px",
  },
  message: {
    padding: "16px",
    borderRadius: "12px",
    background: "#f7f7f7",
  },
  error: {
    padding: "16px",
    borderRadius: "12px",
    background: "#ffe7e7",
    color: "#b00020",
  },
  empty: {
    padding: "30px",
    textAlign: "center",
    border: "1px dashed #ccc",
    borderRadius: "16px",
    color: "#666",
  },
};

export default AdminMonitor;