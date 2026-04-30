import { useMemo, useState } from "react";
import {
  createInventoryReport,
  deleteInventoryOperationsByIds,
  upsertInventoryBalances,
  TInventoryOperation,
} from "../../../api/inventory";

import { InventoryRow, formatQty } from "../TechInventoryPage";

type Props = {
  rows: InventoryRow[];
  operations: TInventoryOperation[];
  saving: boolean;
  setSaving: (value: boolean) => void;
  onSaved: () => Promise<void>;
};

function buildReportHtml(rows: InventoryRow[], factQty: Record<string, string>) {
  const rowsHtml = rows
    .map((row) => {
      const key = `${row.name}-${row.unit}`;
      const fact = Number(factQty[key] || 0);
      const diff = fact - row.systemLeft;

      return `
        <tr>
          <td>${row.name}</td>
          <td>${row.unit}</td>
          <td>${formatQty(row.systemLeft, row.unit)}</td>
          <td>${formatQty(fact, row.unit)}</td>
          <td>${formatQty(diff, row.unit)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Сверка склада</title>
        <style>
          body {
            margin: 0;
            padding: 28px;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #f8fafc;
          }

          .report {
            max-width: 1100px;
            margin: 0 auto;
            background: #fff;
            border-radius: 20px;
            padding: 24px;
            border: 1px solid #e5e7eb;
          }

          h1 {
            margin: 0;
            font-size: 30px;
          }

          .date {
            margin-top: 8px;
            color: #64748b;
          }

          table {
            width: 100%;
            margin-top: 24px;
            border-collapse: collapse;
          }

          th {
            padding: 12px;
            background: #111827;
            color: white;
            text-align: left;
          }

          td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }

          tr:nth-child(even) td {
            background: #f8fafc;
          }
        </style>
      </head>

      <body>
        <div class="report">
          <h1>Сверка склада</h1>
          <div class="date">Дата: ${new Date().toLocaleString("ru-RU")}</div>

          <table>
            <thead>
              <tr>
                <th>Товар</th>
                <th>Ед.</th>
                <th>Было в системе</th>
                <th>Факт</th>
                <th>Разница</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </body>
    </html>
  `;
}

function InventoryCheckPanel({
  rows,
  operations,
  saving,
  setSaving,
  onSaved,
}: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [factQty, setFactQty] = useState<Record<string, string>>({});
  const [created, setCreated] = useState(false);
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return rows;

    return rows.filter((row) => row.name.toLowerCase().includes(value));
  }, [rows, search]);

  const chosen = rows.filter((row) => {
    const key = `${row.name}-${row.unit}`;
    return selected[key];
  });

  const confirm = async () => {
    const validRows = chosen.filter((row) => {
      const key = `${row.name}-${row.unit}`;
      return factQty[key] !== "" && factQty[key] != null;
    });

    if (!validRows.length) {
      alert("Укажите фактическое количество");
      return;
    }

    const payload = validRows.map((row) => {
      const key = `${row.name}-${row.unit}`;
      const fact = Number(factQty[key] || 0);

      return {
        name: row.name,
        unit: row.unit,
        quantity: fact,
        confirmed_at: new Date().toISOString(),
      };
    });

    try {
      setSaving(true);

      const title = `Сверка склада ${new Date().toLocaleString("ru-RU")}`;
      const html = buildReportHtml(validRows, factQty);

      await createInventoryReport({
        title,
        html,
        email_text: title,
      });

      await upsertInventoryBalances(payload);

      if (operations.length > 0) {
        await deleteInventoryOperationsByIds(operations.map((op) => op.id));
      }

      setSelected({});
      setFactQty({});
      setCreated(false);
      setSearch("");

      await onSaved();

      alert("Сверка подтверждена");
    } catch (e: any) {
      alert(e?.message || "Не удалось подтвердить сверку");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-card">
      <div className="inventory-card-head">
        <div>
          <h2>Сверка склада</h2>
          <p>
            Выберите товары, создайте сверку и введите фактический остаток.
            После подтверждения эти значения станут новым остатком.
          </p>
        </div>
      </div>

      {!created && (
        <>
          <input
            className="inventory-search"
            placeholder="Поиск товара..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="inventory-select-list">
            {filteredRows.map((row) => {
              const key = `${row.name}-${row.unit}`;

              return (
                <label key={key} className="inventory-check-row">
                  <input
                    type="checkbox"
                    checked={!!selected[key]}
                    onChange={(e) =>
                      setSelected((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                  />

                  <span>{row.name}</span>
                  <em>{row.unit}</em>
                </label>
              );
            })}
          </div>

          <div className="inventory-card-actions">
            <button
              type="button"
              className="confirm"
              onClick={() => setCreated(true)}
              disabled={chosen.length === 0}
            >
              Создать сверку
            </button>
          </div>
        </>
      )}

      {created && (
        <>
          <div className="inventory-fact-list">
            {chosen.map((row) => {
              const key = `${row.name}-${row.unit}`;

              return (
                <label key={key}>
                  <span>{row.name}</span>

                  <input
                    type="number"
                    step="0.001"
                    placeholder={`Факт ${row.unit}`}
                    value={factQty[key] || ""}
                    onChange={(e) =>
                      setFactQty((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                  />
                </label>
              );
            })}
          </div>

          <div className="inventory-card-actions">
            <button
              type="button"
              onClick={() => {
                setCreated(false);
                setFactQty({});
              }}
            >
              Назад
            </button>

            <button
              type="button"
              className="save"
              onClick={confirm}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Подтвердить"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default InventoryCheckPanel;