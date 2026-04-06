import { useEffect, useMemo, useState } from "react";
import { fetchActiveOrders, updateOrderStatus } from "../../api/orders";
import { IOrderRow, TOrderStatus } from "../../types/order";

const kitchenStatuses: TOrderStatus[] = ["new", "preparing", "ready"];

function KitchenAssemblyPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([]);

  const loadOrders = async () => {
    const data = await fetchActiveOrders();
    setOrders(data.filter((item) => item.status !== "completed"));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const grouped = useMemo(
    () => ({
      new: orders.filter((item) => item.status === "new"),
      preparing: orders.filter((item) => item.status === "preparing"),
      ready: orders.filter((item) => item.status === "ready"),
    }),
    [orders]
  );

  const handleStatusChange = async (id: string, status: TOrderStatus) => {
    const updated = await updateOrderStatus(id, status);

    if (updated.status === "completed") {
      setOrders((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    setOrders((prev) =>
      prev.map((item) => (item.id === id ? updated : item))
    );
  };

  return (
    <div>
      <h1 style={styles.title}>Kitchen Сборка</h1>

      <div style={styles.columns}>
        {kitchenStatuses.map((status) => (
          <div key={status} style={styles.column}>
            <div style={styles.columnTitle}>{status.toUpperCase()}</div>

            <div style={styles.cardList}>
              {grouped[status].map((order) => (
                <div key={order.id} style={styles.card}>
                  <div style={styles.orderNumber}>#{order.order_number}</div>
                  <div style={styles.meta}>{order.customer_name}</div>

                  <div style={styles.items}>
                    {order.items.map((item) => (
                      <div
                        key={`${order.id}-${item.id}`}
                        style={styles.itemRow}
                      >
                        <span>{item.title}</span>
                        <strong>{item.measure || "-"}</strong>
                      </div>
                    ))}
                  </div>

                  <select
                    style={styles.select}
                    value={order.status}
                    onChange={(e) =>
                      handleStatusChange(
                        order.id,
                        e.target.value as TOrderStatus
                      )
                    }
                  >
                    <option value="new">new</option>
                    <option value="preparing">preparing</option>
                    <option value="ready">ready</option>
                    <option value="completed">completed</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  title: { marginTop: 0, fontSize: "28px", fontWeight: 800 },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
  },
  column: {
    background: "#fff",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid #eaeaea",
  },
  columnTitle: {
    fontSize: "18px",
    fontWeight: 800,
    marginBottom: "14px",
  },
  cardList: {
    display: "grid",
    gap: "12px",
  },
  card: {
    border: "1px solid #ececec",
    borderRadius: "14px",
    padding: "14px",
    background: "#fafafa",
  },
  orderNumber: {
    fontWeight: 800,
    fontSize: "18px",
  },
  meta: {
    color: "#666",
    marginTop: "4px",
    marginBottom: "10px",
  },
  items: {
    display: "grid",
    gap: "6px",
    marginBottom: "12px",
  },
  itemRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    fontSize: "14px",
  },
  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #ccc",
  },
};

export default KitchenAssemblyPage;