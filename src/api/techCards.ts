import { supabase } from "../lib/supabase";
import {
  ICreateTechCardPayload,
  ITechCardRow,
  IUpdateTechCardPayload,
} from "../types/techCard";

const TECH_CARD_SELECT = `
  id,
  menu_item_id,
  total_cost,
  total_percent,
  total_selling_price,
  total_profit,
  total_weight,
  total_liters,
  total_pieces,
  created_at,
  ingredients:tech_card_ingredients (
    id,
    tech_card_id,
    product_id,
    name,
    unit,
    quantity,
    unit_price,
    piece_weight,
    percent,
    cost,
    selling_price,
    profit,
    created_at
  )
`;

const toNumber = (value: unknown) => {
  const normalized = String(value ?? "").replace(",", ".").trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
};

const cleanText = (value: unknown) => String(value ?? "").trim();

const normalizeIngredients = (
  techCardId: string,
  ingredients: ICreateTechCardPayload["ingredients"]
) => {
  return ingredients
    .map((item) => ({
      tech_card_id: techCardId,
      product_id: item.product_id || null,
      name: cleanText(item.name),
      unit: cleanText(item.unit) || "кг",
      quantity: toNumber(item.quantity),
      unit_price: toNumber(item.unit_price),
      piece_weight: toNumber(item.piece_weight),
      percent: toNumber(item.percent),
      cost: toNumber(item.cost),
      selling_price: toNumber(item.selling_price),
      profit: toNumber(item.profit),
    }))
    .filter((item) => item.name && item.quantity > 0);
};

export async function fetchTechCards(): Promise<ITechCardRow[]> {
  const { data, error } = await supabase
    .from("tech_cards")
    .select(TECH_CARD_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []) as ITechCardRow[];
}

export async function createTechCard(payload: ICreateTechCardPayload) {
  const { data: oldCard, error: oldCardError } = await supabase
    .from("tech_cards")
    .select("id")
    .eq("menu_item_id", payload.menu_item_id)
    .maybeSingle();

  if (oldCardError) throw new Error(oldCardError.message);

  if (oldCard?.id) {
    return updateTechCard(oldCard.id, payload);
  }

  const { data: card, error } = await supabase
    .from("tech_cards")
    .insert({
      menu_item_id: payload.menu_item_id,
      total_cost: toNumber(payload.total_cost),
      total_percent: toNumber(payload.total_percent),
      total_selling_price: toNumber(payload.total_selling_price),
      total_profit: toNumber(payload.total_profit),
      total_weight: toNumber(payload.total_weight),
      total_liters: toNumber(payload.total_liters),
      total_pieces: toNumber(payload.total_pieces),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const ingredients = normalizeIngredients(card.id, payload.ingredients);

  if (ingredients.length > 0) {
    const { error: ingredientError } = await supabase
      .from("tech_card_ingredients")
      .insert(ingredients);

    if (ingredientError) throw new Error(ingredientError.message);
  }

  return true;
}

export async function updateTechCard(
  id: string,
  payload: IUpdateTechCardPayload
) {
  const { error } = await supabase
    .from("tech_cards")
    .update({
      menu_item_id: payload.menu_item_id,
      total_cost: toNumber(payload.total_cost),
      total_percent: toNumber(payload.total_percent),
      total_selling_price: toNumber(payload.total_selling_price),
      total_profit: toNumber(payload.total_profit),
      total_weight: toNumber(payload.total_weight),
      total_liters: toNumber(payload.total_liters),
      total_pieces: toNumber(payload.total_pieces),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase
    .from("tech_card_ingredients")
    .delete()
    .eq("tech_card_id", id);

  if (deleteError) throw new Error(deleteError.message);

  const ingredients = normalizeIngredients(id, payload.ingredients);

  if (ingredients.length > 0) {
    const { error: insertError } = await supabase
      .from("tech_card_ingredients")
      .insert(ingredients);

    if (insertError) throw new Error(insertError.message);
  }

  return true;
}

export async function deleteTechCard(id: string) {
  const { error: ingredientsError } = await supabase
    .from("tech_card_ingredients")
    .delete()
    .eq("tech_card_id", id);

  if (ingredientsError) throw new Error(ingredientsError.message);

  const { error } = await supabase.from("tech_cards").delete().eq("id", id);

  if (error) throw new Error(error.message);

  return true;
}