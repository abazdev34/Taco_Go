import { supabase } from '../lib/supabase'
import {
  ICreateOrderPayload,
  IOrderRow,
  TAssemblyStatus,
  TKitchenStatus,
  TOrderStatus,
} from '../types/order'

export async function fetchOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as IOrderRow[]
}

export async function fetchActiveOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['new', 'preparing', 'ready'])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as IOrderRow[]
}

export async function fetchHistoryOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data || []) as IOrderRow[]
}

export async function createOrder(
  payload: ICreateOrderPayload
): Promise<IOrderRow> {
  const items = Array.isArray(payload.items) ? payload.items : []

  const hasKitchen = items.some(
    (item) => item?.categories?.type !== 'assembly'
  )

  const hasAssembly = items.some(
    (item) => item?.categories?.type === 'assembly'
  )

  const insertPayload = {
    items,
    total: Number(payload.total ?? 0),
    comment: payload.comment?.trim() || null,
    source: payload.source ?? 'client',
    status: hasKitchen ? 'new' : hasAssembly ? 'preparing' : 'new',
    kitchen_status: hasKitchen ? 'new' : 'skipped',
    assembly_status: hasAssembly
      ? hasKitchen
        ? 'waiting'
        : 'new'
      : 'skipped',
    customer_name: payload.customer_name?.trim() || null,
    table_number: payload.table_number ?? null,
    order_place: payload.order_place ?? payload.order_type ?? 'hall',
    assembly_progress: Array.isArray(payload.assembly_progress)
      ? payload.assembly_progress
      : [],
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([insertPayload])
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as IOrderRow
}

export async function updateOrderStatus(
  id: string,
  status: TOrderStatus
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as IOrderRow
}

export async function updateOrderComment(
  id: string,
  comment: string
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update({ comment: comment.trim() || null })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as IOrderRow
}

export async function updateOrderWorkflow(
  id: string,
  payload: Partial<{
    status: TOrderStatus
    kitchen_status: TKitchenStatus
    assembly_status: TAssemblyStatus
    assembly_progress: string[]
  }>
): Promise<IOrderRow> {
  const safePayload = {
    ...payload,
    assembly_progress: Array.isArray(payload.assembly_progress)
      ? payload.assembly_progress
      : payload.assembly_progress === undefined
      ? undefined
      : [],
  }

  const { data, error } = await supabase
    .from('orders')
    .update(safePayload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as IOrderRow
}

export async function updateCashierOrder(
  id: string,
  payload: Partial<{
    cashier_status: 'new' | 'preparing' | 'ready' | 'issued'
    payment_method: 'cash' | 'online'
    paid_amount: number
    change_amount: number
    cashier_name: string
    paid_at: string
    status: TOrderStatus
  }>
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as IOrderRow
}