import { useEffect, useState } from 'react'
import { TOrderPlace, TPaymentMethod } from '../../../types/order'
import { formatPrice } from '../../../utils/currency'

type Props = {
  open: boolean
  cart: any[]
  totalItems: number
  totalSum: number
  orderMode: TOrderPlace
  paymentMethod: TPaymentMethod
  cashReceived: string
  changeAmount: number
  comment: string
  submitting: boolean
  onClose: () => void
  onOrderModeChange: (value: TOrderPlace) => void
  onPaymentMethodChange: (value: TPaymentMethod) => void
  onCashReceivedChange: (value: string) => void
  onCommentChange: (value: string) => void
  onAdd: (item: any) => void
  onRemove: (item: any) => void
  onSubmit: () => void
}

function CashierCartModal({
  open,
  cart,
  totalItems,
  totalSum,
  orderMode,
  paymentMethod,
  cashReceived,
  changeAmount,
  comment,
  submitting,
  onClose,
  onOrderModeChange,
  onPaymentMethodChange,
  onCashReceivedChange,
  onCommentChange,
  onAdd,
  onRemove,
  onSubmit,
}: Props) {
  const [cashOpen, setCashOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setCashOpen(false)
      setReviewOpen(false)
    }
  }, [open])

  if (!open) return null

  const appendDigit = (digit: string) => {
    onCashReceivedChange(`${cashReceived}${digit}`)
  }

  return (
    <div className='cashier-modal'>
      <div className='cashier-modal__overlay' onClick={onClose} />

      <div className={reviewOpen ? 'cashier-modal__card review' : 'cashier-modal__card'}>
        <div className='cashier-modal__head'>
          <div>
            <span>Оформление</span>
            <h2>Корзина</h2>
            <p>{totalItems} шт. • {formatPrice(totalSum)}</p>
          </div>

          <button type='button' onClick={onClose}>
            ×
          </button>
        </div>

        {!reviewOpen ? (
          <>
            <div className='cashier-modal__body'>
              <div className='cashier-modal-total'>
                <span>Итого</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>

              <div className='cashier-choice-grid'>
                <button
                  type='button'
                  className={orderMode === 'hall' ? 'active' : ''}
                  onClick={() => onOrderModeChange('hall')}
                >
                  Здесь
                </button>
                <button
                  type='button'
                  className={orderMode === 'takeaway' ? 'active' : ''}
                  onClick={() => onOrderModeChange('takeaway')}
                >
                  С собой
                </button>
              </div>

              <div className='cashier-choice-grid'>
                <button
                  type='button'
                  className={paymentMethod === 'cash' ? 'active cash' : 'cash'}
                  onClick={() => {
                    onPaymentMethodChange('cash')
                    setCashOpen(true)
                  }}
                >
                  Наличные
                </button>
                <button
                  type='button'
                  className={paymentMethod === 'online' ? 'active online' : 'online'}
                  onClick={() => {
                    onPaymentMethodChange('online')
                    onCashReceivedChange('')
                    setCashOpen(false)
                  }}
                >
                  Онлайн
                </button>
              </div>

              {paymentMethod === 'cash' && cashOpen && (
                <div className='cashier-pay-box'>
                  <input
                    value={cashReceived}
                    placeholder='Получено'
                    inputMode='numeric'
                    onChange={e => onCashReceivedChange(e.target.value.replace(/\D/g, ''))}
                  />

                  <div className='cashier-change'>
                    <span>Сдача</span>
                    <strong>{formatPrice(changeAmount)}</strong>
                  </div>

                  <div className='cashier-keypad'>
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map(
                      digit => (
                        <button type='button' key={digit} onClick={() => appendDigit(digit)}>
                          {digit}
                        </button>
                      )
                    )}
                    <button
                      type='button'
                      className='secondary'
                      onClick={() => onCashReceivedChange(cashReceived.slice(0, -1))}
                    >
                      ⌫
                    </button>
                    <button
                      type='button'
                      className='danger'
                      onClick={() => onCashReceivedChange('')}
                    >
                      C
                    </button>
                  </div>
                </div>
              )}

              <textarea
                value={comment}
                placeholder='Комментарий'
                onChange={e => onCommentChange(e.target.value)}
              />

              <button
                type='button'
                className='cashier-review-open'
                onClick={() => setReviewOpen(true)}
              >
                <div>
                  <span>Блюда</span>
                  <strong>Проверить заказ</strong>
                </div>
                <b>{cart.length}</b>
              </button>
            </div>

            <div className='cashier-modal__footer'>
              <button
                type='button'
                className='cashier-submit-btn'
                disabled={!cart.length || submitting}
                onClick={onSubmit}
              >
                {submitting ? 'Сохранение...' : 'Оформить заказ'}
              </button>
            </div>
          </>
        ) : (
          <div className='cashier-review'>
            <div className='cashier-review__summary'>
              <div>
                <span>Позиций</span>
                <strong>{cart.length}</strong>
              </div>
              <div>
                <span>Штук</span>
                <strong>{totalItems}</strong>
              </div>
              <div>
                <span>Итого</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>
            </div>

            <div className='cashier-review__list'>
              {cart.map((item, index) => (
                <div className='cashier-review__item' key={item.id}>
                  <em>{index + 1}</em>
                  <div>
                    <h4>{item.title}</h4>
                    <span>{formatPrice(Number(item.price || 0))}</span>
                  </div>

                  <div className='cashier-review__qty'>
                    <button type='button' onClick={() => onRemove(item)}>
                      −
                    </button>
                    <strong>{item.quantity || 1}</strong>
                    <button type='button' onClick={() => onAdd(item)}>
                      +
                    </button>
                  </div>

                  <b>{formatPrice(Number(item.price || 0) * Number(item.quantity || 1))}</b>
                </div>
              ))}
            </div>

            <div className='cashier-review__footer'>
              <button type='button' onClick={() => setReviewOpen(false)}>
                Назад
              </button>
              <button
                type='button'
                className='success'
                disabled={!cart.length || submitting}
                onClick={onSubmit}
              >
                {submitting ? 'Сохранение...' : 'Проверено, оформить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CashierCartModal