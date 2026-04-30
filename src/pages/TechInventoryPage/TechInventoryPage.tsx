import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchTechCards } from "../../api/techCards";
import { fetchHistoryOrders, fetchOrders } from "../../api/orders";
import {
  fetchInventoryBalances,
  fetchInventoryOperations,
  fetchInventoryReports,
  TInventoryBalance,
  TInventoryOperation,
  TInventoryReport,
} from "../../api/inventory";

import { IMenuItem } from "../../types/order";

import InventoryTopBar from "./components/InventoryTopBar";
import InventoryStateTable from "./components/InventoryStateTable";
import InventoryUsageTable from "./components/InventoryUsageTable";
import InventoryOperationPanel from "./components/InventoryOperationPanel";
import InventoryCheckPanel from "./components/InventoryCheckPanel";
import InventoryArchivePanel from "./components/InventoryArchivePanel";

import "./TechInventoryPage.scss";

export type Period = "today" | "yesterday" | "all";

export type InventoryView =
  | "state"
  | "today"
  | "yesterday"
  | "all"
  | "received"
  | "writeOff"
  | "check"
  | "archive";

export type OperationType = "received" | "writeOff";

export type InventoryRow = {
  name: string;
  unit: string;
  baseQty: number;
  receivedQty: number;
  usedQty: number;
  writeOffQty: number;
  systemLeft: number;
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

export function normalizeKey(name: string, unit: string) {
  return `${name.trim().toLowerCase()}__${unit}`;
}

export function formatQty(value: number, unit: string) {
  if (unit === "кг" || unit === "л") return `${value.toFixed(3)} ${unit}`;
  return `${value.toFixed(0)} ${unit}`;
}

function getDayRange(period: Period) {
  if (period === "all") return null;

  const target = new Date();

  if (period === "yesterday") {
    target.setDate(target.getDate() - 1);
  }

  const start = new Date(target);
  start.setHours(0, 0, 0, 0);

  const end = new Date(target);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

function getOrderTime(order: any) {
  const rawDate =
    order.ready_at ||
    order.completed_at ||
    order.done_at ||
    order.created_at ||
    order.paid_at ||
    order.updated_at;

  if (!rawDate) return 0;

  const time = new Date(rawDate).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isOrderInPeriod(order: any, period: Period) {
  const range = getDayRange(period);
  if (!range) return true;

  const time = getOrderTime(order);
  if (!time) return false;

  return time >= range.start && time <= range.end;
}

function isOperationInPeriod(operation: TInventoryOperation, period: Period) {
  const range = getDayRange(period);
  if (!range) return true;

  const time = new Date(operation.created_at).getTime();
  if (Number.isNaN(time)) return false;

  return time >= range.start && time <= range.end;
}

/**
 * Списание со склада делаем только тогда,
 * когда заказ перешёл в статус "готов".
 *
 * Если в твоём проекте статус называется иначе,
 * добавь его в массив readyStatuses.
 */
function isOrderReadyForInventory(order: any) {
  const status = String(
    order.status ||
      order.order_status ||
      order.state ||
      order.kitchen_status ||
      ""
  )
    .trim()
    .toLowerCase();

  const readyStatuses = [
    "ready",
    "готов",
    "gotov",
    "done",
    "completed",
    "complete",
    "served",
    "finished",
  ];

  return readyStatuses.includes(status);
}

function TechInventoryPage() {
  const navigate = useNavigate();

  const [techCards, setTechCards] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [operations, setOperations] = useState<TInventoryOperation[]>([]);
  const [balances, setBalances] = useState<TInventoryBalance[]>([]);
  const [reports, setReports] = useState<TInventoryReport[]>([]);

  const [view, setView] = useState<InventoryView>("state");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

    balances.forEach((balance) => {
      const key = normalizeKey(balance.name, balance.unit);

      if (!map.has(key)) {
        map.set(key, {
          name: balance.name,
          unit: balance.unit,
        });
      }
    });

    operations.forEach((operation) => {
      const key = normalizeKey(operation.name, operation.unit);

      if (!map.has(key)) {
        map.set(key, {
          name: operation.name,
          unit: operation.unit,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "ru")
    );
  }, [techCards, balances, operations]);

  const buildRows = (period: Period): InventoryRow[] => {
    const map = new Map<string, InventoryRow>();

    const getBalance = (name: string, unit: string) => {
      const key = normalizeKey(name, unit);

      return balances.find(
        (balance) => normalizeKey(balance.name, balance.unit) === key
      );
    };

    const ensureRow = (name: string, unit: string) => {
      const key = normalizeKey(name, unit);

      if (!map.has(key)) {
        const balance = getBalance(name, unit);

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

    orders
      .filter((order) => isOrderReadyForInventory(order))
      .filter((order) => isOrderInPeriod(order, period))
      .forEach((order) => {
        const orderTime = getOrderTime(order);

        (order.items || []).forEach((food: IMenuItem) => {
          const techCard = techCards.find(
            (card) => card.menu_item_id === food.id
          );

          if (!techCard) return;

          const foodQty = Number(food.quantity || 1);

          (techCard.ingredients || []).forEach((ing: any) => {
            const name = getIngredientName(ing);
            const unit = getIngredientUnit(ing);
            const balance = getBalance(name, unit);

            const confirmedTime = balance?.confirmed_at
              ? new Date(balance.confirmed_at).getTime()
              : 0;

            if (
              period === "all" &&
              confirmedTime &&
              orderTime &&
              orderTime <= confirmedTime
            ) {
              return;
            }

            const row = ensureRow(name, unit);
            row.usedQty += getIngredientQty(ing) * foodQty;
          });
        });
      });

    operations
      .filter((operation) => isOperationInPeriod(operation, period))
      .forEach((operation) => {
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
  };

  const stateRows = useMemo(() => buildRows("all"), [
    techCards,
    balances,
    orders,
    operations,
  ]);

  const todayRows = useMemo(() => buildRows("today"), [
    techCards,
    balances,
    orders,
    operations,
  ]);

  const yesterdayRows = useMemo(() => buildRows("yesterday"), [
    techCards,
    balances,
    orders,
    operations,
  ]);

  const allRows = useMemo(() => buildRows("all"), [
    techCards,
    balances,
    orders,
    operations,
  ]);

  const readyOrdersCount = useMemo(() => {
    return orders.filter((order) => isOrderReadyForInventory(order)).length;
  }, [orders]);

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

        <InventoryTopBar
          view={view}
          saving={saving}
          onView={setView}
          onRefresh={load}
        />
      </div>

      <div className="inventory-info">
        Товаров: <strong>{stateRows.length}</strong> • Готовых заказов:{" "}
        <strong>{readyOrdersCount}</strong> • Всего заказов:{" "}
        <strong>{orders.length}</strong> • Операций:{" "}
        <strong>{operations.length}</strong> • Архивов:{" "}
        <strong>{reports.length}</strong>
      </div>

      {view === "state" && (
        <InventoryStateTable rows={stateRows} formatQty={formatQty} />
      )}

      {view === "today" && (
        <InventoryUsageTable
          title="Сегодня списано по готовым заказам"
          rows={todayRows}
          formatQty={formatQty}
        />
      )}

      {view === "yesterday" && (
        <InventoryUsageTable
          title="Вчера списано по готовым заказам"
          rows={yesterdayRows}
          formatQty={formatQty}
        />
      )}

      {view === "all" && (
        <InventoryUsageTable
          title="Всё списано по готовым заказам"
          rows={allRows}
          formatQty={formatQty}
        />
      )}

      {view === "received" && (
        <InventoryOperationPanel
          type="received"
          products={productOptions}
          saving={saving}
          setSaving={setSaving}
          onSaved={load}
        />
      )}

      {view === "writeOff" && (
        <InventoryOperationPanel
          type="writeOff"
          products={productOptions}
          saving={saving}
          setSaving={setSaving}
          onSaved={load}
        />
      )}

      {view === "check" && (
        <InventoryCheckPanel
          rows={stateRows}
          operations={operations}
          saving={saving}
          setSaving={setSaving}
          onSaved={load}
        />
      )}

      {view === "archive" && <InventoryArchivePanel reports={reports} />}
    </div>
  );
}

export default TechInventoryPage;