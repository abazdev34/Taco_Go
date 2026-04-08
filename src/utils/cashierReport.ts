import { IOrderRow } from '../types/order'

export type TCashierDaySummary = {
  totalOrders: number
  totalRevenue: number
  totalCash: number
  totalOnline: number
  totalChange: number
  byCashier: {
    cashierName: string
    ordersCount: number
    totalAmount: number
  }[]
}

export function getCashierDaySummary(
  orders: IOrderRow[],
  targetDate?: string
): TCashierDaySummary {
  const today =
    targetDate ||
    new Date().toISOString().slice(0, 10)

  const issuedOrders = (Array.isArray(orders) ? orders : []).filter((order) => {
    if (order.cashier_status !== 'issued') return false
    const sourceDate = order.paid_at || order.created_at
    if (!sourceDate) return false
    return new Date(sourceDate).toISOString().slice(0, 10) === today
  })

  const cashierMap = new Map<
    string,
    { cashierName: string; ordersCount: number; totalAmount: number }
  >()

  issuedOrders.forEach((order) => {
    const cashierName = order.cashier_name?.trim() || 'Неизвестно'
    const totalAmount = Number(order.total || 0)

    const prev = cashierMap.get(cashierName)

    if (prev) {
      cashierMap.set(cashierName, {
        cashierName,
        ordersCount: prev.ordersCount + 1,
        totalAmount: prev.totalAmount + totalAmount,
      })
    } else {
      cashierMap.set(cashierName, {
        cashierName,
        ordersCount: 1,
        totalAmount,
      })
    }
  })

  return {
    totalOrders: issuedOrders.length,
    totalRevenue: issuedOrders.reduce(
      (acc, order) => acc + Number(order.total || 0),
      0
    ),
    totalCash: issuedOrders
      .filter((order) => order.payment_method === 'cash')
      .reduce((acc, order) => acc + Number(order.total || 0), 0),
    totalOnline: issuedOrders
      .filter((order) => order.payment_method === 'online')
      .reduce((acc, order) => acc + Number(order.total || 0), 0),
    totalChange: issuedOrders.reduce(
      (acc, order) => acc + Number(order.change_amount || 0),
      0
    ),
    byCashier: Array.from(cashierMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    ),
  }
}