import { supabase } from "../lib/supabase";
import { IMenuItemPayload } from "../types/menu";

export async function fetchMenuItems() {
  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("*")
    .order("sort_order", { ascending: true });

  console.log("MENU ITEMS:", { items, itemsError });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, image, sort_order, created_at, type");

  console.log("CATEGORIES:", { categories, categoriesError });

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  const categoriesMap = new Map(
    (categories ?? []).map((category) => [category.id, category])
  );

  return (items ?? []).map((item) => ({
    ...item,
    categories: categoriesMap.get(item.category) ?? null,
  }));
}

export async function createMenuItem(payload: IMenuItemPayload) {
  const { data, error } = await supabase
    .from("menu_items")
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateMenuItem(id: string, payload: IMenuItemPayload) {
  const { data, error } = await supabase
    .from("menu_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteMenuItem(id: string) {
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}