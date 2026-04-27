import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTechCards } from "../../api/techCards";
import { fetchHistoryOrders, fetchOrders } from "../../api/orders";
import {
  createInventoryOperations,
  createInventoryReport,
  deleteInventoryOperationsByIds,
  deleteInventoryReport,
  fetchInventoryBalances,
  fetchInventoryOperations,
  fetchInventoryReports,
  TInventoryBalance,
  TInventoryOperation,
  TInventoryReport,
  upsertInventoryBalances,
} from "../../api/inventory";
import { IMenuItem } from "../../types/order";
import { sendEmailReport } from "../../utils/email";
import "./TechInventoryPage.scss";

type Period = "today" | "yesterday" | "all";
type OperationType = "received" | "writeOff";

type InventoryRow = {
  name: string;
  unit: string;
  baseQty: number;
  receivedQty: number;
  usedQty: number;
  writeOffQty: number;
  systemLeft: number;
};

type OperationItem = {
  id: string;
  name: string;
  unit: string;
  quantity: string;
};

function getIngredientName(item: any) {
  return item?.name || item?.title || item?.ingredient_name || "Без названия";
}

function getIngredientUnit(item: any) {
  return item?.unit || "кг";
}

function getIngredientQty(item: any) {
  return Number(item?.quantity || 0);
}

function normalizeKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}__${unit}`;
}

function formatQty(value: number, unit: string) {
  if (unit === "кг" || unit === "л") return `${value.toFixed(3)} ${unit}`;
  return `${value.toFixed(0)} ${unit}`;
}

function getDayRange(period: Period) {
  if (period === "all") return null;

  const now = new Date();
  const target = new Date(now);

  if (period === "yesterday") target.setDate(target.getDate() - 1);

  const start = new Date(target);
  start.setHours(0, 0, 0, 0);

  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  return { start: start.getTime(), end: end.getTime() };
}

function isOrderInPeriod(order: any, period: Period) {
  const range = getDayRange(period);
  if (!range) return true;

  const rawDate = order.created_at || order.paid_at || order.updated_at;
  if (!rawDate) return false;

  const time = new Date(rawDate).getTime();
  if (Number.isNaN(time)) return false;

  return time >= range.start && time <= range.end;
}

function isOperationInPeriod(operation: TInventoryOperation, period: Period) {
  const range = getDayRange(period);
  if (!range) return true;

  const time = new Date(operation.created_at).getTime();
  if (Number.isNaN(time)) return false;

  return time >= range.start && time <= range.end;
}

function makeOperationItem(): OperationItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    unit: "кг",
    quantity: "",
  };
}

function buildReportHtml(
  rows: InventoryRow[],
  operations: TInventoryOperation[],
  factQty: Record<string, string>
) {
  const operationRows = operations
    .map(
      (op) => `
        <tr>
          <td>${new Date(op.created_at).toLocaleString("ru-RU")}</td>
          <td>${op.type === "received" ? "Приход" : "Списание"}</td>
          <td>${op.name}</td>
          <td>${formatQty(Number(op.quantity || 0), op.unit)}</td>
        </tr>
      `
    )
    .join("");

  const balanceRows = rows
    .map((row) => {
      const key = normalizeKey(row.name, row.unit);
      const fact =
        factQty[key] === "" || factQty[key] == null
          ? row.systemLeft
          : Number(factQty[key] || 0);

      return `
        <tr>
          <td>${row.name}</td>
          <td>${row.unit}</td>
          <td>${formatQty(row.systemLeft, row.unit)}</td>
          <td>${formatQty(fact, row.unit)}</td>
          <td>${formatQty(fact - row.systemLeft, row.unit)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Складской отчёт</title>
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
          .section {
            margin-top: 28px;
          }
          h2 {
            margin: 0 0 12px;
            font-size: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
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
          <h1>Складской отчёт</h1>
          <div class="date">Сформировано: ${new Date().toLocaleString(
            "ru-RU"
          )}</div>

          <div class="section">
            <h2>Операции</h2>
            <table>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Тип</th>
                  <th>Продукт</th>
                  <th>Количество</th>
                </tr>
              </thead>
              <tbody>
                ${
                  operationRows ||
                  `<tr><td colspan="4">Операций нет</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2>Подтверждённые остатки</h2>
            <table>
              <thead>
                <tr>
                  <th>Ингредиент</th>
                  <th>Ед.</th>
                  <th>Система</th>
                  <th>Факт</th>
                  <th>Разница</th>
                </tr>
              </thead>
              <tbody>${balanceRows}</tbody>
            </table>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildReportEmailText(
  rows: InventoryRow[],
  operations: TInventoryOperation[],
  factQty: Record<string, string>
) {
  return `
Складской отчёт
Дата: ${new Date().toLocaleString("ru-RU")}

Операции:
${
  operations.length
    ? operations
        .map(
          (op) =>
            `${new Date(op.created_at).toLocaleString("ru-RU")} | ${
              op.type === "received" ? "Приход" : "Списание"
            } | ${op.name} | ${formatQty(Number(op.quantity || 0), op.unit)}`
        )
        .join("\n")
    : "Операций нет"
}

Подтверждённые остатки:
${rows
  .map((row) => {
    const key = normalizeKey(row.name, row.unit);
    const fact =
      factQty[key] === "" || factQty[key] == null
        ? row.systemLeft
        : Number(factQty[key] || 0);

    return `${row.name}: система ${formatQty(
      row.systemLeft,
      row.unit
    )}, факт ${formatQty(fact, row.unit)}, разница ${formatQty(
      fact - row.systemLeft,
      row.unit
    )}`;
  })
  .join("\n")}
  `.trim();
}

function TechInventoryPage() {
  const navigate = useNavigate();

  const [techCards, setTechCards] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [operations, setOperations] = useState<TInventoryOperation[]>([]);
  const [balances, setBalances] = useState<TInventoryBalance[]>([]);
  const [reports, setReports] = useState<TInventoryReport[]>([]);

  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [factQty, setFactQty] = useState<Record<string, string>>({});
  const [operationOpen, setOperationOpen] = useState(false);
  const [operationHistoryOpen, setOperationHistoryOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedReport, setSelectedReport] =
    useState<TInventoryReport | null>(null);

  const [operationType, setOperationType] =
    useState<OperationType>("received");
  const [operationItems, setOperationItems] = useState<OperationItem[]>([
    makeOperationItem(),
  ]);

  const load = async () => {
    try {
      setLoading(true);

      const [cards, activeOrders, archiveOrders, ops, bals, reps] =
        await Promise.all([
          fetchTechCards(),
          fetchOrders(),
          fetchHistoryOrders(),
          fetchInventoryOperations(),
          fetchInventoryBalances(),
          fetchInventoryReports(),
        ]);

      setTechCards(cards || []);
      setOrders([...(activeOrders || []), ...(archiveOrders || [])]);
      setOperations(ops || []);
      setBalances(bals || []);
      setReports(reps || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => isOrderInPeriod(order, period));
  }, [orders, period]);

  const filteredOperations = useMemo(() => {
    return operations.filter((operation) =>
      isOperationInPeriod(operation, period)
    );
  }, [operations, period]);

  const productOptions = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();

    techCards.forEach((card) => {
      (card.ingredients || []).forEach((ing: any) => {
        const name = getIngredientName(ing);
        const unit = getIngredientUnit(ing);
        const key = normalizeKey(name, unit);
        if (!map.has(key)) map.set(key, { name, unit });
      });
    });

    balances.forEach((balance) => {
      const key = normalizeKey(balance.name, balance.unit);
      if (!map.has(key)) {
        map.set(key, { name: balance.name, unit: balance.unit });
      }
    });

    operations.forEach((operation) => {
      const key = normalizeKey(operation.name, operation.unit);
      if (!map.has(key)) {
        map.set(key, { name: operation.name, unit: operation.unit });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    );
  }, [techCards, balances, operations]);

  const rows = useMemo<InventoryRow[]>(() => {
    const map = new Map<string, InventoryRow>();

    const ensureRow = (name: string, unit: string) => {
      const key = normalizeKey(name, unit);

      if (!map.has(key)) {
        const balance = balances.find(
          (b) => normalizeKey(b.name, b.unit) === key
        );

        map.set(key, {
          name,
          unit,
          baseQty: Number(balance?.quantity || 0),
          receivedQty: 0,
          usedQty: 0,
          writeOffQty: 0,
          systemLeft: 0,
        });
      }

      return map.get(key)!;
    };

    techCards.forEach((card) => {
      (card.ingredients || []).forEach((ing: any) => {
        ensureRow(getIngredientName(ing), getIngredientUnit(ing));
      });
    });

    balances.forEach((balance) => {
      ensureRow(balance.name, balance.unit);
    });

    filteredOrders.forEach((order) => {
      (order.items || []).forEach((food: IMenuItem) => {
        const techCard = techCards.find((card) => card.menu_item_id === food.id);
        if (!techCard) return;

        const foodQty = Number(food.quantity || 1);

        (techCard.ingredients || []).forEach((ing: any) => {
          const row = ensureRow(getIngredientName(ing), getIngredientUnit(ing));
          row.usedQty += getIngredientQty(ing) * foodQty;
        });
      });
    });

    filteredOperations.forEach((operation) => {
      const row = ensureRow(operation.name, operation.unit);

      if (operation.type === "received") {
        row.receivedQty += Number(operation.quantity || 0);
      } else {
        row.writeOffQty += Number(operation.quantity || 0);
      }
    });

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        systemLeft:
          row.baseQty + row.receivedQty - row.usedQty - row.writeOffQty,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [techCards, balances, filteredOrders, filteredOperations]);

  const openOperation = (type: OperationType) => {
    setOperationType(type);
    setOperationItems([makeOperationItem()]);
    setOperationOpen(true);
  };

  const closeOperation = () => {
    setOperationOpen(false);
    setOperationItems([makeOperationItem()]);
  };

  const updateOperationItem = (
    id: string,
    field: keyof OperationItem,
    value: string
  ) => {
    setOperationItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === "name") {
          const found = productOptions.find(
            (option) => option.name.toLowerCase() === value.toLowerCase()
          );

          if (found) updated.unit = found.unit;
        }

        return updated;
      })
    );
  };

  const addOperationItem = () => {
    setOperationItems((prev) => [...prev, makeOperationItem()]);
  };

  const removeOperationItem = (id: string) => {
    setOperationItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      return next.length ? next : [makeOperationItem()];
    });
  };

  const saveOperation = async () => {
    const valid = operationItems.filter(
      (item) => item.name.trim() && Number(item.quantity || 0) > 0
    );

    if (!valid.length) {
      alert("Добавьте хотя бы один продукт");
      return;
    }

    try {
      setSaving(true);

      await createInventoryOperations(
        valid.map((item) => ({
          name: item.name.trim(),
          unit: item.unit,
          quantity: Number(item.quantity || 0),
          type: operationType,
        }))
      );

      closeOperation();
      await load();
    } catch (e: any) {
      console.error("INVENTORY SAVE ERROR:", e);
      alert(e?.message || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  };

  const printReport = (report: TInventoryReport) => {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(report.html);
    win.document.close();

    setTimeout(() => {
      win.print();
    }, 400);
  };

  const emailReport = (report: TInventoryReport) => {
    sendEmailReport(report.title, report.email_text);
  };

  const removeReport = async (report: TInventoryReport) => {
    const ok = confirm("Удалить этот архивный отчёт?");
    if (!ok) return;

    try {
      await deleteInventoryReport(report.id);
      setSelectedReport(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Не удалось удалить отчёт");
    }
  };

  const handleConfirmFact = async () => {
    if (!rows.length) return;

    const ok = confirm(
      "Подтвердить фактические остатки? Системный остаток станет равен факту, операции будут перенесены в архив и очищены."
    );

    if (!ok) return;

    try {
      setSaving(true);

      const now = new Date().toISOString();

      const payload = rows.map((row) => {
        const key = normalizeKey(row.name, row.unit);

        const fact =
          factQty[key] === "" || factQty[key] == null
            ? row.systemLeft
            : Number(factQty[key] || 0);

        const correctedBaseQty =
          fact - row.receivedQty + row.usedQty + row.writeOffQty;

        return {
          name: row.name,
          unit: row.unit,
          quantity: correctedBaseQty,
          confirmed_at: now,
        };
      });

      const html = buildReportHtml(rows, filteredOperations, factQty);
      const emailText = buildReportEmailText(rows, filteredOperations, factQty);
      const title = `Складской отчёт ${new Date().toLocaleString("ru-RU")}`;

      await createInventoryReport({
        title,
        html,
        email_text: emailText,
      });

      sendEmailReport(title, emailText);

      await upsertInventoryBalances(payload);

      await deleteInventoryOperationsByIds(
        filteredOperations.map((operation) => operation.id)
      );

      setFactQty({});
      setOperationHistoryOpen(false);
      setArchiveOpen(true);
      await load();

      alert("Фактические остатки подтверждены");
    } catch (e: any) {
      console.error("CONFIRM FACT ERROR:", e);
      alert(e?.message || "Не удалось подтвердить факт");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="inventory-page">Загрузка склада...</div>;
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <button
          type="button"
          className="inventory-exit-btn"
          onClick={() => navigate("/admin")}
        >
          Выйти
        </button>

        <div className="inventory-actions">
          <button
            type="button"
            className={period === "today" ? "active" : ""}
            onClick={() => setPeriod("today")}
          >
            Сегодня
          </button>

          <button
            type="button"
            className={period === "yesterday" ? "active" : ""}
            onClick={() => setPeriod("yesterday")}
          >
            Вчера
          </button>

          <button
            type="button"
            className={period === "all" ? "active" : ""}
            onClick={() => setPeriod("all")}
          >
            Всё
          </button>

          <button
            type="button"
            className="success"
            onClick={() => openOperation("received")}
          >
            + Приход
          </button>

          <button
            type="button"
            className="warning"
            onClick={() => openOperation("writeOff")}
          >
            − Списание
          </button>

          <button
            type="button"
            className="operations"
            onClick={() => setOperationHistoryOpen((prev) => !prev)}
          >
            {operationHistoryOpen ? "Скрыть операции" : "Операции"}
          </button>

          <button
            type="button"
            className="archive"
            onClick={() => setArchiveOpen((prev) => !prev)}
          >
            {archiveOpen ? "Скрыть архив" : "Архив"}
          </button>

          <button type="button" onClick={load}>
            Обновить
          </button>

          <button
            type="button"
            className="confirm"
            onClick={handleConfirmFact}
            disabled={saving}
          >
            {saving ? "Сохранение..." : "Подтвердить факт"}
          </button>
        </div>
      </div>

      <div className="inventory-info">
        Заказов: <strong>{filteredOrders.length}</strong> • Операций:{" "}
        <strong>{filteredOperations.length}</strong> • Архивов:{" "}
        <strong>{reports.length}</strong>
      </div>

      {operationHistoryOpen && (
        <div className="inventory-operations-panel">
          <div className="inventory-operations-panel__head">
            <h2>История операций</h2>
            <button
              type="button"
              onClick={() => setOperationHistoryOpen(false)}
            >
              Закрыть
            </button>
          </div>

          {filteredOperations.length === 0 ? (
            <div className="inventory-operations-empty">Операций нет</div>
          ) : (
            <div className="inventory-operations-list">
              {filteredOperations.map((operation) => (
                <div key={operation.id} className="inventory-operation-card">
                  <div>
                    <strong>{operation.name}</strong>
                    <span>
                      {new Date(operation.created_at).toLocaleString("ru-RU")}
                    </span>
                  </div>

                  <b
                    className={
                      operation.type === "received" ? "op-plus" : "op-minus"
                    }
                  >
                    {operation.type === "received" ? "+" : "−"}
                    {formatQty(Number(operation.quantity || 0), operation.unit)}
                  </b>

                  <em>
                    {operation.type === "received" ? "Приход" : "Списание"}
                  </em>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {archiveOpen && (
        <div className="inventory-archive-panel">
          <div className="inventory-archive-panel__head">
            <h2>Архив подтверждений</h2>
            <button type="button" onClick={() => setArchiveOpen(false)}>
              Закрыть
            </button>
          </div>

          {reports.length === 0 ? (
            <div className="inventory-operations-empty">Архив пустой</div>
          ) : (
            <div className="inventory-archive-list">
              {reports.map((report) => (
                <div key={report.id} className="inventory-archive-card">
                  <div>
                    <strong>{report.title}</strong>
                    <span>
                      {new Date(report.created_at).toLocaleString("ru-RU")}
                    </span>
                  </div>

                  <div className="inventory-archive-actions">
                    <button
                      type="button"
                      onClick={() => setSelectedReport(report)}
                    >
                      Смотреть
                    </button>

                    <button type="button" onClick={() => printReport(report)}>
                      PDF
                    </button>

                    <button type="button" onClick={() => emailReport(report)}>
                      Почта
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => removeReport(report)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Ингредиент</th>
              <th>Ед.</th>
              <th>Списано заказами</th>
              <th>Остаток система</th>
              <th>Факт остаток</th>
              <th>Разница</th>
              <th>Статус</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="inventory-empty">
                  Нет ингредиентов. Проверьте сохранённые техкарты.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = normalizeKey(row.name, row.unit);
                const factValue = factQty[key] ?? "";
                const hasFact = factValue !== "";
                const fact = hasFact ? Number(factValue || 0) : row.systemLeft;
                const diff = fact - row.systemLeft;
                const dangerLimit =
                  row.unit === "кг" || row.unit === "л" ? 0.4 : 1;
                const isDanger = Math.abs(diff) > dangerLimit;

                return (
                  <tr key={key} className={isDanger ? "danger-row" : ""}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>

                    <td>{row.unit}</td>

                    <td className="used">{formatQty(row.usedQty, row.unit)}</td>

                    <td className="system-left">
                      {formatQty(row.systemLeft, row.unit)}
                    </td>

                    <td>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Факт"
                        value={factValue}
                        onChange={(e) =>
                          setFactQty((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </td>

                    <td className={diff < 0 ? "minus" : diff > 0 ? "plus" : ""}>
                      {formatQty(diff, row.unit)}
                    </td>

                    <td>
                      {isDanger ? (
                        <span className="status danger">
                          Разница больше 400 г
                        </span>
                      ) : (
                        <span className="status ok">Норма</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {operationOpen && (
        <div className="inventory-modal">
          <div className="inventory-modal__overlay" onClick={closeOperation} />

          <div className="inventory-modal__card">
            <div className="inventory-modal__head">
              <div>
                <h2>
                  {operationType === "received"
                    ? "Приход продуктов"
                    : "Списание продуктов"}
                </h2>
                <p>Введите продукты, единицу измерения и количество.</p>
              </div>

              <button type="button" onClick={closeOperation}>
                ✕
              </button>
            </div>

            <div className="inventory-operation-list">
              {operationItems.map((item, index) => {
                const filteredOptions = productOptions
                  .filter((option) =>
                    option.name
                      .toLowerCase()
                      .includes(item.name.trim().toLowerCase())
                  )
                  .slice(0, 8);

                return (
                  <div key={item.id} className="inventory-operation-row">
                    <div className="inventory-operation-index">{index + 1}</div>

                    <label>
                      <span>Продукт</span>
                      <input
                        list={`products-${item.id}`}
                        placeholder="Начните писать название"
                        value={item.name}
                        onChange={(e) =>
                          updateOperationItem(item.id, "name", e.target.value)
                        }
                      />

                      <datalist id={`products-${item.id}`}>
                        {filteredOptions.map((option) => (
                          <option
                            key={`${option.name}-${option.unit}`}
                            value={option.name}
                          />
                        ))}
                      </datalist>
                    </label>

                    <label>
                      <span>Ед.</span>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          updateOperationItem(item.id, "unit", e.target.value)
                        }
                      >
                        <option value="кг">кг</option>
                        <option value="л">л</option>
                        <option value="шт">шт</option>
                      </select>
                    </label>

                    <label>
                      <span>Количество</span>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0"
                        value={item.quantity}
                        onChange={(e) =>
                          updateOperationItem(
                            item.id,
                            "quantity",
                            e.target.value
                          )
                        }
                      />
                    </label>

                    <button
                      type="button"
                      className="inventory-operation-remove"
                      onClick={() => removeOperationItem(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="inventory-add-row"
              onClick={addOperationItem}
            >
              + Добавить продукт
            </button>

            <div className="inventory-modal__footer">
              <button type="button" onClick={closeOperation}>
                Отмена
              </button>

              <button
                type="button"
                className="save"
                onClick={saveOperation}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="inventory-report-modal">
          <div
            className="inventory-report-modal__overlay"
            onClick={() => setSelectedReport(null)}
          />

          <div className="inventory-report-modal__card">
            <div className="inventory-report-modal__head">
              <h2>{selectedReport.title}</h2>

              <button type="button" onClick={() => setSelectedReport(null)}>
                ✕
              </button>
            </div>

            <div
              className="inventory-report-preview"
              dangerouslySetInnerHTML={{ __html: selectedReport.html }}
            />

            <div className="inventory-report-modal__footer">
              <button type="button" onClick={() => printReport(selectedReport)}>
                PDF
              </button>

              <button type="button" onClick={() => emailReport(selectedReport)}>
                Отправить на почту
              </button>

              <button
                type="button"
                className="danger"
                onClick={() => removeReport(selectedReport)}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechInventoryPage;