import { IOrderNumberLike } from '../types/order'

export const formatGlobalOrderNumber = (
  value?: number | string | null
): string => {
  if (value === null || value === undefined || value === '') return '1'
  return String(value)
}

const getDateKey = (value?: string | null): string | null => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

const getSafeTime = (value?: string | null): number => {
  if (!value) return 0

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

export const sortOrdersForDailyNumber = <T extends IOrderNumberLike>(
  orders: T[]
): T[] => {
  return [...orders].sort((a, b) => {
    const aCreated = getSafeTime(a.created_at)
    const bCreated = getSafeTime(b.created_at)

    if (aCreated !== bCreated) return aCreated - bCreated

    const aUpdated = getSafeTime(a.updated_at)
    const bUpdated = getSafeTime(b.updated_at)

    if (aUpdated !== bUpdated) return aUpdated - bUpdated

    return a.id.localeCompare(b.id)
  })
}

/**
 * Номер эсептегенде:
 * - cancelled заказдар эсепке кирбейт
 * - completed заказдар эсепте калат
 */
export const buildDailyNumberOrders = <T extends IOrderNumberLike>(
  orders: T[]
): T[] => {
  return sortOrdersForDailyNumber(
    (orders || []).filter((order) => order.status !== 'cancelled')
  )
}

export const getDailyOrderNumber = (
  targetOrder: IOrderNumberLike,
  allOrders: IOrderNumberLike[]
): string => {
  const targetDateKey = getDateKey(targetOrder?.created_at)
  if (!targetDateKey) return '001'

  const sameDayOrders = sortOrdersForDailyNumber(
    (allOrders || []).filter(
      (order) => getDateKey(order.created_at) === targetDateKey
    )
  )

  const index = sameDayOrders.findIndex((order) => order.id === targetOrder.id)

  if (index === -1) return '001'

  return String(index + 1).padStart(3, '0')
}

export const getDisplayOrderNumber = (
  order: IOrderNumberLike,
  allOrders: IOrderNumberLike[],
  mode: 'daily' | 'global' = 'daily'
): string => {
  if (mode === 'global') {
    return formatGlobalOrderNumber(order.order_number)
  }

  return getDailyOrderNumber(order, allOrders)
}

export const getOrderLabel = (
  order: IOrderNumberLike,
  allOrders: IOrderNumberLike[],
  mode: 'daily' | 'global' = 'daily'
): string => {
  return `№${getDisplayOrderNumber(order, allOrders, mode)}`
}