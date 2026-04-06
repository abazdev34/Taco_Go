import { supabase } from "../lib/supabase";
import { ITechCardRow } from "../types/menu";

export const fetchTechCards = async (): Promise<ITechCardRow[]> => {
  const { data, error } = await supabase
    .from("tech_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as ITechCardRow[];
};

export const createTechCard = async (payload: {
  menu_item_id: string;
  ingredients?: string;
  cooking_steps?: string;
  notes?: string;
}): Promise<ITechCardRow> => {
  const { data, error } = await supabase
    .from("tech_cards")
    .insert({
      menu_item_id: payload.menu_item_id,
      ingredients: payload.ingredients || null,
      cooking_steps: payload.cooking_steps || null,
      notes: payload.notes || null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ITechCardRow;
};

export const updateTechCard = async (
  id: string,
  payload: {
    menu_item_id: string;
    ingredients?: string;
    cooking_steps?: string;
    notes?: string;
  }
): Promise<ITechCardRow> => {
  const { data, error } = await supabase
    .from("tech_cards")
    .update({
      menu_item_id: payload.menu_item_id,
      ingredients: payload.ingredients || null,
      cooking_steps: payload.cooking_steps || null,
      notes: payload.notes || null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ITechCardRow;
};

export const deleteTechCard = async (id: string): Promise<void> => {
  const { error } = await supabase.from("tech_cards").delete().eq("id", id);
  if (error) throw error;
};