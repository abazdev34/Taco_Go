import { supabase } from "../lib/supabase";

export type TProfileRole =
  | "admin"
  | "cashier"
  | "kitchen"
  | "hall"
  | "assembly"
  | "history"
  | "user";

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
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

export async function fetchPendingProfiles(): Promise<IProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
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
    .select()
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
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as IProfileRow;
}