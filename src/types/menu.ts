export type TCategoryType = "kitchen" | "assembly";

export interface ICategoryRow {
  id: string;
  name: string;
  image: string | null;
  sort_order: number | null;
  created_at?: string;
  type?: TCategoryType | null;
}

export interface ICategoryPayload {
  name: string;
  image?: string | null;
  sort_order: number;
  type: TCategoryType;
}

export interface IMenuItemRow {
  id: string;
  title: string;
  description: string | null;
  image: string | null;
  price: number;
  weight_g: number;
  sort_order: number | null;
  created_at?: string;
  category: string;
  categories?: ICategoryRow | null;
}

export interface IMenuItemPayload {
  title: string;
  description?: string | null;
  image?: string | null;
  price: number;
  weight_g: number;
  sort_order: number;
  category: string;
}