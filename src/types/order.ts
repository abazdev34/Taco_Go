export type TOrderPlace = 'hall' | 'takeaway'

export type TPaymentMethod = 'cash' | 'online'

export type TOrderSource = 'client' | 'cashier'

export type TOrderStatus =
  | 'new'
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'

export type TKitchenStatus =
  | 'new'
  | 'preparing'
  | 'ready'
  | 'skipped'

export type TAssemblyStatus =
  | 'waiting'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'skipped'

export type TCashierStatus = string | null

export type TMenuCategory = {
  id?: string
  name?: string
  title?: string
  image?: string | null
  sort_order?: number | null
  created_at?: string | null
  type?: string | null
}

export interface IMenuItem {
  id: string
  title: string
  price: number
  category?: string | null
  categories?: TMenuCategory | null

  quantity?: number
  order_quantity?: number
  qty?: number
  cart_quantity?: number

  description?: string | null
  image?: string | null
  image_url?: string | null
  photo?: string | null
  is_active?: boolean
  sort_order?: number | null
}

export interface ICreateOrderPayload {
  items: IMenuItem[]
  total: number
  comment?: string | null
  source?: TOrderSource
  status?: TOrderStatus
  customer_name?: string | null
  table_number?: number | null
  order_place?: TOrderPlace
  order_type?: TOrderPlace
  payment_method?: TPaymentMethod | null
  kitchen_status?: TKitchenStatus | string | null
  assembly_status?: TAssemblyStatus | string | null
  assembly_progress?: string[]
  paid_amount?: number | null
  change_amount?: number | null
  cashier_status?: TCashierStatus
  cashier_name?: string | null
  paid_at?: string | null
}

export interface IUpdateOrderPayload {
  status?: TOrderStatus
  kitchen_status?: TKitchenStatus | string | null
  assembly_status?: TAssemblyStatus | string | null
  assembly_progress?: string[]
  payment_method?: TPaymentMethod | null
  paid_amount?: number | null
  change_amount?: number | null
  cashier_status?: TCashierStatus
  cashier_name?: string | null
  paid_at?: string | null
  comment?: string | null
}

export interface IOrderRow extends ICreateOrderPayload {
  id: string
  created_at: string
  updated_at: string
  order_number?: number | null
  daily_order_number?: number | null
}