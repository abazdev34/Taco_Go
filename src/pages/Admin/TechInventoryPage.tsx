import { useEffect, useMemo, useState } from "react";
import { fetchTechCards } from "../../api/techCards";
import { fetchHistoryOrders, fetchOrders } from "../../api/orders";
import { IMenuItem } from "../../types/order";
import "./TechInventoryPage.scss";

type Period = "today" | "yesterday" | "all";
type OperationType = "received" | "writeOff";

type InventoryRow = {
  name: string;
  unit: string;
  startQty: number;
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

const START_KEY = "tech_inventory_start_qty";
const RECEIVED_KEY = "tech_inventory_received_qty";
const WRITEOFF_KEY = "tech_inventory_writeoff_qty";

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

function readStorage(key: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

function makeOperationItem(): OperationItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    unit: "кг",
    quantity: "",
  };
}

function TechInventoryPage() {
  const [techCards, setTechCards] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>("today");
  const [loading, setLoading] = useState(true);

  const [startQty, setStartQty] = useState<Record<string, number>>(() =>
    readStorage(START_KEY)
  );
  const [receivedQty, setReceivedQty] = useState<Record<string, number>>(() =>
    readStorage(RECEIVED_KEY)
  );
  const [writeOffQty, setWriteOffQty] = useState<Record<string, number>>(() =>
    readStorage(WRITEOFF_KEY)
  );
  const [factQty, setFactQty] = useState<Record<string, string>>({});

  const [operationOpen, setOperationOpen] = useState(false);
  const [operationType, setOperationType] = useState<OperationType>("received");
  const [operationItems, setOperationItems] = useState<OperationItem[]>([
    makeOperationItem(),
  ]);

  const load = async () => {
    try {
      setLoading(true);

      const [cards, activeOrders, archiveOrders] = await Promise.all([
        fetchTechCards(),
        fetchOrders(),
        fetchHistoryOrders(),
      ]);

      setTechCards(cards || []);
      setOrders([...(activeOrders || []), ...(archiveOrders || [])]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    localStorage.setItem(START_KEY, JSON.stringify(startQty));
  }, [startQty]);

  useEffect(() => {
    localStorage.setItem(RECEIVED_KEY, JSON.stringify(receivedQty));
  }, [receivedQty]);

  useEffect(() => {
    localStorage.setItem(WRITEOFF_KEY, JSON.stringify(writeOffQty));
  }, [writeOffQty]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => isOrderInPeriod(order, period));
  }, [orders, period]);

  const productOptions = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();

    techCards.forEach((card) => {
      (card.ingredients || []).forEach((ing: any) => {
        const name = getIngredientName(ing);
        const unit = getIngredientUnit(ing);
        const key = normalizeKey(name, unit);

        if (!map.has(key)) {
          map.set(key, { name, unit });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    );
  }, [techCards]);

  const rows = useMemo<InventoryRow[]>(() => {
    const map = new Map<string, InventoryRow>();

    techCards.forEach((card) => {
      (card.ingredients || []).forEach((ing: any) => {
        const name = getIngredientName(ing);
        const unit = getIngredientUnit(ing);
        const key = normalizeKey(name, unit);

        if (!map.has(key)) {
          map.set(key, {
            name,
            unit,
            startQty: 0,
            receivedQty: 0,
            usedQty: 0,
            writeOffQty: 0,
            systemLeft: 0,
          });
        }
      });
    });

    filteredOrders.forEach((order) => {
      (order.items || []).forEach((food: IMenuItem) => {
        const techCard = techCards.find((card) => card.menu_item_id === food.id);
        if (!techCard) return;

        const foodQty = Number(food.quantity || 1);

        (techCard.ingredients || []).forEach((ing: any) => {
          const name = getIngredientName(ing);
          const unit = getIngredientUnit(ing);
          const key = normalizeKey(name, unit);

          if (!map.has(key)) {
            map.set(key, {
              name,
              unit,
              startQty: 0,
              receivedQty: 0,
              usedQty: 0,
              writeOffQty: 0,
              systemLeft: 0,
            });
          }

          const row = map.get(key)!;
          row.usedQty += getIngredientQty(ing) * foodQty;
        });
      });
    });

    return Array.from(map.entries())
      .map(([key, row]) => {
        const start = Number(startQty[key] || 0);
        const received = Number(receivedQty[key] || 0);
        const writeOff = Number(writeOffQty[key] || 0);

        return {
          ...row,
          startQty: start,
          receivedQty: received,
          writeOffQty: writeOff,
          systemLeft: start + received - row.usedQty - writeOff,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [techCards, filteredOrders, startQty, receivedQty, writeOffQty]);

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

  const saveOperation = () => {
    const valid = operationItems.filter(
      (item) => item.name.trim() && Number(item.quantity || 0) > 0
    );

    if (!valid.length) {
      alert("Добавьте хотя бы один продукт");
      return;
    }

    const setter =
      operationType === "received" ? setReceivedQty : setWriteOffQty;

    setter((prev) => {
      const next = { ...prev };

      valid.forEach((item) => {
        const key = normalizeKey(item.name, item.unit);
        next[key] = Number(next[key] || 0) + Number(item.quantity || 0);
      });

      return next;
    });

    closeOperation();
  };

  const resetAll = () => {
    if (!confirm("Очистить начало, приход и списание?")) return;

    setStartQty({});
    setReceivedQty({});
    setWriteOffQty({});
    setFactQty({});

    localStorage.removeItem(START_KEY);
    localStorage.removeItem(RECEIVED_KEY);
    localStorage.removeItem(WRITEOFF_KEY);
  };

  if (loading) {
    return <div className="inventory-page">Загрузка склада...</div>;
  }

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <span>Склад</span>
          <h1>Расход ингредиентов</h1>
          <p>Начало + Приход − Заказы − Списание = Остаток по системе.</p>
        </div>

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

          <button type="button" className="success" onClick={() => openOperation("received")}>
            + Приход
          </button>

          <button type="button" className="warning" onClick={() => openOperation("writeOff")}>
            − Списание
          </button>

          <button type="button" onClick={load}>
            Обновить
          </button>

          <button type="button" className="danger" onClick={resetAll}>
            Очистить
          </button>
        </div>
      </div>

      <div className="inventory-info">
        Заказов в расчёте: <strong>{filteredOrders.length}</strong>
      </div>

      <div className="inventory-table-wrap">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Ингредиент</th>
              <th>Ед.</th>
              <th>Начало</th>
              <th>Приход</th>
              <th>Списано заказами</th>
              <th>Списание</th>
              <th>Остаток система</th>
              <th>Факт остаток</th>
              <th>Разница</th>
              <th>Статус</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="inventory-empty">
                  Нет ингредиентов. Проверьте сохранённые техкарты.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const key = normalizeKey(row.name, row.unit);
                const factValue = factQty[key] ?? "";
                const hasFact = factValue !== "";
                const fact = Number(factValue || 0);
                const diff = hasFact ? fact - row.systemLeft : 0;

                const dangerLimit =
                  row.unit === "кг" || row.unit === "л" ? 0.4 : 1;

                const isDanger = hasFact && Math.abs(diff) > dangerLimit;

                return (
                  <tr key={key} className={isDanger ? "danger-row" : ""}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>

                    <td>{row.unit}</td>

                    <td>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0"
                        value={startQty[key] ?? ""}
                        onChange={(e) =>
                          setStartQty((prev) => ({
                            ...prev,
                            [key]: Number(e.target.value || 0),
                          }))
                        }
                      />
                    </td>

                    <td className="plus">{formatQty(row.receivedQty, row.unit)}</td>

                    <td className="used">{formatQty(row.usedQty, row.unit)}</td>

                    <td className="minus">{formatQty(row.writeOffQty, row.unit)}</td>

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
                      {hasFact ? formatQty(diff, row.unit) : "—"}
                    </td>

                    <td>
                      {isDanger ? (
                        <span className="status danger">Разница больше 400 г</span>
                      ) : hasFact ? (
                        <span className="status ok">Норма</span>
                      ) : (
                        <span className="status muted">Введите факт</span>
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

              <button type="button" className="save" onClick={saveOperation}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TechInventoryPage;