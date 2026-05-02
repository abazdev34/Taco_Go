export type TUnitType = "шт" | "кг" | "л";

export interface ITechCardIngredientRow {
  id: string;
  tech_card_id: string;

  product_id: string | null; // 🔥 FIFO үчүн маанилүү

  name: string;
  unit: TUnitType;

  quantity: number;
  unit_price: number;

  piece_weight: number; // 🔥 шт үчүн

  percent: number;

  cost: number;
  selling_price: number;
  profit: number;

  created_at: string;
}

export interface ITechCardRow {
  id: string;
  menu_item_id: string;

  total_cost: number;
  total_percent: number;
  total_selling_price: number;
  total_profit: number;

  total_weight: number; // 🔥
  total_liters: number; // 🔥
  total_pieces: number; // 🔥

  created_at: string;

  ingredients: ITechCardIngredientRow[];
}

export interface ICreateTechCardPayload {
  menu_item_id: string;

  total_cost: number;
  total_percent: number;
  total_selling_price: number;
  total_profit: number;

  total_weight: number; // 🔥
  total_liters: number; // 🔥
  total_pieces: number; // 🔥

  ingredients: {
    product_id: string | null; // 🔥 FIFO

    name: string;
    unit: TUnitType;

    quantity: number;
    unit_price: number;

    piece_weight: number; // 🔥

    percent?: number;
    cost: number;

    selling_price?: number;
    profit?: number;
  }[];
}