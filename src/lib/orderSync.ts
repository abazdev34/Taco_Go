import { IOrderRow, TOrderStatus } from '../types/order'

type OrderSyncMessage =
  | { type: 'ORDER_CREATED'; payload: IOrderRow }
  | { type: 'ORDER_UPDATED'; payload: IOrderRow }
  | { type: 'ORDER_COMPLETED'; payload: IOrderRow }

const ORDER_SYNC_EVENT = 'order-sync-event'

export const broadcastOrderCreated = (order: IOrderRow) => {
  window.dispatchEvent(
    new CustomEvent<OrderSyncMessage>(ORDER_SYNC_EVENT, {
      detail: {
        type: 'ORDER_CREATED',
        payload: order,
      },
    })
  )
}

export const broadcastOrderUpdated = (order: IOrderRow) => {
  window.dispatchEvent(
    new CustomEvent<OrderSyncMessage>(ORDER_SYNC_EVENT, {
      detail: {
        type: order.status === 'completed' ? 'ORDER_COMPLETED' : 'ORDER_UPDATED',
        payload: order,
      },
    })
  )
}

export const subscribeOrderSync = (
  callback: (message: OrderSyncMessage) => void
) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<OrderSyncMessage>

    if (customEvent.detail) {
      callback(customEvent.detail)
    }
  }

  window.addEventListener(ORDER_SYNC_EVENT, handler)

  return () => {
    window.removeEventListener(ORDER_SYNC_EVENT, handler)
  }
}

export const patchOrderStatus = (
  order: IOrderRow,
  status: TOrderStatus
): IOrderRow => {
  return {
    ...order,
    status,
  }
}

export const patchOrderWorkflow = (
  order: IOrderRow,
  payload: Partial<
    Pick<IOrderRow, 'status' | 'kitchen_status' | 'assembly_status' | 'assembly_progress'>
  >
): IOrderRow => {
  return {
    ...order,
    ...payload,
  }
}