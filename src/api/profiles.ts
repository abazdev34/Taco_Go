import { supabase } from "../lib/supabase";

export type TProfileRole =
  | "admin"
  | "cashier"
  | "kitchen"
  | "hall"
  | "assembly"
  | "history"
  | "client";

export interface IProfileRow {
  id: string;
  email: string | null;
  full_name?: string | null;
  role: TProfileRole | null;
  status: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
}

export async function fetchProfileById(id: string): Promise<IProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, approved_at, approved_by, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as IProfileRow | null;
}

export async function fetchPendingProfiles(): Promise<IProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, status, approved_at, approved_by, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as IProfileRow[];
}

export async function approveProfile(
  id: string,
  role: TProfileRole,
  adminUserId: string
): Promise<IProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      role,
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: adminUserId,
    })
    .eq("id", id)
    .select("id, email, full_name, role, status, approved_at, approved_by, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as IProfileRow;
}

export async function rejectProfile(id: string): Promise<IProfileRow> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      status: "rejected",
    })
    .eq("id", id)
    .select("id, email, full_name, role, status, approved_at, approved_by, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as IProfileRow;
}