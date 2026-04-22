import { supabase } from "../lib/supabase";
import {
  ICreateOrderPayload,
  IOrderRow,
  IUpdateOrderPayload,
  TOrderStatus,
} from "../types/order";

const ORDER_SELECT_FIELDS = `
  id,
  created_at,
  updated_at,
  order_number,
  daily_order_number,
  items,
  total,
  comment,
  source,
  status,
  kitchen_status,
  assembly_status,
  assembly_progress,
  customer_name,
  table_number,
  order_place,
  payment_method,
  paid_amount,
  change_amount,
  cashier_status,
  cashier_name,
  paid_at
`;

/* ================= FETCH ================= */

export async function fetchOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as IOrderRow[];
}

export async function fetchActiveOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_FIELDS)
    .in("status", ["new", "preparing", "ready", "pending"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as IOrderRow[];
}

export async function fetchHistoryOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT_FIELDS)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as IOrderRow[];
}

/* ================= HELPERS ================= */

async function getNextDailyOrderNumber(): Promise<number> {
  const now = new Date();

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select("daily_order_number")
    .gte("created_at", startOfDay.toISOString())
    .lte("created_at", endOfDay.toISOString())
    .order("daily_order_number", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  return Number(data?.[0]?.daily_order_number || 0) + 1;
}

/* ================= CREATE ================= */

export async function createOrder(
  payload: ICreateOrderPayload
): Promise<IOrderRow> {
  const items = Array.isArray(payload.items) ? payload.items : [];

  const hasKitchen = items.some(
    (item: any) => item?.categories?.type !== "assembly"
  );

  const hasAssembly = items.some(
    (item: any) => item?.categories?.type === "assembly"
  );

  const resolvedStatus: TOrderStatus =
    (payload.status as TOrderStatus) ||
    (hasKitchen ? "new" : hasAssembly ? "preparing" : "new");

  const resolvedKitchenStatus =
    payload.kitchen_status ?? (hasKitchen ? "new" : "skipped");

  const resolvedAssemblyStatus =
    payload.assembly_status ??
    (hasAssembly ? (hasKitchen ? "waiting" : "new") : "skipped");

  const nextDailyOrderNumber = await getNextDailyOrderNumber();

  const insertPayload: Record<string, any> = {
    ...payload,
    items,
    total: Number(payload.total ?? 0),
    comment: payload.comment?.trim() || null,
    source: payload.source ?? "client",
    status: resolvedStatus,
    kitchen_status: resolvedKitchenStatus,
    assembly_status: resolvedAssemblyStatus,
    customer_name: payload.customer_name?.trim() || null,
    table_number: payload.table_number ?? null,
    order_place: payload.order_place ?? payload.order_type ?? "hall",
    assembly_progress: payload.assembly_progress ?? [],
    payment_method: payload.payment_method ?? null,
    paid_amount: payload.paid_amount ?? null,
    change_amount: payload.change_amount ?? null,
    cashier_status: payload.cashier_status ?? null,
    cashier_name: payload.cashier_name?.trim() || null,
    paid_at: payload.paid_at ?? null,
    daily_order_number: nextDailyOrderNumber,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert([insertPayload])
    .select(ORDER_SELECT_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return data as IOrderRow;
}

/* ================= UPDATE ================= */

export async function updateOrderStatus(
  id: string,
  status: TOrderStatus
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ORDER_SELECT_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return data as IOrderRow;
}

export async function updateOrderWorkflow(
  id: string,
  payload: Partial<
    Pick<
      IUpdateOrderPayload,
      "status" | "kitchen_status" | "assembly_status" | "assembly_progress"
    >
  >
): Promise<void> {
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const { error } = await supabase
    .from("orders")
    .update(cleanedPayload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updateCashierOrder(
  id: string,
  payload: Partial<
    Pick<
      IUpdateOrderPayload,
      | "cashier_status"
      | "payment_method"
      | "paid_amount"
      | "change_amount"
      | "cashier_name"
      | "paid_at"
      | "status"
      | "kitchen_status"
      | "assembly_status"
      | "assembly_progress"
    >
  >
): Promise<void> {
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  const { error } = await supabase
    .from("orders")
    .update(cleanedPayload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updateOrderComment(
  id: string,
  comment: string
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .update({
      comment: comment?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ORDER_SELECT_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return data as IOrderRow;
}

/* ================= DELETE ================= */

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from("orders").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteOrdersByIds(ids: string[]): Promise<void> {
  const safeIds = ids?.filter(Boolean) ?? [];
  if (!safeIds.length) return;

  const { error } = await supabase.from("orders").delete().in("id", safeIds);

  if (error) throw new Error(error.message);
}