export type TUnitType = 'шт' | 'кг' | 'л'

export interface ITechCardIngredientRow {
  id: string
  tech_card_id: string

  name: string
  unit: TUnitType

  quantity: number
  unit_price: number
  percent: number

  cost: number
  selling_price: number
  profit: number

  created_at: string
}

export interface ITechCardRow {
  id: string
  menu_item_id: string

  total_cost: number
  total_percent: number
  total_selling_price: number
  total_profit: number

  created_at: string
  ingredients: ITechCardIngredientRow[]
}

export interface ICreateTechCardPayload {
  menu_item_id: string
  total_cost: number
  total_percent: number
  total_selling_price: number
  total_profit: number

  ingredients: {
    name: string
    unit: TUnitType
    quantity: number
    unit_price: number
    percent: number
    cost: number
    selling_price: number
    profit: number
  }[]
}