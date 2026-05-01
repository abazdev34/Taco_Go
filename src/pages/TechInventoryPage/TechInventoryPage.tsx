import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchTechCards } from "../../api/techCards";
import { fetchHistoryOrders, fetchOrders } from "../../api/orders";
import {
  fetchInventoryBalances,
  fetchInventoryOperations,
  fetchInventoryProducts,
  fetchInventoryReports,
  TInventoryBalance,
  TInventoryOperation,
  TInventoryProduct,
  TInventoryReport,
} from "../../api/inventory";

import { IMenuItem } from "../../types/order";

import InventoryTopBar from "./components/InventoryTopBar";
import InventoryStateTable from "./components/InventoryStateTable";
import InventoryUsageTable from "./components/InventoryUsageTable";
import InventoryOperationPanel from "./components/InventoryOperationPanel";
import InventoryCheckPanel from "./components/InventoryCheckPanel";
import InventoryArchivePanel from "./components/InventoryArchivePanel";
import InventoryProductsPanel from "./components/InventoryProductsPanel";

import "./TechInventoryPage.scss";

export type Period = "today" | "yesterday" | "all";

export type InventoryView =
  | "state"
  | "products"
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

function toNumber(value: any) {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function getIngredientName(item: any) {
  return item?.name || item?.title || item?.ingredient_name || "Без названия";
}

function getIngredientUnit(item: any) {
  return item?.unit || "кг";
}

function getIngredientQty(item: any) {
  return toNumber(item?.quantity);
}

function getFoodQty(food: any, order?: any) {
  const rawQty =
    food?.order_quantity ??
    food?.cart_quantity ??
    food?.cartQuantity ??
    food?.qty ??
    food?.count ??
    food?.quantity;

  const qty = toNumber(rawQty);

  if (qty > 1) return qty;

  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const price = toNumber(food?.price);
  const total = toNumber(order?.total);

  if (orderItems.length === 1 && price > 0 && total > price) {
    return Math.max(Math.round(total / price), 1);
  }

  return qty > 0 ? qty : 1;
}

export function normalizeKey(name: string, unit: string) {
  return `${String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")}__${String(unit || "")
    .trim()
    .toLowerCase()}`;
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
  const [products, setProducts] = useState<TInventoryProduct[]>([]);

  const [view, setView] = useState<InventoryView>("state");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);

      const [cards, activeOrders, archiveOrders, ops, bals, reps, prods] =
        await Promise.all([
          fetchTechCards(),
          fetchOrders(),
          fetchHistoryOrders(),
          fetchInventoryOperations(),
          fetchInventoryBalances(),
          fetchInventoryReports(),
          fetchInventoryProducts(),
        ]);

      setTechCards(cards || []);
      setOrders([...(activeOrders || []), ...(archiveOrders || [])]);
      setOperations(ops || []);
      setBalances(bals || []);
      setReports(reps || []);
      setProducts(prods || []);
    } catch (error: any) {
      alert(error?.message || "Не удалось загрузить склад");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const findTechCardForFood = (food: any) => {
    const ids = [
      food?.id,
      food?.menu_item_id,
      food?.product_id,
      food?.food_id,
    ].filter(Boolean);

    return techCards.find((card) =>
      ids.some((id) => String(id) === String(card.menu_item_id))
    );
  };

  const productOptions = useMemo(() => {
    return products
      .filter((product) => product.is_active !== false)
      .map((product) => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        category: product.category,
        price: product.price,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }, [products]);

  const buildRows = (period: Period): InventoryRow[] => {
    const map = new Map<string, InventoryRow>();

    const activeProducts = products.filter(
      (product) => product.is_active !== false
    );

    const allowedKeys = new Set(
      activeProducts.map((product) => normalizeKey(product.name, product.unit))
    );

    const getBalance = (name: string, unit: string) => {
      const key = normalizeKey(name, unit);

      return balances.find(
        (balance) => normalizeKey(balance.name, balance.unit) === key
      );
    };

    const ensureRow = (name: string, unit: string) => {
      const key = normalizeKey(name, unit);

      if (!allowedKeys.has(key)) return null;

      if (!map.has(key)) {
        const balance = getBalance(name, unit);

        map.set(key, {
          name,
          unit,
          baseQty: toNumber(balance?.quantity),
          receivedQty: 0,
          usedQty: 0,
          writeOffQty: 0,
          systemLeft: 0,
        });
      }

      return map.get(key)!;
    };

    activeProducts.forEach((product) => {
      ensureRow(product.name, product.unit);
    });

    orders
      .filter((order) => isOrderReadyForInventory(order))
      .filter((order) => isOrderInPeriod(order, period))
      .forEach((order) => {
        const orderTime = getOrderTime(order);

        (order.items || []).forEach((food: IMenuItem) => {
          const techCard = findTechCardForFood(food);
          if (!techCard) return;

          const foodQty = getFoodQty(food, order);

          (techCard.ingredients || []).forEach((ing: any) => {
            const name = getIngredientName(ing);
            const unit = getIngredientUnit(ing);

            const row = ensureRow(name, unit);
            if (!row) return;

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

            row.usedQty += getIngredientQty(ing) * foodQty;
          });
        });
      });

    operations
      .filter((operation) => isOperationInPeriod(operation, period))
      .forEach((operation) => {
        const row = ensureRow(operation.name, operation.unit);
        if (!row) return;

        if (operation.type === "received") {
          row.receivedQty += toNumber(operation.quantity);
        } else {
          row.writeOffQty += toNumber(operation.quantity);
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
    products,
  ]);

  const todayRows = useMemo(() => buildRows("today"), [
    techCards,
    balances,
    orders,
    operations,
    products,
  ]);

  const yesterdayRows = useMemo(() => buildRows("yesterday"), [
    techCards,
    balances,
    orders,
    operations,
    products,
  ]);

  const allRows = useMemo(() => buildRows("all"), [
    techCards,
    balances,
    orders,
    operations,
    products,
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
        Товаров в базе: <strong>{products.length}</strong> • Товаров в складе:{" "}
        <strong>{stateRows.length}</strong> • Готовых заказов:{" "}
        <strong>{readyOrdersCount}</strong> • Всего заказов:{" "}
        <strong>{orders.length}</strong> • Операций:{" "}
        <strong>{operations.length}</strong> • Архивов:{" "}
        <strong>{reports.length}</strong>
      </div>

      {view === "products" && (
        <InventoryProductsPanel
          products={products}
          saving={saving}
          setSaving={setSaving}
          onSaved={load}
        />
      )}

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