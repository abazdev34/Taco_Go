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

function buildHistoryHtml(days: ReturnType<typeof groupOrdersByDay>) {
  const totalOrders = days.reduce((sum, day) => sum + day.totalOrders, 0);
  const totalAmount = days.reduce((sum, day) => sum + day.totalAmount, 0);
  const onlineAmount = days.reduce((sum, day) => sum + day.onlineAmount, 0);
  const cashAmount = days.reduce((sum, day) => sum + day.cashAmount, 0);

  const body = days
    .map(
      (day) => `
      <section class="day-section">
        <div class="day-head">
          <div>
            <h2>${day.dateLabel}</h2>
            <p>${day.totalOrders} заказов</p>
          </div>
          <div class="day-total">${formatPrice(day.totalAmount)}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Время</th>
              <th>Оплата</th>
              <th>Позиции</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${day.orders
              .map((order) => {
                const items = ((order.items || []) as IMenuItem[])
                  .map(
                    (item) =>
                      `${item.title} × ${item.quantity || 1} — ${formatPrice(
                        Number(item.price || 0) * Number(item.quantity || 1)
                      )}`
                  )
                  .join("<br/>");

                return `
                  <tr>
                    <td><strong>№${getCommonOrderLabel(order)}</strong></td>
                    <td>${new Date(order.created_at).toLocaleString("ru-RU")}</td>
                    <td>${
                      order.payment_method === "online" ? "Онлайн" : "Наличные"
                    }</td>
                    <td>${items || "—"}</td>
                    <td><strong>${formatPrice(Number(order.total || 0))}</strong></td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </section>
    `
    )
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>История заказов</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #f8fafc;
          }
          .report {
            max-width: 1200px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 22px;
            padding: 26px;
            border: 1px solid #e5e7eb;
          }
          .top {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 3px solid #111827;
            padding-bottom: 18px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0;
            font-size: 34px;
            font-weight: 900;
          }
          .date {
            margin-top: 8px;
            color: #64748b;
            font-size: 14px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin: 22px 0;
          }
          .summary div {
            border-radius: 16px;
            background: #f1f5f9;
            padding: 14px;
          }
          .summary span {
            display: block;
            color: #64748b;
            font-size: 12px;
            font-weight: 700;
          }
          .summary strong {
            display: block;
            margin-top: 6px;
            font-size: 20px;
            font-weight: 900;
          }
          .day-section {
            margin-top: 26px;
            page-break-inside: avoid;
          }
          .day-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            margin-bottom: 12px;
          }
          .day-head h2 {
            margin: 0;
            font-size: 22px;
          }
          .day-head p {
            margin: 4px 0 0;
            color: #64748b;
          }
          .day-total {
            font-size: 22px;
            font-weight: 900;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            overflow: hidden;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
          }
          th {
            background: #111827;
            color: white;
            text-align: left;
            padding: 12px;
            font-size: 13px;
          }
          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            font-size: 13px;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .report { border: none; border-radius: 0; }
          }
        </style>
      </head>

      <body>
        <div class="report">
          <div class="top">
            <div>
              <h1>История заказов</h1>
              <div class="date">Сформировано: ${new Date().toLocaleString(
                "ru-RU"
              )}</div>
            </div>
          </div>

          <div class="summary">
            <div>
              <span>Заказов</span>
              <strong>${totalOrders}</strong>
            </div>
            <div>
              <span>Общая сумма</span>
              <strong>${formatPrice(totalAmount)}</strong>
            </div>
            <div>
              <span>Онлайн</span>
              <strong>${formatPrice(onlineAmount)}</strong>
            </div>
            <div>
              <span>Наличные</span>
              <strong>${formatPrice(cashAmount)}</strong>
            </div>
          </div>

          ${body}
        </div>
      </body>
    </html>
  `;
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
      )} — ${order.payment_method === "online" ? "Онлайн" : "Наличные"}`
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

  const handleExportPdf = () => {
    const html = buildHistoryHtml(groupedDays);

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.print();
    }, 400);
  };

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
        <button onClick={handleExportPdf} disabled={!groupedDays.length}>
          PDF таблица
        </button>

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
                        <span>{order.status || "completed"}</span>
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