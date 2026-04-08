export type TOrderStatus = 'new' | 'preparing' | 'ready' | 'completed'

export type TKitchenStatus = 'new' | 'preparing' | 'ready' | 'skipped'

export type TAssemblyStatus =
  | 'waiting'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'skipped'

export type TOrderPlace = 'hall' | 'takeaway'
export type TMenuSectionType = 'kitchen' | 'assembly'

/* ✅ КАССА */
export type TPaymentMethod = 'cash' | 'online'
export type TCashierStatus = 'new' | 'preparing' | 'ready' | 'issued'

export interface IOrderItemCategory {
  id?: string
  name?: string
  image?: string | null
  sort_order?: number | null
  type?: TMenuSectionType | null
}

export interface IMenuItem {
  id: string
  title: string
  price: number
  quantity?: number
  image?: string | null
  description?: string | null
  weight_g?: number | null
  sort_order?: number | null
  category?: string | null
  is_active?: boolean
  categories?: IOrderItemCategory | null
}

export interface IOrderRow {
  id: string

  /* 🔢 НОМЕРЛЕР */
  order_number: number
  daily_order_number?: number | null
  serial_number?: number | null

  /* 📊 НЕГИЗГИ СТАТУС */
  status: TOrderStatus
  kitchen_status?: TKitchenStatus | null
  assembly_status?: TAssemblyStatus | null

  /* 💳 КАССА */
  cashier_status?: TCashierStatus | null
  payment_method?: TPaymentMethod | null
  paid_amount?: number | null
  change_amount?: number | null
  cashier_name?: string | null
  paid_at?: string | null

  /* 📦 ЗАКАЗ */
  source?: string | null
  comment?: string | null
  created_at: string
  items: IMenuItem[]
  total?: number | null

  /* 👤 КЛИЕНТ */
  customer_name?: string | null
  table_number?: string | number | null

  /* 📍 ТИП */
  order_place?: TOrderPlace | null
  order_type?: TOrderPlace | null

  /* 🧩 СБОРКА */
  assembly_progress?: string[] | null
}

export interface ICreateOrderPayload {
  items: IMenuItem[]
  total: number

  comment?: string | null
  source?: string

  customer_name?: string | null
  table_number?: string | number | null

  order_place?: TOrderPlace | null
  order_type?: TOrderPlace | null

  assembly_progress?: string[]
}