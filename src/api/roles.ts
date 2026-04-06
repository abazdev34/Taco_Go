import { supabase } from "../lib/supabase";
import { IRoleRow } from "../types/menu";

export const fetchRoles = async (): Promise<IRoleRow[]> => {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as IRoleRow[];
};

export const createRole = async (payload: {
  name: string;
  permissions?: string;
}): Promise<IRoleRow> => {
  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: payload.name,
      permissions: payload.permissions || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as IRoleRow;
};

export const updateRole = async (
  id: string,
  payload: { name: string; permissions?: string }
): Promise<IRoleRow> => {
  const { data, error } = await supabase
    .from("roles")
    .update({
      name: payload.name,
      permissions: payload.permissions || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as IRoleRow;
};

export const deleteRole = async (id: string): Promise<void> => {
  const { error } = await supabase.from("roles").delete().eq("id", id);
  if (error) throw error;
};