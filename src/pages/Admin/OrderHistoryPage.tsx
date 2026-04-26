import { useEffect, useMemo, useState } from "react";
import {
  deleteArchivedOrdersByIds,
  fetchHistoryOrders,
} from "../../api/orders";
import { IMenuItem, IOrderRow } from "../../types/order";
import { formatPrice } from "../../utils/currency";
import {
  getCommonOrderLabel,
  groupOrdersByDay,
} from "../../utils/orderStats";
import "./AdminStatsPages.scss";

function buildHistoryHtml(days: ReturnType<typeof groupOrdersByDay>) {
  const body = days
    .map(
      (day) => `
        <section style="margin-bottom:24px;">
          <h2>${day.dateLabel}</h2>
          <div style="margin-bottom:8px;font-size:14px;">
            Заказов: ${day.totalOrders} |
            Онлайн: ${formatPrice(day.onlineAmount)} |
            Наличные: ${formatPrice(day.cashAmount)} |
            Итого: ${formatPrice(day.totalAmount)}
          </div>

          ${day.orders
            .map(
              (order) => `
                <div style="border:1px solid #ccc;border-radius:12px;padding:12px;margin-bottom:12px;">
                  <div style="display:flex;justify-content:space-between;">
                    <div>
                      <strong>Заказ №${getCommonOrderLabel(order)}</strong><br/>
                      <span>${new Date(order.created_at).toLocaleString(
                        "ru-RU"
                      )}</span>
                    </div>
                    <div style="text-align:right;">
                      <div>${
                        order.payment_method === "online"
                          ? "Онлайн"
                          : "Наличные"
                      }</div>
                      <strong>${formatPrice(
                        Number(order.total || 0)
                      )}</strong>
                    </div>
                  </div>

                  ${((order.items || []) as IMenuItem[])
                    .map(
                      (item) => `
                        <div style="display:flex;justify-content:space-between;border-top:1px solid #eee;padding:6px 0;">
                          <span>${item.title}</span>
                          <span>${item.quantity || 1} шт.</span>
                          <strong>${formatPrice(
                            Number(item.price || 0) *
                              Number(item.quantity || 1)
                          )}</strong>
                        </div>
                      `
                    )
                    .join("")}
                </div>
              `
            )
            .join("")}
        </section>
      `
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>История заказов</title>
      </head>
      <body style="font-family:Arial;padding:20px;">
        <h1>История заказов</h1>
        ${body}
      </body>
    </html>
  `;
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

  const groupedDays = useMemo(
    () => groupOrdersByDay(orders),
    [orders]
  );

  useEffect(() => {
    if (!openDay && groupedDays.length > 0) {
      setOpenDay(groupedDays[0].dateKey);
    }
  }, [groupedDays]);

  const handleExportPdf = () => {
    const html = buildHistoryHtml(groupedDays);

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.print();
    }, 300);
  };

  const handleDelete = async () => {
    if (!orders.length) return;

    const ok = window.confirm("Удалить архив?");
    if (!ok) return;

    try {
      setBusy(true);

      await deleteArchivedOrdersByIds(
        orders.map((o) => o.id)
      );

      await loadHistory();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-stats-page">
      <h1>История заказов</h1>

      <div className="admin-stats-actions">
        <button onClick={handleExportPdf}>
          PDF
        </button>

        <button
          onClick={handleDelete}
          disabled={busy}
        >
          {busy ? "Удаление..." : "Очистить архив"}
        </button>
      </div>

      {loading ? (
        <div>Загрузка...</div>
      ) : error ? (
        <div>{error}</div>
      ) : groupedDays.length === 0 ? (
        <div>Пусто</div>
      ) : (
        groupedDays.map((day) => {
          const isOpen = openDay === day.dateKey;

          return (
            <div key={day.dateKey}>
              <button
                onClick={() =>
                  setOpenDay(isOpen ? "" : day.dateKey)
                }
              >
                {day.dateLabel} ({day.totalOrders})
              </button>

              {isOpen &&
                day.orders.map((order) => (
                  <div key={order.id}>
                    <strong>
                      #{getCommonOrderLabel(order)}
                    </strong>

                    <div>
                      {order.status || "completed"}
                    </div>

                    <div>
                      {formatPrice(
                        Number(order.total || 0)
                      )}
                    </div>
                  </div>
                ))}
            </div>
          );
        })
      )}
    </div>
  );
}

export default OrderHistoryPage;