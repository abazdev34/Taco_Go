import { IOrderRow } from "../types/order"
import { buildDailyNumberOrders, getDailyOrderNumber } from "./orderNumber"

export const CASHBOX_PIN = '1234'

export const uniqueOrdersById = <T extends { id: string }>(orders: T[]) => {
  const map = new Map<string, T>()
  orders.forEach(order => map.set(order.id, order))
  return Array.from(map.values())
}

export const getItemImage = (item: any) =>
  item.image_url || item.image || item.photo || ''

export const formatDailyOrderNumber = (order: IOrderRow, allOrders: IOrderRow[]) => {
  if (order.daily_order_number) {
    return String(order.daily_order_number).padStart(3, '0')
  }

  return getDailyOrderNumber(order, buildDailyNumberOrders(allOrders))
}

export const resolveCashierCreatedOrderStatus = (items: any[]) => {
  const hasAssemblyItems = items.some(item => item.categories?.type === 'assembly')
  const hasKitchenItems = items.some(item => item.categories?.type !== 'assembly')

  if (hasKitchenItems) {
    return {
      status: 'new',
      cashier_status: null,
      assembly_progress: [],
    }
  }

  if (hasAssemblyItems) {
    return {
      status: 'preparing',
      cashier_status: null,
      assembly_progress: [],
    }
  }

  return {
    status: 'new',
    cashier_status: null,
    assembly_progress: [],
  }
}