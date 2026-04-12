import {
  IOrderRow,
  TOrderPlace,
  TPaymentMethod,
  TOrderSource,
} from '../types/order'

export const getOrderPlaceLabel = (value?: TOrderPlace | null): string => {
  if (value === 'takeaway') return 'С собой'
  return 'Здесь'
}

export const getPaymentMethodLabel = (
  method?: TPaymentMethod | null
): string => {
  if (method === 'cash') return 'Наличные'
  if (method === 'online') return 'Онлайн'
  return 'Не указано'
}

export const getOrderSourceLabel = (source?: TOrderSource | null): string => {
  if (source === 'client') return 'Клиент'
  if (source === 'cashier') return 'Кассир'
  if (source === 'admin') return 'Админ'
  if (source === 'system') return 'Система'
  return 'Не указано'
}

export const getOrderPlaceValue = (
  order: Pick<IOrderRow, 'order_place' | 'order_type' | 'comment'>
): TOrderPlace => {
  const direct = order.order_place || order.order_type

  if (direct === 'hall') return 'hall'
  if (direct === 'takeaway') return 'takeaway'

  const text = String(order.comment || '').toLowerCase()

  if (
    text.includes('тип заказа: с собой') ||
    text.includes('самовынос') ||
    text.includes('takeaway') ||
    text.includes('с собой')
  ) {
    return 'takeaway'
  }

  return 'hall'
}

export const getOrderPlaceText = (
  order: Pick<IOrderRow, 'order_place' | 'order_type' | 'comment'>
): string => {
  return getOrderPlaceLabel(getOrderPlaceValue(order))
}

export const getOrderPaymentMethodValue = (
  order: Pick<IOrderRow, 'payment_method' | 'comment'>
): TPaymentMethod => {
  if (order.payment_method === 'cash') return 'cash'
  if (order.payment_method === 'online') return 'online'

  const text = String(order.comment || '').toLowerCase()

  if (text.includes('оплата: онлайн')) return 'online'
  return 'cash'
}

export const getOrderAgeMinutes = (createdAt?: string | null): number => {
  if (!createdAt) return 0

  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return 0

  const now = Date.now()
  const diffMs = now - created
  const diffMin = Math.floor(diffMs / 60000)

  return diffMin < 0 ? 0 : diffMin
}

export const isClientPendingOrder = (
  order: Pick<IOrderRow, 'status' | 'source'>
): boolean => {
  return order.status === 'pending' && order.source === 'client'
}

export const isActiveOrder = (
  order: Pick<IOrderRow, 'status'>
): boolean => {
  return order.status !== 'cancelled' && order.status !== 'completed'
}

/**
 * Зал монитордо төмөнкүлөр гана көрүнөт:
 * - hall заказдар
 * - new
 * - preparing
 * - ready
 *
 * Маанилүү:
 * - client тарабынан келген pending заказ чыкпайт
 * - ал кассир кабыл алып status='new' болгондо гана чыгат
 */
export const canShowInHallMonitor = (
  order: Pick<
    IOrderRow,
    'status' | 'source' | 'order_place' | 'order_type' | 'comment'
  >
): boolean => {
  const isHall = getOrderPlaceValue(order) === 'hall'
  if (!isHall) return false

  if (order.status === 'new') return true
  if (order.status === 'preparing') return true
  if (order.status === 'ready') return true

  return false
}

export const buildOrderComment = ({
  orderPlace,
  paymentMethod,
  comment,
}: {
  orderPlace: TOrderPlace
  paymentMethod: TPaymentMethod
  comment?: string | null
}): string => {
  const placeText = `Тип заказа: ${getOrderPlaceLabel(orderPlace)}`
  const paymentText = `Оплата: ${getPaymentMethodLabel(paymentMethod)}`
  const cleanComment = String(comment || '').trim()

  if (!cleanComment) {
    return `${placeText} | ${paymentText}`
  }

  return `${placeText} | ${paymentText} | Комментарий: ${cleanComment}`
}