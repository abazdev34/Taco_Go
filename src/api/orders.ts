import { supabase } from '../lib/supabase'
import {
  ICreateOrderPayload,
  IOrderRow,
  IUpdateOrderPayload,
  TOrderStatus,
} from '../types/order'

const ORDER_SELECT_FIELDS = `
  id,
  created_at,
  updated_at,
  order_number,
  daily_order_number,
  items,
  total,
  comment,
  source,
  status,
  kitchen_status,
  assembly_status,
  assembly_progress,
  customer_name,
  table_number,
  order_place,
  payment_method,
  paid_amount,
  change_amount,
  cashier_status,
  cashier_name,
  paid_at
`

const normalizeOrderItems = (items: any[]) => {
  return items.map((item: any) => {
    const qty = Number(
      item.order_quantity ||
        item.quantity ||
        item.qty ||
        item.cart_quantity ||
        1
    )

    return {
      ...item,
      quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
      order_quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
    }
  })
}

const normalizeOrder = (order: any): IOrderRow => {
  return {
    ...order,
    items: Array.isArray(order?.items) ? normalizeOrderItems(order.items) : [],
    total: Number(order?.total || 0),
    assembly_progress: Array.isArray(order?.assembly_progress)
      ? order.assembly_progress
      : [],
  } as IOrderRow
}

export async function fetchOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT_FIELDS)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(normalizeOrder)
}

export async function fetchActiveOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_SELECT_FIELDS)
    .in('status', ['new', 'preparing', 'ready', 'pending'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []).map(normalizeOrder)
}

export async function fetchHistoryOrders(): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders_archive')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300)

  if (error) throw new Error(error.message)
  return (data || []).map(normalizeOrder)
}

export async function fetchArchivedOrdersByDateRange(
  startDate: string,
  endDate: string,
): Promise<IOrderRow[]> {
  const { data, error } = await supabase
    .from('orders_archive')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()

  return (data || [])
    .filter((order: any) => {
      const date = order.created_at || order.archived_at || order.paid_at
      if (!date) return true

      const time = new Date(date).getTime()
      return time >= start && time <= end
    })
    .map(normalizeOrder)
}

async function getNextDailyOrderNumber(): Promise<number> {
  const now = new Date()

  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('orders')
    .select('daily_order_number')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .order('daily_order_number', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)

  return Number(data?.[0]?.daily_order_number || 0) + 1
}

export async function createOrder(
  payload: ICreateOrderPayload,
): Promise<IOrderRow> {
  const items = Array.isArray(payload.items)
    ? normalizeOrderItems(payload.items)
    : []

  const fixedTotal =
    Number(payload.total || 0) > 0
      ? Number(payload.total || 0)
      : items.reduce(
          (sum: number, item: any) =>
            sum +
            Number(item.price || 0) *
              Number(item.order_quantity || item.quantity || 1),
          0,
        )

  const hasKitchen = items.some(
    (item: any) => item?.categories?.type !== 'assembly',
  )

  const hasAssembly = items.some(
    (item: any) => item?.categories?.type === 'assembly',
  )

  const resolvedStatus: TOrderStatus =
    (payload.status as TOrderStatus) ||
    (hasKitchen ? 'new' : hasAssembly ? 'preparing' : 'new')

  const resolvedKitchenStatus =
    payload.kitchen_status ?? (hasKitchen ? 'new' : 'skipped')

  const resolvedAssemblyStatus =
    payload.assembly_status ??
    (hasAssembly ? (hasKitchen ? 'waiting' : 'new') : 'skipped')

  const nextDailyOrderNumber = await getNextDailyOrderNumber()

  const insertPayload: Record<string, any> = {
    ...payload,
    items,
    total: fixedTotal,
    comment: payload.comment?.trim() || null,
    source: payload.source ?? 'client',
    status: resolvedStatus,
    kitchen_status: resolvedKitchenStatus,
    assembly_status: resolvedAssemblyStatus,
    customer_name: payload.customer_name?.trim() || null,
    table_number: payload.table_number ?? null,
    order_place: payload.order_place ?? payload.order_type ?? 'hall',
    assembly_progress: payload.assembly_progress ?? [],
    payment_method: payload.payment_method ?? null,
    paid_amount: payload.paid_amount ?? null,
    change_amount: payload.change_amount ?? null,
    cashier_status: payload.cashier_status ?? null,
    cashier_name: payload.cashier_name?.trim() || null,
    paid_at: payload.paid_at ?? null,
    daily_order_number: nextDailyOrderNumber,
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([insertPayload])
    .select(ORDER_SELECT_FIELDS)
    .single()

  if (error) throw new Error(error.message)
  return normalizeOrder(data)
}

export async function updateOrderStatus(
  id: string,
  status: TOrderStatus,
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(ORDER_SELECT_FIELDS)
    .single()

  if (error) throw new Error(error.message)
  return normalizeOrder(data)
}

export async function updateOrderWorkflow(
  id: string,
  payload: Partial<
    Pick<
      IUpdateOrderPayload,
      'status' | 'kitchen_status' | 'assembly_status' | 'assembly_progress'
    >
  >,
): Promise<void> {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      ...payload,
      updated_at: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined),
  )

  const { error } = await supabase
    .from('orders')
    .update(cleanedPayload)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function updateCashierOrder(
  id: string,
  payload: Partial<
    Pick<
      IUpdateOrderPayload,
      | 'cashier_status'
      | 'payment_method'
      | 'paid_amount'
      | 'change_amount'
      | 'cashier_name'
      | 'paid_at'
      | 'status'
      | 'kitchen_status'
      | 'assembly_status'
      | 'assembly_progress'
    >
  >,
): Promise<void> {
  const cleanedPayload = Object.fromEntries(
    Object.entries({
      ...payload,
      updated_at: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined),
  )

  const { error } = await supabase
    .from('orders')
    .update(cleanedPayload)
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function updateOrderComment(
  id: string,
  comment: string,
): Promise<IOrderRow> {
  const { data, error } = await supabase
    .from('orders')
    .update({
      comment: comment?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(ORDER_SELECT_FIELDS)
    .single()

  if (error) throw new Error(error.message)
  return normalizeOrder(data)
}

export async function archiveCompletedOrdersByDay(targetDay: string) {
  const { data, error } = await supabase.rpc('archive_completed_orders_by_day', {
    target_day: targetDay,
  })

  if (error) throw new Error(error.message)
  return data
}

export async function deleteArchivedOrdersByIds(ids: string[]): Promise<void> {
  const safeIds = ids?.filter(Boolean) ?? []
  if (!safeIds.length) return

  const { error } = await supabase
    .from('orders_archive')
    .delete()
    .in('id', safeIds)

  if (error) throw new Error(error.message)
}

export async function deleteOrder(id: string): Promise<void> {
  const { error } = await supabase.from('orders').delete().eq('id', id)

  if (error) throw new Error(error.message)
}

export async function deleteOrdersByIds(ids: string[]): Promise<void> {
  const safeIds = ids?.filter(Boolean) ?? []
  if (!safeIds.length) return

  const { error } = await supabase.from('orders').delete().in('id', safeIds)

  if (error) throw new Error(error.message)
}