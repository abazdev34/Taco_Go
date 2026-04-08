import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createOrder, updateCashierOrder } from '../../api/orders'
import { createCashMovement } from '../../api/cashMovements'
import { useAllOrders } from '../../hooks/useAllOrders'
import { useCashMovements } from '../../hooks/useCashMovements'
import {
  broadcastOrderCreated,
  broadcastOrderUpdated,
} from '../../lib/orderSync'
import { formatPrice } from '../../utils/currency'
import { calculateCashboxAmount } from '../../utils/cashbox'
import { IMenuItem, TOrderPlace } from '../../types/order'
import './CashierMonitor.scss'

type TPaymentMethod = 'cash' | 'online'
type TCashierTab = 'accept' | 'new' | 'preparing' | 'ready' | 'cashbox'

type OrderUi = {
  id: string
  status: string
  order_number: number | string
  created_at?: string
  updated_at?: string
  comment?: string
  order_type?: TOrderPlace | string
  order_place?: TOrderPlace | string
  cashier_status?: 'new' | 'preparing' | 'ready' | 'issued' | null
  payment_method?: 'cash' | 'online' | null
  paid_amount?: number | null
  change_amount?: number | null
  cashier_name?: string | null
  paid_at?: string | null
  total?: number | null
  items?: IMenuItem[]
}

type TCashierCategory = {
  id: string
  name: string
  sort_order?: number | null
  type?: 'kitchen' | 'assembly' | null
}

type TCashierMenuItem = IMenuItem & {
  categories?: TCashierCategory | null
}

