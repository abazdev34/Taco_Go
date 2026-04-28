import { IOrderRow } from '../../../types/order'
import { formatPrice } from '../../../utils/currency'
import {
  getOrderAgeMinutes,
  getOrderPaymentMethodValue,
  getOrderPlaceText,
  getPaymentMethodLabel,
} from '../../../utils/orderHelpers'
import { formatDailyOrderNumber } from "../../../utils/cashierUtils"

type Props = {
  list: IOrderRow[]
  mode: 'new' | 'preparing' | 'ready'
  allOrders: IOrderRow[]
  busyOrderId: string
  onCancel: (id: string) => void
  onIssue: (id: string) => void
}

function CashierOrderList({
  list,
  mode,
  allOrders,
  busyOrderId,
  onCancel,
  onIssue,
}: Props) {
  if (list.length === 0) {
    return <div className='cashier-empty-box'>Пусто</div>
  }

  const statusLabel =
    mode === 'new' ? 'Новый' : mode === 'preparing' ? 'Готовится' : 'Готов'

  return (
    <div className='cashier-orders-grid'>
      {list.map(order => {
        const age = getOrderAgeMinutes(order.created_at)
        const isLate = mode === 'preparing' && age >= 10
        const paymentValue = getOrderPaymentMethodValue(order)
        const isCash = paymentValue === 'cash'
        const paidAmount = Number(order.paid_amount || 0)
        const change = Number(order.change_amount || 0)
        const orderItems = ((order.items || []) as any[]).filter(Boolean)

        return (
          <article
            key={order.id}
            className={`cashier-order-card ${isLate ? 'is-late' : ''}`}
          >
            <div className='cashier-order-card__head'>
              <div>
                <span>Заказ</span>
                <strong>№ {formatDailyOrderNumber(order, allOrders)}</strong>
              </div>

              <b className={`status-${mode}`}>{statusLabel}</b>
            </div>

            <div className='cashier-order-card__info'>
              <div>
                <span>Сумма</span>
                <strong>{formatPrice(Number(order.total || 0))}</strong>
              </div>

              <div>
                <span>Время</span>
                <strong>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </strong>
              </div>

              <div>
                <span>Минут</span>
                <strong className={isLate ? 'danger-text' : ''}>{age}</strong>
              </div>
            </div>

            <div className='cashier-order-card__meta'>
              <span>{getOrderPlaceText(order)}</span>
              <span>{getPaymentMethodLabel(paymentValue)}</span>
              {isCash ? (
                <span>
                  Получено {formatPrice(paidAmount)} / сдача {formatPrice(change)}
                </span>
              ) : (
                <span>Онлайн оплачено</span>
              )}
            </div>

            <div className='cashier-order-card__items'>
              {orderItems.length === 0 ? (
                <p>Нет позиций</p>
              ) : (
                orderItems.slice(0, 6).map((item, index) => (
                  <div key={`${order.id}-${item.id || item.title}-${index}`}>
                    <span>{item.title || 'Позиция'}</span>
                    <b>x{Number(item.quantity || 1)}</b>
                  </div>
                ))
              )}
            </div>

            <div className='cashier-order-card__actions'>
              <button
                type='button'
                className='danger'
                disabled={busyOrderId === order.id}
                onClick={() => onCancel(order.id)}
              >
                {busyOrderId === order.id ? '...' : 'Отмена'}
              </button>

              {mode === 'ready' && (
                <button
                  type='button'
                  className='success'
                  disabled={busyOrderId === order.id}
                  onClick={() => onIssue(order.id)}
                >
                  {busyOrderId === order.id ? '...' : 'Выдан'}
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default CashierOrderList