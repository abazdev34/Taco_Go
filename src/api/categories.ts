import { supabase } from "../lib/supabase";
import { ICategoryRow } from "../types/menu";

export const fetchCategories = async (): Promise<ICategoryRow[]> => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ICategoryRow[];
};

export const createCategory = async (payload: {
  name: string;
  image?: string;
  sort_order?: number;
}): Promise<ICategoryRow> => {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: payload.name,
      image: payload.image || null,
      sort_order: payload.sort_order ?? 0,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ICategoryRow;
};

export const updateCategory = async (
  id: string,
  payload: {
    name: string;
    image?: string;
    sort_order?: number;
  }
): Promise<ICategoryRow> => {
  const { data, error } = await supabase
    .from("categories")
    .update({
      name: payload.name,
      image: payload.image || null,
      sort_order: payload.sort_order ?? 0,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ICategoryRow;
};

export const deleteCategory = async (id: string): Promise<void> => {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
};