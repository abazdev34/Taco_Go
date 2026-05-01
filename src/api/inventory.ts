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

export const fetchInventoryProducts = async () => {
  const { data, error } = await supabase
    .from("inventory_products")
    .select("*")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return ((data || []).filter((item) => item.is_active !== false) ||
    []) as TInventoryProduct[];
};

export const createInventoryProduct = async (payload: {
  name: string;
  category?: string | null;
  unit: string;
  price?: number;
}) => {
  const { data, error } = await supabase
    .from("inventory_products")
    .insert({
      name: payload.name.trim(),
      category: payload.category || null,
      unit: payload.unit,
      price: payload.price || 0,
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
  const { data, error } = await supabase
    .from("inventory_products")
    .update(payload)
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
  const { data, error } = await supabase
    .from("inventory_operations")
    .insert(payload)
    .select();

  if (error) throw error;

  const receivedItems = payload.filter(
    (item) =>
      item.type === "received" &&
      item.product_id &&
      Number(item.price || 0) > 0
  );

  await Promise.all(
    receivedItems.map((item) =>
      supabase
        .from("inventory_products")
        .update({ price: item.price || 0 })
        .eq("id", item.product_id)
    )
  );

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
  const { data, error } = await supabase
    .from("inventory_balances")
    .upsert(payload, { onConflict: "name,unit" })
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
    .eq("name", name)
    .eq("unit", unit);

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
    .insert(payload)
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