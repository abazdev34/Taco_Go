import { useEffect, useMemo, useState } from "react";
import {
  deleteArchivedOrdersByIds,
  fetchHistoryOrders,
} from "../../api/orders";
import { IMenuItem, IOrderRow } from "../../types/order";
import { formatPrice } from "../../utils/currency";
import { getCommonOrderLabel, groupOrdersByDay } from "../../utils/orderStats";
import { sendEmailReport } from "../../utils/email";
import "./AdminStatsPages.scss";

/* 🔥 СТАТУС ТЕКСТ */
function getStatusLabel(status?: string) {
  switch (status) {
    case "new":
      return "Новый";
    case "preparing":
      return "Готовится";
    case "ready":
      return "Готов";
    case "completed":
      return "Завершён";
    default:
      return "Завершён";
  }
}

function buildEmailText(days: ReturnType<typeof groupOrdersByDay>) {
  const totalOrders = days.reduce((sum, day) => sum + day.totalOrders, 0);
  const totalAmount = days.reduce((sum, day) => sum + day.totalAmount, 0);
  const onlineAmount = days.reduce((sum, day) => sum + day.onlineAmount, 0);
  const cashAmount = days.reduce((sum, day) => sum + day.cashAmount, 0);

  return `
История заказов

Заказов: ${totalOrders}
Общая сумма: ${formatPrice(totalAmount)}
Онлайн: ${formatPrice(onlineAmount)}
Наличные: ${formatPrice(cashAmount)}

${days
  .map(
    (day) => `
${day.dateLabel}
Заказов: ${day.totalOrders}
Итого: ${formatPrice(day.totalAmount)}

${day.orders
  .map(
    (order) =>
      `Заказ №${getCommonOrderLabel(order)} — ${formatPrice(
        Number(order.total || 0)
      )} — ${getStatusLabel(order.status)}`
  )
  .join("\n")}
`
  )
  .join("\n")}
  `.trim();
}

function OrderHistoryPage() {
  const [orders, setOrders] = useState<IOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDay, setOpenDay] = useState("");
  const [busy, setBusy] = useState(false);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await fetchHistoryOrders();
      setOrders(data || []);
    } catch (e: any) {
      setError(e?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const groupedDays = useMemo(() => groupOrdersByDay(orders), [orders]);

  useEffect(() => {
    if (!openDay && groupedDays.length > 0) {
      setOpenDay(groupedDays[0].dateKey);
    }
  }, [groupedDays, openDay]);

  const handleSendEmail = () => {
    if (!groupedDays.length) return;
    sendEmailReport("История заказов", buildEmailText(groupedDays));
  };

  const handleDelete = async () => {
    if (!orders.length) return;

    const ok = window.confirm("Удалить архив?");
    if (!ok) return;

    try {
      setBusy(true);
      await deleteArchivedOrdersByIds(orders.map((o) => o.id));
      await loadHistory();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-stats-page">
      <div className="admin-stats-header">
        <div>
          <span className="admin-stats-badge">Архив</span>
          <h1>История заказов</h1>
          <p>Закрытые заказы из архива по дням</p>
        </div>
      </div>

      <div className="admin-stats-actions">
        <button onClick={handleSendEmail} disabled={!groupedDays.length}>
          Отправить на почту
        </button>

        <button onClick={handleDelete} disabled={busy || !orders.length}>
          {busy ? "Удаление..." : "Очистить архив"}
        </button>
      </div>

      {loading ? (
        <div className="admin-stats-empty">Загрузка...</div>
      ) : error ? (
        <div className="admin-stats-empty">{error}</div>
      ) : groupedDays.length === 0 ? (
        <div className="admin-stats-empty">Пусто</div>
      ) : (
        <div className="admin-days-list">
          {groupedDays.map((day) => {
            const isOpen = openDay === day.dateKey;

            return (
              <div key={day.dateKey} className="admin-day-row">
                <button
                  type="button"
                  onClick={() => setOpenDay(isOpen ? "" : day.dateKey)}
                >
                  <strong>
                    {day.dateLabel} ({day.totalOrders})
                  </strong>
                  <span>{formatPrice(day.totalAmount)}</span>
                </button>

                {isOpen && (
                  <div className="admin-history-orders">
                    {day.orders.map((order) => (
                      <div key={order.id} className="admin-history-order">
                        <strong>#{getCommonOrderLabel(order)}</strong>

                        {/* 🔥 СТАТУС */}
                        <span>{getStatusLabel(order.status)}</span>

                        <b>{formatPrice(Number(order.total || 0))}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrderHistoryPage;