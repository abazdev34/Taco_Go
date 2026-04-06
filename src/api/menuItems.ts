import { supabase } from "../lib/supabase";
import { IMenuItemRow } from "../types/menu";

export const fetchMenuItems = async (): Promise<IMenuItemRow[]> => {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as IMenuItemRow[];
};

export const createMenuItem = async (payload: {
  category: string;
  title: string;
  img?: string;
  measure?: string;
  price: number;
  description?: string;
  is_active?: boolean;
}): Promise<IMenuItemRow> => {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      category: payload.category,
      title: payload.title,
      img: payload.img || null,
      measure: payload.measure || null,
      price: payload.price,
      description: payload.description || null,
      is_active: payload.is_active ?? true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as IMenuItemRow;
};

export const updateMenuItem = async (
  id: string,
  payload: {
    category: string;
    title: string;
    img?: string;
    measure?: string;
    price: number;
    description?: string;
    is_active?: boolean;
  }
): Promise<IMenuItemRow> => {
  const { data, error } = await supabase
    .from("menu_items")
    .update({
      category: payload.category,
      title: payload.title,
      img: payload.img || null,
      measure: payload.measure || null,
      price: payload.price,
      description: payload.description || null,
      is_active: payload.is_active ?? true,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as IMenuItemRow;
};

export const deleteMenuItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) throw error;
};