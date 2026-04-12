import { supabase } from "../lib/supabase";
import {
  ICreateTechCardPayload,
  ITechCardIngredientRow,
  ITechCardRow,
} from "../types/menu";

export async function fetchTechCards(): Promise<ITechCardRow[]> {
  const { data: techCards, error: techCardsError } = await supabase
    .from("tech_cards")
    .select("*")
    .order("created_at", { ascending: false });

  if (techCardsError) throw new Error(techCardsError.message);

  const { data: ingredients, error: ingredientsError } = await supabase
    .from("tech_card_ingredients")
    .select("*")
    .order("created_at", { ascending: true });

  if (ingredientsError) throw new Error(ingredientsError.message);

  const ingredientsMap = new Map<string, ITechCardIngredientRow[]>();

  for (const ingredient of (ingredients as ITechCardIngredientRow[]) ?? []) {
    const current = ingredientsMap.get(ingredient.tech_card_id) ?? [];
    current.push({
      ...ingredient,
      quantity: Number(ingredient.quantity),
      unit_price: Number(ingredient.unit_price),
      percent: Number(ingredient.percent),
      cost: Number(ingredient.cost),
      selling_price: Number(ingredient.selling_price),
      profit: Number(ingredient.profit),
    });
    ingredientsMap.set(ingredient.tech_card_id, current);
  }

  return ((techCards as ITechCardRow[]) ?? []).map((card) => ({
    ...card,
    total_cost: Number(card.total_cost),
    total_percent: Number(card.total_percent),
    total_selling_price: Number(card.total_selling_price),
    total_profit: Number(card.total_profit),
    ingredients: ingredientsMap.get(card.id) ?? [],
  }));
}

export async function createTechCard(
  payload: ICreateTechCardPayload
): Promise<ITechCardRow> {
  const { ingredients, ...techCardPayload } = payload;

  const { data, error } = await supabase
    .from("tech_cards")
    .insert({
      menu_item_id: techCardPayload.menu_item_id,
      total_cost: techCardPayload.total_cost,
      total_percent: techCardPayload.total_percent,
      total_selling_price: techCardPayload.total_selling_price,
      total_profit: techCardPayload.total_profit,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const createdCard = data as ITechCardRow;

  if (ingredients.length > 0) {
    const ingredientRows = ingredients.map((item) => ({
      tech_card_id: createdCard.id,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      percent: item.percent,
      cost: item.cost,
      selling_price: item.selling_price,
      profit: item.profit,
    }));

    const { error: ingredientsError } = await supabase
      .from("tech_card_ingredients")
      .insert(ingredientRows);

    if (ingredientsError) throw new Error(ingredientsError.message);
  }

  return createdCard;
}

export async function updateTechCard(
  id: string,
  payload: ICreateTechCardPayload
): Promise<ITechCardRow> {
  const { ingredients, ...techCardPayload } = payload;

  const { data, error } = await supabase
    .from("tech_cards")
    .update({
      menu_item_id: techCardPayload.menu_item_id,
      total_cost: techCardPayload.total_cost,
      total_percent: techCardPayload.total_percent,
      total_selling_price: techCardPayload.total_selling_price,
      total_profit: techCardPayload.total_profit,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: deleteError } = await supabase
    .from("tech_card_ingredients")
    .delete()
    .eq("tech_card_id", id);

  if (deleteError) throw new Error(deleteError.message);

  if (ingredients.length > 0) {
    const ingredientRows = ingredients.map((item) => ({
      tech_card_id: id,
      name: item.name,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      percent: item.percent,
      cost: item.cost,
      selling_price: item.selling_price,
      profit: item.profit,
    }));

    const { error: insertError } = await supabase
      .from("tech_card_ingredients")
      .insert(ingredientRows);

    if (insertError) throw new Error(insertError.message);
  }

  return data as ITechCardRow;
}

export async function deleteTechCard(id: string): Promise<void> {
  const { error } = await supabase.from("tech_cards").delete().eq("id", id);

  if (error) throw new Error(error.message);
}