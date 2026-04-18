import { useEffect, useState } from "react";
import { fetchActiveOrders } from "../../api/orders";
import { IOrderRow } from "../../types/order";

function AdminMonitor() {
  const [orders, setOrders] = useState<IOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await fetchActiveOrders();
        setOrders(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("ADMIN LOAD ERROR:", err);
        setError(err.message || "Ошибка загрузки заказов");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Заказы</h1>

      {orders.length === 0 ? (
        <div>Заказов нет</div>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div>Заказ: #{order.order_number ?? order.daily_order_number ?? "—"}</div>
            <div>Клиент: {order.customer_name || "—"}</div>
            <div>Статус: {order.status || "—"}</div>
            <div>Сумма: {Number(order.total ?? 0)} ₽</div>
          </div>
        ))
      )}
    </div>
  );
}

export default AdminMonitor;