const CashierMonitor = () => {
  const [activeTab, setActiveTab] = useState<TCashierTab>('accept')

  const [cart, setCart] = useState<TCashierMenuItem[]>([])
  const [menuItems, setMenuItems] = useState<TCashierMenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')

  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [cashierName, setCashierName] = useState('Кассир')
  const [cartExpanded, setCartExpanded] = useState(false)

  const [cashboxAmount, setCashboxAmount] = useState(0)
  const [cashRequestType, setCashRequestType] = useState<'out' | 'in'>('out')
  const [cashRequestAmount, setCashRequestAmount] = useState('')
  const [cashRequestDescription, setCashRequestDescription] = useState('')
  const [cashRequestSource, setCashRequestSource] = useState('')

  const { orders, error } = useAllOrders()
  const { movements } = useCashMovements()

  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchMenuItems()

        const prepared = (data || [])
          .filter((item: TCashierMenuItem) => item.is_active !== false)
          .sort((a: TCashierMenuItem, b: TCashierMenuItem) => {
            const categorySortA = a.categories?.sort_order ?? 0
            const categorySortB = b.categories?.sort_order ?? 0

            if (categorySortA !== categorySortB) {
              return categorySortA - categorySortB
            }

            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })

        setMenuItems(prepared)
      } catch (e) {
        console.error('MENU LOAD ERROR:', e)
        setErrorMessage('Не удалось загрузить меню')
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [])

  const categories = useMemo(() => {
    const prepared = [...menuItems]
      .map((item) => item.categories)
      .filter((item): item is TCashierCategory => Boolean(item))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const unique = prepared.filter(
      (category, index, arr) =>
        arr.findIndex((item) => item.id === category.id) === index
    )

    return [{ id: '', name: 'Все', sort_order: -1, type: null as null }, ...unique]
  }, [menuItems])

  useEffect(() => {
    if (activeCategoryId === '') return

    const exists = categories.some((category) => category.id === activeCategoryId)
    if (!exists) {
      setActiveCategoryId('')
    }
  }, [categories, activeCategoryId])

  const filteredFoods = useMemo(() => {
    let data = [...menuItems]

    if (activeCategoryId) {
      data = data.filter((item) => item.categories?.id === activeCategoryId)
    }

    return data
      .filter((item) => item.is_active !== false)
      .sort((a, b) => {
        const categorySortA = a.categories?.sort_order ?? 0
        const categorySortB = b.categories?.sort_order ?? 0

        if (categorySortA !== categorySortB) {
          return categorySortA - categorySortB
        }

        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
  }, [menuItems, activeCategoryId])

  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.quantity || 1), 0)
  }, [cart])

  const totalSum = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0)
  }, [cart])

  const visibleCartItems = useMemo(() => {
    if (cartExpanded) return cart
    return cart.slice(0, 1)
  }, [cart, cartExpanded])

  const hiddenCartItemsCount = Math.max(cart.length - 1, 0)

  const cashReceivedNumber = Number(cashReceived || 0)
  const changeAmount =
    paymentMethod === 'cash' ? Math.max(cashReceivedNumber - totalSum, 0) : 0

  const allOrders = useMemo(() => ((orders || []) as OrderUi[]), [orders])

  const newOrders = useMemo(
    () => allOrders.filter((order) => order.status === 'new'),
    [allOrders]
  )

  const preparingOrders = useMemo(
    () => allOrders.filter((order) => order.status === 'preparing'),
    [allOrders]
  )

  const readyOrders = useMemo(
    () => allOrders.filter((order) => order.status === 'ready'),
    [allOrders]
  )

  const issuedOrders = useMemo(
    () => allOrders.filter((order) => order.cashier_status === 'issued'),
    [allOrders]
  )

  const cashboxStats = useMemo(() => {
    return calculateCashboxAmount((orders || []) as any[], movements || [])
  }, [orders, movements])

  useEffect(() => {
    setCashboxAmount(cashboxStats.finalAmount)
  }, [cashboxStats.finalAmount])

  const pendingCashRequests = useMemo(
    () => (movements || []).filter((item) => item.status === 'pending'),
    [movements]
  )

  const approvedCashInRequests = useMemo(
    () =>
      (movements || []).filter(
        (item) => item.status === 'approved' && item.movement_type === 'in'
      ),
    [movements]
  )

  const approvedCashOutRequests = useMemo(
    () =>
      (movements || []).filter(
        (item) => item.status === 'approved' && item.movement_type === 'out'
      ),
    [movements]
  )

  const addToCart = (item: TCashierMenuItem) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id)

      if (existing) {
        return prev.map((p) =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
        )
      }

      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (item: TCashierMenuItem) => {
    setCart((prev) =>
      prev
        .map((p) =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p
        )
        .filter((p) => (p.quantity || 0) > 0)
    )
  }

  const appendCashDigit = (digit: string) => {
    setCashReceived((prev) => `${prev}${digit}`)
  }

  const clearCashInput = () => {
    setCashReceived('')
  }

  const backspaceCashInput = () => {
    setCashReceived((prev) => prev.slice(0, -1))
  }

  const getOrderPlaceLabel = (value: TOrderPlace) => {
    return value === 'hall' ? 'Здесь' : 'С собой'
  }

  const buildOrderComment = () => {
    const placeText = `Тип заказа: ${getOrderPlaceLabel(orderMode)}`
    const cleanComment = comment.trim()

    if (!cleanComment) return placeText
    return `${placeText} | Комментарий: ${cleanComment}`
  }

  const clearCart = () => {
    setCart([])
    setComment('')
    setActiveCategoryId('')
    setOrderMode('hall')
    setPaymentMethod('cash')
    setCashReceived('')
    setCartExpanded(false)
  }

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    if (paymentMethod === 'cash' && cashReceivedNumber < totalSum) {
      alert('Наличности недостаточно')
      return
    }

    try {
      setSubmitting(true)

      const saved = await createOrder({
        items: cart,
        total: totalSum,
        comment: buildOrderComment(),
        source: 'cashier',
        customer_name: 'Гость',
        table_number: null,
        order_place: orderMode,
        assembly_progress: [],
      })

      const updated = await updateCashierOrder(saved.id, {
        cashier_status: 'new',
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? cashReceivedNumber : totalSum,
        change_amount: paymentMethod === 'cash' ? changeAmount : 0,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: new Date().toISOString(),
      })

      broadcastOrderCreated(updated)
      clearCart()
    } catch (e: any) {
      console.error('CREATE ORDER ERROR:', e)
      alert(e?.message || 'Не удалось создать заказ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleIssueOrder = async (id: string) => {
    try {
      setBusyOrderId(id)

      const saved = await updateCashierOrder(id, {
        cashier_status: 'issued',
        status: 'completed',
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: new Date().toISOString(),
      })

      broadcastOrderUpdated(saved)
    } catch (e: any) {
      console.error('ISSUE ORDER ERROR:', e)
      alert(e?.message || 'Не удалось закрыть заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleCashRequestSubmit = async () => {
    const amount = Number(cashRequestAmount || 0)

    if (!amount || amount <= 0) {
      alert('Введите сумму')
      return
    }

    try {
      await createCashMovement({
        movement_type: cashRequestType,
        amount,
        description: cashRequestDescription,
        source_name: cashRequestSource,
        requested_by: cashierName.trim() || 'Кассир',
      })

      setCashRequestAmount('')
      setCashRequestDescription('')
      setCashRequestSource('')

      alert('Запрос отправлен администратору')
    } catch (e: any) {
      console.error('CASH REQUEST ERROR:', e)
      alert(e?.message || 'Не удалось отправить запрос')
    }
  }

  const getOrderAgeMinutes = (createdAt?: string) => {
    if (!createdAt) return 0
    const created = new Date(createdAt).getTime()
    const now = Date.now()
    if (Number.isNaN(created)) return 0
    const diffMs = now - created
    const diffMin = Math.floor(diffMs / 60000)
    return diffMin < 0 ? 0 : diffMin
  }

  const renderOrderList = (
    list: OrderUi[],
    mode: 'new' | 'preparing' | 'ready'
  ) => {
    if (list.length === 0) {
      return <div className='cashier-empty-box'>Пусто</div>
    }

    return (
      <div className='cashier-status-list'>
        {list.map((order) => {
          const age = getOrderAgeMinutes(order.created_at)
          const isLate = mode === 'preparing' && age >= 10

          return (
            <div
              key={order.id}
              className={`cashier-status-card ${isLate ? 'danger' : ''}`}
            >
              <div className='cashier-status-card__top'>
                <strong className='cashier-order-number'>
                  Заказ № {order.order_number}
                </strong>
                <span className='cashier-order-badge'>
                  {mode === 'new'
                    ? 'Новый'
                    : mode === 'preparing'
                    ? 'Готовится'
                    : 'Готов'}
                </span>
              </div>

              <div className='cashier-status-card__meta'>
                <span>
                  Время:{' '}
                  {order.created_at
                    ? new Date(order.created_at).toLocaleTimeString('ru-RU')
                    : '—'}
                </span>
                <span>Минут прошло: {age}</span>
                <span>Сумма: {formatPrice(Number(order.total || 0))}</span>
              </div>

              {mode === 'ready' && (
                <button
                  type='button'
                  className='cashier-issue-btn'
                  disabled={busyOrderId === order.id}
                  onClick={() => handleIssueOrder(order.id)}
                >
                  {busyOrderId === order.id ? '...' : 'Выдан'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderAcceptTab = () => (
    <div className='cashier-layout'>
      <aside className='cashier-panel cashier-category-panel'>
        <div className='cashier-panel-heading'>
          <h3>Категории</h3>
        </div>

        <div className='cashier-category-list'>
          {categories.map((category) => (
            <button
              key={category.id || 'all'}
              type='button'
              onClick={() => setActiveCategoryId(category.id)}
              className={
                activeCategoryId === category.id
                  ? 'cashier-category-btn active'
                  : 'cashier-category-btn'
              }
            >
              {category.name}
            </button>
          ))}
        </div>
      </aside>

      <section className='cashier-panel cashier-menu-panel'>
        <div className='cashier-panel-toolbar simple'>
          <div>
            <h3>Блюда</h3>
          </div>
        </div>

        {loading ? (
          <div className='cashier-empty-box'>Загрузка меню...</div>
        ) : filteredFoods.length === 0 ? (
          <div className='cashier-empty-box'>Блюда не найдены</div>
        ) : (
          <div className='cashier-foods-grid simple'>
            {filteredFoods.map((item) => (
              <button
                type='button'
                className='cashier-food-btn simple'
                key={item.id}
                onClick={() => addToCart(item)}
                title={item.title}
              >
                <span className='cashier-food-btn__title'>{item.title}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <aside className='cashier-panel cashier-cart-panel'>
        <div className='cashier-panel-heading'>
          <h3>Корзина</h3>
        </div>

        <div className='cashier-cart-list'>
          {cart.length === 0 ? (
            <div className='cashier-empty-box'>Корзина пуста</div>
          ) : (
            <>
              {visibleCartItems.map((item) => (
                <div className='cashier-cart-item' key={item.id}>
                  <div className='cashier-cart-item-top'>
                    <div className='cashier-cart-item-info'>
                      <h4>{item.title}</h4>
                    </div>
                    <strong>
                      {formatPrice(item.price * (item.quantity || 1))}
                    </strong>
                  </div>

                  <div className='cashier-qty-controls'>
                    <button type='button' onClick={() => removeFromCart(item)}>
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button type='button' onClick={() => addToCart(item)}>
                      +
                    </button>
                  </div>
                </div>
              ))}

              {cart.length > 1 && (
                <div className='cashier-cart-toggle-wrap'>
                  {!cartExpanded ? (
                    <button
                      type='button'
                      className='cashier-cart-toggle-btn'
                      onClick={() => setCartExpanded(true)}
                    >
                      Еще {hiddenCartItemsCount}
                    </button>
                  ) : (
                    <button
                      type='button'
                      className='cashier-cart-toggle-btn'
                      onClick={() => setCartExpanded(false)}
                    >
                      Свернуть
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className='cashier-order-summary'>
          <div className='cashier-order-type-switch'>
            <button
              type='button'
              className={
                orderMode === 'hall'
                  ? 'cashier-order-type-btn active'
                  : 'cashier-order-type-btn'
              }
              onClick={() => setOrderMode('hall')}
            >
              Здесь
            </button>

            <button
              type='button'
              className={
                orderMode === 'takeaway'
                  ? 'cashier-order-type-btn active'
                  : 'cashier-order-type-btn'
              }
              onClick={() => setOrderMode('takeaway')}
            >
              С собой
            </button>
          </div>

          <div className='cashier-payment-switch'>
            <button
              type='button'
              className={
                paymentMethod === 'cash'
                  ? 'cashier-payment-btn active'
                  : 'cashier-payment-btn'
              }
              onClick={() => setPaymentMethod('cash')}
            >
              Наличные
            </button>

            <button
              type='button'
              className={
                paymentMethod === 'online'
                  ? 'cashier-payment-btn active'
                  : 'cashier-payment-btn'
              }
              onClick={() => setPaymentMethod('online')}
            >
              Онлайн
            </button>
          </div>

          <div className='cashier-summary-inline'>
            <div className='cashier-summary-inline__item'>
              <span>Позиции</span>
              <strong>{totalItems}</strong>
            </div>

            <div className='cashier-summary-inline__divider' />

            <div className='cashier-summary-inline__item total'>
              <span>Итого</span>
              <strong>{formatPrice(totalSum)}</strong>
            </div>
          </div>

          {paymentMethod === 'cash' && (
            <div className='cashier-cash-box'>
              <input
                className='cashier-cash-input'
                value={cashReceived}
                onChange={(e) =>
                  setCashReceived(e.currentTarget.value.replace(/\D/g, ''))
                }
                placeholder='Получено от клиента'
              />

              <div className='cashier-change-row'>
                <span>Сдача</span>
                <strong>{formatPrice(changeAmount)}</strong>
              </div>

              <div className='cashier-keypad'>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(
                  (digit) => (
                    <button
                      key={digit}
                      type='button'
                      className='cashier-key-btn'
                      onClick={() => appendCashDigit(digit)}
                    >
                      {digit}
                    </button>
                  )
                )}

                <button
                  type='button'
                  className='cashier-key-btn secondary'
                  onClick={backspaceCashInput}
                >
                  ⌫
                </button>

                <button
                  type='button'
                  className='cashier-key-btn secondary'
                  onClick={clearCashInput}
                >
                  C
                </button>
              </div>
            </div>
          )}

          <textarea
            className='cashier-comment-input'
            placeholder='Комментарий к заказу'
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            rows={2}
          />

          <button
            className='cashier-primary-btn'
            onClick={handleCreateOrder}
            disabled={!cart.length || submitting}
          >
            {submitting ? 'Сохранение...' : 'Принять заказ'}
          </button>
        </div>
      </aside>
    </div>
  )

  const renderCashboxTab = () => (
    <div className='cashbox-layout'>
      <div className='cashier-panel'>
        <div className='cashier-panel-heading'>
          <h3>Состояние кассы</h3>
        </div>

        <div className='cashier-day-report'>
          <div className='cashier-day-report__card'>
            <span>Сейчас в кассе</span>
            <strong>{formatPrice(cashboxAmount)}</strong>
          </div>

          <div className='cashier-day-report__card'>
            <span>Наличные заказы</span>
            <strong>{formatPrice(cashboxStats.cashOrdersTotal)}</strong>
          </div>

          <div className='cashier-day-report__card'>
            <span>Подтверждено внесений</span>
            <strong>{formatPrice(cashboxStats.approvedIn)}</strong>
          </div>

          <div className='cashier-day-report__card'>
            <span>Подтверждено изъятий</span>
            <strong>{formatPrice(cashboxStats.approvedOut)}</strong>
          </div>
        </div>

        <div className='cashier-cash-box'>
          <div className='cashier-payment-switch'>
            <button
              type='button'
              className={
                cashRequestType === 'out'
                  ? 'cashier-payment-btn active'
                  : 'cashier-payment-btn'
              }
              onClick={() => setCashRequestType('out')}
            >
              Изъять
            </button>

            <button
              type='button'
              className={
                cashRequestType === 'in'
                  ? 'cashier-payment-btn active'
                  : 'cashier-payment-btn'
              }
              onClick={() => setCashRequestType('in')}
            >
              Внести
            </button>
          </div>

          <input
            className='cashier-cash-input'
            placeholder='Сумма'
            value={cashRequestAmount}
            onChange={(e) =>
              setCashRequestAmount(e.currentTarget.value.replace(/\D/g, ''))
            }
          />

          <input
            className='cashier-name-input'
            placeholder='Кто отправил запрос'
            value={cashierName}
            onChange={(e) => setCashierName(e.currentTarget.value)}
          />

          <input
            className='cashier-name-input'
            placeholder='Источник / направление'
            value={cashRequestSource}
            onChange={(e) => setCashRequestSource(e.currentTarget.value)}
          />

          <textarea
            className='cashier-comment-input'
            placeholder='Описание'
            value={cashRequestDescription}
            onChange={(e) => setCashRequestDescription(e.currentTarget.value)}
            rows={2}
          />

          <button
            type='button'
            className='cashier-primary-btn'
            onClick={handleCashRequestSubmit}
          >
            Отправить на подтверждение администратору
          </button>
        </div>
      </div>

      <div className='cashier-journal-panel'>
        <div className='cashier-panel-heading'>
          <h3>Ожидают подтверждения</h3>
        </div>

        {pendingCashRequests.length === 0 ? (
          <div className='cashier-empty-box'>Нет запросов</div>
        ) : (
          <div className='cashier-journal-list'>
            {pendingCashRequests.map((item) => (
              <div key={item.id} className='cashier-journal-item'>
                <div className='cashier-journal-item__top'>
                  <strong>{item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}</strong>
                  <span>{formatPrice(Number(item.amount || 0))}</span>
                </div>

                <div className='cashier-journal-item__meta'>
                  <span>Кто отправил: {item.requested_by || '—'}</span>
                  <span>Источник / направление: {item.source_name || '—'}</span>
                  <span>Описание: {item.description || '—'}</span>
                  <span>Дата: {new Date(item.created_at).toLocaleString('ru-RU')}</span>
                  <span>Статус: Ожидает подтверждения</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='cashier-journal-panel'>
        <div className='cashier-panel-heading'>
          <h3>Подтвержденные внесения</h3>
        </div>

        {approvedCashInRequests.length === 0 ? (
          <div className='cashier-empty-box'>Нет записей</div>
        ) : (
          <div className='cashier-journal-list'>
            {approvedCashInRequests.map((item) => (
              <div key={item.id} className='cashier-journal-item'>
                <div className='cashier-journal-item__top'>
                  <strong>Внесение</strong>
                  <span>{formatPrice(Number(item.amount || 0))}</span>
                </div>

                <div className='cashier-journal-item__meta'>
                  <span>Кто внес: {item.requested_by || '—'}</span>
                  <span>Источник: {item.source_name || '—'}</span>
                  <span>Описание: {item.description || '—'}</span>
                  <span>
                    Когда:{' '}
                    {item.approved_at
                      ? new Date(item.approved_at).toLocaleString('ru-RU')
                      : '—'}
                  </span>
                  <span>Кто подтвердил: {item.approved_by || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='cashier-journal-panel'>
        <div className='cashier-panel-heading'>
          <h3>Подтвержденные изъятия</h3>
        </div>

        {approvedCashOutRequests.length === 0 ? (
          <div className='cashier-empty-box'>Нет записей</div>
        ) : (
          <div className='cashier-journal-list'>
            {approvedCashOutRequests.map((item) => (
              <div key={item.id} className='cashier-journal-item'>
                <div className='cashier-journal-item__top'>
                  <strong>Изъятие</strong>
                  <span>{formatPrice(Number(item.amount || 0))}</span>
                </div>

                <div className='cashier-journal-item__meta'>
                  <span>Кто взял: {item.requested_by || '—'}</span>
                  <span>Куда / зачем: {item.source_name || '—'}</span>
                  <span>Описание: {item.description || '—'}</span>
                  <span>
                    Когда:{' '}
                    {item.approved_at
                      ? new Date(item.approved_at).toLocaleString('ru-RU')
                      : '—'}
                  </span>
                  <span>Кто подтвердил: {item.approved_by || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className='cashier-journal-panel'>
        <div className='cashier-panel-heading'>
          <h3>Закрытые заказы</h3>
        </div>

        {issuedOrders.length === 0 ? (
          <div className='cashier-empty-box'>Нет закрытых заказов</div>
        ) : (
          <div className='cashier-journal-list'>
            {issuedOrders.map((entry) => (
              <div key={entry.id} className='cashier-journal-item'>
                <div className='cashier-journal-item__top'>
                  <strong>Заказ № {entry.order_number}</strong>
                  <span>{entry.payment_method === 'cash' ? 'Наличные' : 'Онлайн'}</span>
                </div>

                <div className='cashier-journal-item__meta'>
                  <span>Кто оформил: {entry.cashier_name || '—'}</span>
                  <span>
                    Когда закрыт:{' '}
                    {entry.paid_at
                      ? new Date(entry.paid_at).toLocaleString('ru-RU')
                      : '—'}
                  </span>
                  <span>Сумма заказа: {formatPrice(Number(entry.total || 0))}</span>
                  <span>Комментарий: {entry.comment || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className='cashier-monitor-page'>
      <div className='cashier-shell'>
        {(error || errorMessage) && (
          <div className='cashier-error-box'>{error || errorMessage}</div>
        )}

        <div className='cashier-main-tabs'>
          <button
            className={activeTab === 'accept' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('accept')}
          >
            Принимать заказ
          </button>

          <button
            className={activeTab === 'new' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('new')}
          >
            Новый <span className='cashier-tab-count'>{newOrders.length}</span>
          </button>

          <button
            className={activeTab === 'preparing' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('preparing')}
          >
            Готовится <span className='cashier-tab-count'>{preparingOrders.length}</span>
          </button>

          <button
            className={activeTab === 'ready' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('ready')}
          >
            Готов <span className='cashier-tab-count'>{readyOrders.length}</span>
          </button>

          <button
            className={activeTab === 'cashbox' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('cashbox')}
          >
            Касса
          </button>
        </div>

        {activeTab === 'accept' && renderAcceptTab()}
        {activeTab === 'new' && renderOrderList(newOrders, 'new')}
        {activeTab === 'preparing' && renderOrderList(preparingOrders, 'preparing')}
        {activeTab === 'ready' && renderOrderList(readyOrders, 'ready')}
        {activeTab === 'cashbox' && renderCashboxTab()}
      </div>
    </div>
  )
}

export default CashierMonitor