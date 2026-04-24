import { IMenuItem, IOrderRow } from '../types/order'

export type TTopItemStat = {
  id: string
  title: string
  quantity: number
  revenue: number
}

export type TGroupedOrderDay = {
  dateKey: string
  dateLabel: string
  totalOrders: number
  totalAmount: number
  onlineAmount: number
  cashAmount: number
  orders: IOrderRow[]
}

export const getOrderPaymentType = (order: IOrderRow): 'cash' | 'online' => {
  return order.payment_method === 'online' ? 'online' : 'cash'
}

export const getDailyOrderLabel = (order: IOrderRow) => {
  if (order.daily_order_number !== null && order.daily_order_number !== undefined) {
    return String(order.daily_order_number).padStart(3, '0')
  }

  return '000'
}

export const getCommonOrderLabel = (order: IOrderRow) => {
  if (order.order_number !== null && order.order_number !== undefined) {
    return String(order.order_number).padStart(6, '0')
  }

  if (order.daily_order_number !== null && order.daily_order_number !== undefined) {
    return String(order.daily_order_number).padStart(3, '0')
  }

  return '000000'
}

const startOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date: Date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const startOfWeek = (date: Date) => {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

const endOfWeek = (date: Date) => {
  const d = startOfWeek(date)
  d.setDate(d.getDate() + 6)
  return endOfDay(d)
}

const startOfMonth = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfMonth = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}

export const filterOrdersByRange = (
  orders: IOrderRow[],
  range: 'day' | 'week' | 'month',
  baseDate = new Date()
) => {
  const from =
    range === 'day'
      ? startOfDay(baseDate)
      : range === 'week'
        ? startOfWeek(baseDate)
        : startOfMonth(baseDate)

  const to =
    range === 'day'
      ? endOfDay(baseDate)
      : range === 'week'
        ? endOfWeek(baseDate)
        : endOfMonth(baseDate)

  return orders.filter(order => {
    const createdAt = new Date(order.created_at)
    return createdAt >= from && createdAt <= to
  })
}

export const getOverviewStats = (orders: IOrderRow[]) => {
  const result = {
    newCount: 0,
    preparingCount: 0,
    readyCount: 0,
    completedCount: 0,
    pendingCount: 0,
    totalOrders: orders.length,
    totalAmount: 0,
    onlineAmount: 0,
    onlineOrders: 0,
    cashAmount: 0,
    cashOrders: 0,
    averageCheck: 0,
  }

  for (const order of orders) {
    const total = Number(order.total || 0)

    if (order.status === 'new') result.newCount += 1
    if (order.status === 'preparing') result.preparingCount += 1
    if (order.status === 'ready') result.readyCount += 1
    if (order.status === 'completed') result.completedCount += 1
    if (order.status === 'pending') result.pendingCount += 1

    result.totalAmount += total

    if (getOrderPaymentType(order) === 'online') {
      result.onlineOrders += 1
      result.onlineAmount += total
    } else {
      result.cashOrders += 1
      result.cashAmount += total
    }
  }

  result.averageCheck = result.totalOrders
    ? Math.round(result.totalAmount / result.totalOrders)
    : 0

  return result
}

export const getTopItems = (orders: IOrderRow[], limit = 10): TTopItemStat[] => {
  const map = new Map<string, TTopItemStat>()

  for (const order of orders) {
    const items = (order.items || []) as IMenuItem[]

    for (const item of items) {
      const key = item.id || item.title
      const quantity = Number(item.quantity || 1)
      const revenue = Number(item.price || 0) * quantity

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title: item.title,
          quantity: 0,
          revenue: 0,
        })
      }

      const current = map.get(key)!
      current.quantity += quantity
      current.revenue += revenue
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    .slice(0, limit)
}

export const groupOrdersByDay = (orders: IOrderRow[]): TGroupedOrderDay[] => {
  const map = new Map<string, TGroupedOrderDay>()

  for (const order of orders) {
    const date = new Date(order.created_at)
    const dateKey = date.toISOString().slice(0, 10)
    const dateLabel = date.toLocaleDateString('ru-RU')
    const total = Number(order.total || 0)
    const payment = getOrderPaymentType(order)

    if (!map.has(dateKey)) {
      map.set(dateKey, {
        dateKey,
        dateLabel,
        totalOrders: 0,
        totalAmount: 0,
        onlineAmount: 0,
        cashAmount: 0,
        orders: [],
      })
    }

    const group = map.get(dateKey)!
    group.totalOrders += 1
    group.totalAmount += total
    group.orders.push(order)

    if (payment === 'online') {
      group.onlineAmount += total
    } else {
      group.cashAmount += total
    }
  }

  return Array.from(map.values())
    .map(group => ({
      ...group,
      orders: [...group.orders].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
}

export const buildWeeklyChartData = (orders: IOrderRow[]) => {
  const weekOrders = filterOrdersByRange(orders, 'week')
  const grouped = groupOrdersByDay(weekOrders)

  return grouped
    .map(day => ({
      name: day.dateLabel.slice(0, 5),
      Заказы: day.totalOrders,
      Сумма: day.totalAmount,
      Онлайн: day.onlineAmount,
      Наличные: day.cashAmount,
    }))
    .reverse()
}

export const buildMonthlyChartData = (orders: IOrderRow[]) => {
  const monthOrders = filterOrdersByRange(orders, 'month')
  const grouped = groupOrdersByDay(monthOrders)

  return grouped
    .map(day => ({
      name: day.dateLabel.slice(0, 5),
      Заказы: day.totalOrders,
      Сумма: day.totalAmount,
      Онлайн: day.onlineAmount,
      Наличные: day.cashAmount,
    }))
    .reverse()
}