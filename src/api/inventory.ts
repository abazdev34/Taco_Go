import { supabase } from "../lib/supabase";

export type TInventoryOperationType = "received" | "writeOff";

export type TInventoryOperation = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
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
    name: string;
    unit: string;
    quantity: number;
    type: TInventoryOperationType;
  }[]
) => {
  const { data, error } = await supabase
    .from("inventory_operations")
    .insert(payload)
    .select();

  if (error) throw error;
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