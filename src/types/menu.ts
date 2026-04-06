export interface ICategoryRow {
  id: string;
  name: string;
  image?: string | null;
  sort_order?: number | null;
  created_at?: string;
}

export interface IMenuItemRow {
  id: string;
  category: string;
  title: string;
  img?: string | null;
  measure?: string | null;
  price: number;
  description?: string | null;
  is_active?: boolean | null;
  created_at?: string;
}