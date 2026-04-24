import { supabase } from '../lib/supabase'
import {
  ICreateTechCardPayload,
  ITechCardRow,
  IUpdateTechCardPayload,
} from '../types/techCard'

const TECH_CARD_SELECT = `
  id,
  menu_item_id,
  total_cost,
  total_percent,
  total_selling_price,
  total_profit,
  created_at,
  ingredients:tech_card_ingredients (
    id,
    tech_card_id,
    name,
    unit,
    quantity,
    unit_price,
    percent,
    cost,
    selling_price,
    profit,
    created_at
  )
`

export async function fetchTechCards(): Promise<ITechCardRow[]> {
  const { data, error } = await supabase
    .from('tech_cards')
    .select(TECH_CARD_SELECT)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as ITechCardRow[]
}

export async function createTechCard(payload: ICreateTechCardPayload) {
  const { data: card, error } = await supabase
    .from('tech_cards')
    .insert([
      {
        menu_item_id: payload.menu_item_id,
        total_cost: payload.total_cost,
        total_percent: payload.total_percent,
        total_selling_price: payload.total_selling_price,
        total_profit: payload.total_profit,
      },
    ])
    .select('id')
    .single()

  if (error) {
    console.error('CREATE TECH CARD ERROR:', error)
    throw new Error(error.message)
  }

  const ingredients = payload.ingredients.map(item => ({
    tech_card_id: card.id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    percent: item.percent,
    cost: item.cost,
    selling_price: item.selling_price,
    profit: item.profit,
  }))

  const { error: ingredientError } = await supabase
    .from('tech_card_ingredients')
    .insert(ingredients)

  if (ingredientError) {
    console.error('CREATE INGREDIENTS ERROR:', ingredientError)
    throw new Error(ingredientError.message)
  }

  return true
}

export async function updateTechCard(
  id: string,
  payload: IUpdateTechCardPayload
) {
  const { error } = await supabase
    .from('tech_cards')
    .update({
      menu_item_id: payload.menu_item_id,
      total_cost: payload.total_cost,
      total_percent: payload.total_percent,
      total_selling_price: payload.total_selling_price,
      total_profit: payload.total_profit,
    })
    .eq('id', id)

  if (error) {
    console.error('UPDATE TECH CARD ERROR:', error)
    throw new Error(error.message)
  }

  const { error: deleteError } = await supabase
    .from('tech_card_ingredients')
    .delete()
    .eq('tech_card_id', id)

  if (deleteError) {
    console.error('DELETE OLD INGREDIENTS ERROR:', deleteError)
    throw new Error(deleteError.message)
  }

  const ingredients = payload.ingredients.map(item => ({
    tech_card_id: id,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unit_price: item.unit_price,
    percent: item.percent,
    cost: item.cost,
    selling_price: item.selling_price,
    profit: item.profit,
  }))

  const { error: insertError } = await supabase
    .from('tech_card_ingredients')
    .insert(ingredients)

  if (insertError) {
    console.error('INSERT NEW INGREDIENTS ERROR:', insertError)
    throw new Error(insertError.message)
  }

  return true
}

export async function deleteTechCard(id: string) {
  const { error } = await supabase.from('tech_cards').delete().eq('id', id)

  if (error) throw new Error(error.message)
  return true
}