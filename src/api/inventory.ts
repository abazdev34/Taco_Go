import { supabase } from "../lib/supabase";

export type TInventoryOperationType = "received" | "writeOff";

export type TInventoryProduct = {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  price: number;
  is_active: boolean;
  created_at: string;
};

export type TInventoryBatch = {
  id: string;
  product_id: string;
  name: string;
  unit: string;
  quantity_received: number;
  quantity_remaining: number;
  price: number;
  created_at: string;
};

export type TInventoryOperation = {
  id: string;
  product_id?: string | null;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  type: TInventoryOperationType;
  created_at: string;
};

export type TInventoryBalance = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  confirmed_at: string;
};

export type TInventoryReport = {
  id: string;
  title: string;
  html: string;
  email_text: string;
  created_at: string;
};

const toNumber = (value: unknown) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const cleanText = (value: unknown) => String(value ?? "").trim();

export const fetchInventoryProducts = async () => {
  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .eq("is_active", true)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []) as TInventoryProduct[];
};

export const fetchInventoryBatches = async () => {
  const { data, error } = await supabase
    .from("inventory_batches")
    .select("*")
    .gt("quantity_remaining", 0)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as TInventoryBatch[];
};

export const getProductLatestPrice = async (productId: string) => {
  const { data: product, error: productError } = await supabase
    .from("inventory_products")
    .select("price")
    .eq("id", productId)
    .maybeSingle();

  if (productError) throw productError;

  if (toNumber(product?.price) > 0) {
    return toNumber(product?.price);
  }

  const { data: batch, error: batchError } = await supabase
    .from("inventory_batches")
    .select("price")
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (batchError) throw batchError;

  return toNumber(batch?.price);
};

export const getProductFifoPrice = getProductLatestPrice;

export const createInventoryProduct = async (payload: {
  name: string;
  category?: string | null;
  unit: string;
  price?: number;
}) => {
  const name = cleanText(payload.name);
  const unit = cleanText(payload.unit);
  const category = cleanText(payload.category) || null;

  if (!name) throw new Error("Введите название товара");
  if (!unit) throw new Error("Выберите единицу измерения");

  const { data, error } = await supabase
    .from("inventory_products")
    .insert({
      name,
      category,
      unit,
      price: toNumber(payload.price),
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;

  return data as TInventoryProduct;
};

export const updateInventoryProduct = async (
  id: string,
  payload: {
    name?: string;
    category?: string | null;
    unit?: string;
    price?: number;
    is_active?: boolean;
  }
) => {
  const updatePayload: Record<string, any> = {};

  if (payload.name !== undefined) updatePayload.name = cleanText(payload.name);

  if (payload.category !== undefined) {
    updatePayload.category = cleanText(payload.category) || null;
  }

  if (payload.unit !== undefined) updatePayload.unit = cleanText(payload.unit);

  if (payload.price !== undefined) {
    updatePayload.price = toNumber(payload.price);
  }

  if (payload.is_active !== undefined) {
    updatePayload.is_active = payload.is_active;
  }

  const { data, error } = await supabase
    .from("inventory_products")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data as TInventoryProduct;
};

export const deleteInventoryProduct = async (id: string) => {
  const { error } = await supabase
    .from("inventory_products")
    .update({ is_active: false })
    .eq("id", id);

  if (error) throw error;
};

export const fetchInventoryOperations = async () => {
  const { data, error } = await supabase
    .from("inventory_operations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as TInventoryOperation[];
};

export const createInventoryOperations = async (
  payload: {
    product_id?: string | null;
    name: string;
    unit: string;
    quantity: number;
    price?: number;
    type: TInventoryOperationType;
  }[]
) => {
  const normalizedPayload = payload
    .map((item) => ({
      product_id: item.product_id || null,
      name: cleanText(item.name),
      unit: cleanText(item.unit),
      quantity: toNumber(item.quantity),
      price: item.type === "received" ? toNumber(item.price) : 0,
      type: item.type,
    }))
    .filter((item) => item.name && item.unit && item.quantity > 0);

  if (!normalizedPayload.length) {
    throw new Error("Добавьте товар и укажите количество");
  }

  const invalidReceived = normalizedPayload.some(
    (item) => item.type === "received" && item.price <= 0
  );

  if (invalidReceived) {
    throw new Error("Укажите цену для прихода");
  }

  const { data, error } = await supabase
    .from("inventory_operations")
    .insert(normalizedPayload)
    .select();

  if (error) throw error;

  const receivedItems = normalizedPayload.filter(
    (item) => item.type === "received" && item.product_id && item.price > 0
  );

  for (const item of receivedItems) {
    const { error: productError } = await supabase
      .from("inventory_products")
      .update({ price: item.price })
      .eq("id", item.product_id);

    if (productError) throw productError;

    const { error: batchError } = await supabase
      .from("inventory_batches")
      .insert({
        product_id: item.product_id,
        name: item.name,
        unit: item.unit,
        quantity_received: item.quantity,
        quantity_remaining: item.quantity,
        price: item.price,
      });

    if (batchError) throw batchError;
  }

  return data as TInventoryOperation[];
};

export const deleteInventoryOperationsByIds = async (ids: string[]) => {
  if (!ids.length) return;

  const { error } = await supabase
    .from("inventory_operations")
    .delete()
    .in("id", ids);

  if (error) throw error;
};

export const fetchInventoryBalances = async () => {
  const { data, error } = await supabase
    .from("inventory_balances")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data || []) as TInventoryBalance[];
};

export const upsertInventoryBalances = async (
  payload: {
    name: string;
    unit: string;
    quantity: number;
    confirmed_at: string;
  }[]
) => {
  const normalizedPayload = payload
    .map((item) => ({
      name: cleanText(item.name),
      unit: cleanText(item.unit),
      quantity: toNumber(item.quantity),
      confirmed_at: item.confirmed_at,
    }))
    .filter((item) => item.name && item.unit);

  if (!normalizedPayload.length) return [];

  const { data, error } = await supabase
    .from("inventory_balances")
    .upsert(normalizedPayload, { onConflict: "name,unit" })
    .select();

  if (error) throw error;

  return data as TInventoryBalance[];
};

export const deleteInventoryBalance = async (id: string) => {
  const { error } = await supabase
    .from("inventory_balances")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

export const deleteInventoryBalanceByNameUnit = async (
  name: string,
  unit: string
) => {
  const { error } = await supabase
    .from("inventory_balances")
    .delete()
    .eq("name", cleanText(name))
    .eq("unit", cleanText(unit));

  if (error) throw error;
};

export const fetchInventoryReports = async () => {
  const { data, error } = await supabase
    .from("inventory_reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []) as TInventoryReport[];
};

export const createInventoryReport = async (payload: {
  title: string;
  html: string;
  email_text: string;
}) => {
  const { data, error } = await supabase
    .from("inventory_reports")
    .insert({
      title: cleanText(payload.title),
      html: payload.html,
      email_text: payload.email_text,
    })
    .select()
    .single();

  if (error) throw error;

  return data as TInventoryReport;
};

export const deleteInventoryReport = async (id: string) => {
  const { error } = await supabase
    .from("inventory_reports")
    .delete()
    .eq("id", id);

  if (error) throw error;
};