import { supabase } from "../lib/supabase";
import { ICategoryPayload, ICategoryRow } from "../types/menu";

export async function fetchCategories(): Promise<ICategoryRow[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as ICategoryRow[]) ?? [];
}

export async function createCategory(
  payload: ICategoryPayload
): Promise<ICategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: payload.name,
      sort_order: payload.sort_order,
      type: payload.type,
      image: payload.image ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ICategoryRow;
}

export async function updateCategory(
  id: string,
  payload: Partial<ICategoryPayload>
): Promise<ICategoryRow> {
  const { data, error } = await supabase
    .from("categories")
    .update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.sort_order !== undefined
        ? { sort_order: payload.sort_order }
        : {}),
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.image !== undefined ? { image: payload.image } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as ICategoryRow;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}