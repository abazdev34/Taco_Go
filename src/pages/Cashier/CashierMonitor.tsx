import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createCashMovement } from '../../api/cashMovements'
import { createOrder, updateCashierOrder } from '../../api/orders'
import { useAllOrders } from '../../hooks/useAllOrders'
import { useCashMovements } from '../../hooks/useCashMovements'
import { useCashSession } from '../../hooks/useCashSession'
import { broadcastOrderCreated, broadcastOrderUpdated } from '../../lib/orderSync'
import { calculateCashboxAmount } from '../../utils/cashbox'
import { formatPrice } from '../../utils/currency'
import {
  buildOrderComment,
  getOrderPaymentMethodValue,
} from '../../utils/orderHelpers'
import { IMenuItem, IOrderRow, TOrderPlace, TPaymentMethod } from '../../types/order'
import CashierCartModal from './components/CashierCartModal'
import {
  CASHBOX_PIN,
  formatDailyOrderNumber,
  resolveCashierCreatedOrderStatus,
  uniqueOrdersById,
} from '../../utils/cashierUtils'
import './CashierMonitor.scss'

type TTab = 'accept' | 'new' | 'preparing' | 'ready' | 'cashbox'

type TCategory = {
  id: string
  name: string
  sort_order?: number | null
  type?: 'kitchen' | 'assembly' | null
}

type TMenuItem = IMenuItem & {
  categories?: TCategory | null
  quantity?: number
}

function CashierMonitor() {
  const [activeTab, setActiveTab] = useState<TTab>('accept')
  const [menuItems, setMenuItems] = useState<TMenuItem[]>([])
  const [cart, setCart] = useState<TMenuItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [animateCart, setAnimateCart] = useState(false)

  const [loading, setLoading] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')
  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethod>('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [cashierName, setCashierName] = useState('Кассир')
  const [openAmount, setOpenAmount] = useState('')
  const [cashboxUnlocked, setCashboxUnlocked] = useState(false)

  const [cashRequestType, setCashRequestType] = useState<'in' | 'out'>('out')
  const [cashRequestAmount, setCashRequestAmount] = useState('')
  const [cashRequestSource, setCashRequestSource] = useState('')
  const [cashRequestDescription, setCashRequestDescription] = useState('')
  const [busyOrderId, setBusyOrderId] = useState('')

  const { orders, error } = useAllOrders()
  const { movements } = useCashMovements()
  const {
    session,
    error: sessionError,
    refetch: refetchSession,
    openSession,
    closeSession,
  } = useCashSession()

  const [localOrders, setLocalOrders] = useState<IOrderRow[]>([])

  useEffect(() => {
    setLocalOrders(uniqueOrdersById((orders || []) as IOrderRow[]))
  }, [orders])

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true)
        setErrorMessage('')

        const data = await fetchMenuItems()

        const prepared = ((data || []) as TMenuItem[])
          .filter(item => item.is_active !== false)
          .sort((a, b) => {
            const ca = a.categories?.sort_order ?? 0
            const cb = b.categories?.sort_order ?? 0
            if (ca !== cb) return ca - cb
            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })

        setMenuItems(prepared)
      } catch (e: any) {
        setErrorMessage(e?.message || 'Не удалось загрузить меню')
      } finally {
        setLoading(false)
      }
    }

    void loadMenu()
  }, [])

  const categories = useMemo(() => {
    const list = menuItems
      .map(item => item.categories)
      .filter((item): item is TCategory => Boolean(item))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const unique = list.filter(
      (category, index, arr) =>
        arr.findIndex(item => item.id === category.id) === index
    )

    return [{ id: '', name: 'Все', sort_order: -1, type: null as null }, ...unique]
  }, [menuItems])

  const filteredFoods = useMemo(() => {
    if (!activeCategoryId) return menuItems
    return menuItems.filter(item => item.categories?.id === activeCategoryId)
  }, [menuItems, activeCategoryId])

  const allOrders = useMemo(() => uniqueOrdersById(localOrders), [localOrders])

  const visibleOrders = useMemo(
    () =>
      allOrders.filter(
        order => order.status !== ('cancelled' as any) && order.status !== 'completed'
      ),
    [allOrders]
  )

  const newOrders = useMemo(
    () => visibleOrders.filter(order => order.status === 'new'),
    [visibleOrders]
  )

  const preparingOrders = useMemo(
    () => visibleOrders.filter(order => order.status === 'preparing'),
    [visibleOrders]
  )

  const readyOrders = useMemo(
    () => visibleOrders.filter(order => order.status === 'ready'),
    [visibleOrders]
  )

  const pendingClientOrders = useMemo(
    () =>
      visibleOrders.filter(
        order => order.status === 'pending' && order.source === 'client'
      ),
    [visibleOrders]
  )

  const totalItems = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    [cart]
  )

  const totalSum = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
        0
      ),
    [cart]
  )

  const cashReceivedNumber = Number(cashReceived || 0)
  const changeAmount =
    paymentMethod === 'cash' ? Math.max(cashReceivedNumber - totalSum, 0) : 0

  const cashboxStats = useMemo(
    () => calculateCashboxAmount(localOrders as any[], movements || []),
    [localOrders, movements]
  )

  const pendingCashRequests = useMemo(
    () =>
      (movements || [])
        .filter((item: any) => item.status === 'pending')
        .sort(
          (a: any, b: any) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        ),
    [movements]
  )

  const playCartAnimation = () => {
    setAnimateCart(true)
    window.setTimeout(() => setAnimateCart(false), 360)
  }

  const addToCart = (item: TMenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)

      if (existing) {
        return prev.map(p =>
          p.id === item.id ? { ...p, quantity: Number(p.quantity || 1) + 1 } : p
        )
      }

      return [...prev, { ...item, quantity: 1 }]
    })

    playCartAnimation()
  }

  const removeFromCart = (item: TMenuItem) => {
    setCart(prev =>
      prev
        .map(p =>
          p.id === item.id ? { ...p, quantity: Number(p.quantity || 1) - 1 } : p
        )
        .filter(p => Number(p.quantity || 0) > 0)
    )
  }

  const resetCart = () => {
    setCart([])
    setCartOpen(false)
    setPaymentMethod('cash')
    setCashReceived('')
    setComment('')
    setOrderMode('hall')
  }

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    if (paymentMethod === 'cash' && cashReceivedNumber < totalSum) {
      alert('Недостаточно наличных')
      return
    }

    const cartSnapshot = [...cart]
    const totalSnapshot = totalSum
    const paymentSnapshot = paymentMethod
    const orderModeSnapshot = orderMode
    const cashSnapshot = cashReceivedNumber
    const changeSnapshot = changeAmount
    const commentSnapshot = comment
    const cashierSnapshot = cashierName.trim() || 'Кассир'

    try {
      setSubmitting(true)

      const flow = resolveCashierCreatedOrderStatus(cartSnapshot)
      const paidAt = new Date().toISOString()

      const hasKitchen = cartSnapshot.some(item => item.categories?.type !== 'assembly')
      const hasAssembly = cartSnapshot.some(item => item.categories?.type === 'assembly')

      const kitchenStatus = hasKitchen ? 'new' : 'skipped'
      const assemblyStatus = hasAssembly ? (hasKitchen ? 'waiting' : 'new') : 'skipped'

      const saved = await createOrder({
        items: cartSnapshot,
        total: totalSnapshot,
        source: 'cashier',
        status: flow.status as any,
        customer_name: 'Гость',
        table_number: null,
        order_place: orderModeSnapshot,
        payment_method: paymentSnapshot,
        assembly_progress: flow.assembly_progress,
        comment: buildOrderComment({
          orderPlace: orderModeSnapshot,
          paymentMethod: paymentSnapshot,
          comment: commentSnapshot,
        }),
      })

      const mergedOrder = {
        ...saved,
        status: flow.status,
        cashier_status: flow.cashier_status,
        payment_method: paymentSnapshot,
        paid_amount: paymentSnapshot === 'cash' ? cashSnapshot : totalSnapshot,
        change_amount: paymentSnapshot === 'cash' ? changeSnapshot : 0,
        cashier_name: cashierSnapshot,
        paid_at: paidAt,
        kitchen_status: kitchenStatus,
        assembly_status: assemblyStatus,
        assembly_progress: flow.assembly_progress,
      } as IOrderRow

      setLocalOrders(prev => uniqueOrdersById([mergedOrder, ...prev]))
      broadcastOrderCreated(mergedOrder)
      resetCart()
      setActiveTab(flow.status === 'preparing' ? 'preparing' : 'new')

      await updateCashierOrder(saved.id, {
        status: flow.status as any,
        cashier_status: flow.cashier_status as any,
        payment_method: paymentSnapshot,
        paid_amount: paymentSnapshot === 'cash' ? cashSnapshot : totalSnapshot,
        change_amount: paymentSnapshot === 'cash' ? changeSnapshot : 0,
        cashier_name: cashierSnapshot,
        paid_at: paidAt,
        kitchen_status: kitchenStatus as any,
        assembly_status: assemblyStatus as any,
        assembly_progress: flow.assembly_progress,
      })

      broadcastOrderUpdated(mergedOrder)
    } catch (e: any) {
      alert(e?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptClientOrder = async (id: string) => {
    const previous = [...localOrders]

    try {
      setBusyOrderId(id)

      const order = localOrders.find(item => item.id === id)
      if (!order) return

      const payment = getOrderPaymentMethodValue(order)
      const paidAt = new Date().toISOString()

      const updated = {
        ...order,
        status: 'new',
        cashier_status: 'new',
        payment_method: payment,
        paid_amount: payment === 'online' ? Number(order.total || 0) : order.paid_amount,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      } as IOrderRow

      setLocalOrders(prev =>
        uniqueOrdersById(prev.map(item => (item.id === id ? updated : item)))
      )

      await updateCashierOrder(id, {
        status: 'new',
        cashier_status: 'new',
        payment_method: payment,
        paid_amount: payment === 'online' ? Number(order.total || 0) : order.paid_amount,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      })

      broadcastOrderUpdated(updated)
      setActiveTab('new')
    } catch (e: any) {
      setLocalOrders(previous)
      alert(e?.message || 'Не удалось принять заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleCancelOrder = async (id: string) => {
    const previous = [...localOrders]

    try {
      setBusyOrderId(id)

      const order = localOrders.find(item => item.id === id)
      const updated = order
        ? ({
            ...order,
            status: 'cancelled' as any,
            cashier_status: null,
          } as IOrderRow)
        : null

      setLocalOrders(prev =>
        uniqueOrdersById(
          prev.map(item =>
            item.id === id ? { ...item, status: 'cancelled' as any } : item
          )
        )
      )

      await updateCashierOrder(id, {
        status: 'cancelled' as any,
        cashier_status: null,
      })

      if (updated) broadcastOrderUpdated(updated)
    } catch (e: any) {
      setLocalOrders(previous)
      alert(e?.message || 'Не удалось отменить заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleIssueOrder = async (id: string) => {
    const previous = [...localOrders]

    try {
      setBusyOrderId(id)

      const order = localOrders.find(item => item.id === id)
      if (!order) return

      const paidAt = new Date().toISOString()

      const updated = {
        ...order,
        status: 'completed',
        cashier_status: 'issued',
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      } as IOrderRow

      setLocalOrders(prev =>
        uniqueOrdersById(prev.map(item => (item.id === id ? updated : item)))
      )

      await updateCashierOrder(id, {
        status: 'completed',
        cashier_status: 'issued',
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      })

      if (getOrderPaymentMethodValue(order) === 'cash') {
        await createCashMovement({
          movement_type: 'in',
          amount: Number(order.total || 0),
          description: `Выдан заказ ${formatDailyOrderNumber(order, allOrders)}`,
          source_name: 'Выдан заказ',
          requested_by: cashierName.trim() || 'Кассир',
          status: 'approved',
        })
      }

      broadcastOrderUpdated(updated)
    } catch (e: any) {
      setLocalOrders(previous)
      alert(e?.message || 'Не удалось выдать заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleOpenSession = async () => {
    try {
      const amount = Number(openAmount || 0)
      const created = await openSession(cashierName.trim() || 'Кассир', amount)

      if (amount > 0) {
        await createCashMovement({
          movement_type: 'in',
          amount,
          description: 'Открытие смены',
          source_name: 'Открытие смены',
          requested_by: cashierName.trim() || 'Кассир',
          approved_by: cashierName.trim() || 'Кассир',
          approved_at: new Date().toISOString(),
          status: 'approved',
        })
      }

      setOpenAmount('')
      await refetchSession()

      alert(
        `Смена открыта: ${new Date(
          (created as any)?.opened_at || new Date()
        ).toLocaleString('ru-RU')}`
      )
    } catch (e: any) {
      alert(e?.message || 'Не удалось открыть смену')
    }
  }

  const handleCloseSession = async () => {
    try {
      if (!session?.id) {
        alert('Активная смена не найдена')
        await refetchSession()
        return
      }

      await closeSession(session.id, {
        closed_by: cashierName.trim() || 'Кассир',
        closing_balance: cashboxStats.finalAmount,
        total_orders: localOrders.length,
        total_cash: cashboxStats.cashOrdersTotal,
        total_online: cashboxStats.onlineOrdersTotal,
        total_in: cashboxStats.approvedIn,
        total_out: cashboxStats.approvedOut,
      })

      await refetchSession()
      setCashboxUnlocked(false)
      setActiveTab('accept')
      alert('Смена закрыта')
    } catch (e: any) {
      alert(e?.message || 'Не удалось закрыть смену')
    }
  }

  const handleCashRequestSubmit = async () => {
    const amount = Number(cashRequestAmount || 0)

    if (!amount || amount <= 0) return alert('Введите сумму')

    if (cashRequestType === 'out' && amount > cashboxStats.finalAmount) {
      return alert(`Недостаточно денег в кассе. Сейчас: ${formatPrice(cashboxStats.finalAmount)}`)
    }

    if (!cashRequestSource.trim()) {
      return alert(cashRequestType === 'in' ? 'Укажите источник' : 'Укажите получателя')
    }

    try {
      await createCashMovement({
        movement_type: cashRequestType,
        amount,
        description: cashRequestDescription.trim() || null,
        source_name: cashRequestSource.trim(),
        requested_by: cashierName.trim() || 'Кассир',
        status: 'pending',
      })

      setCashRequestAmount('')
      setCashRequestDescription('')
      setCashRequestSource('')
      alert('Запрос отправлен администратору')
    } catch (e: any) {
      alert(e?.message || 'Не удалось выполнить операцию')
    }
  }

  const openCashboxWithPin = () => {
    if (cashboxUnlocked) {
      setActiveTab('cashbox')
      return
    }

    const pin = window.prompt('Введите PIN для кассы')

    if (pin === CASHBOX_PIN) {
      setCashboxUnlocked(true)
      setActiveTab('cashbox')
    } else if (pin !== null) {
      alert('Неверный PIN')
    }
  }

  const renderOrders = (list: IOrderRow[], mode: 'new' | 'preparing' | 'ready') => {
    if (!list.length) return <div className='cashier-empty-box'>Пусто</div>

    return (
      <div className='cashier-orders-grid'>
        {list.map(order => (
          <article className='cashier-order-card' key={order.id}>
            <div className='cashier-order-card__head'>
              <div>
                <span>Заказ</span>
                <strong>{formatDailyOrderNumber(order, allOrders)}</strong>
              </div>

              <b className={`status-${mode}`}>
                {mode === 'new' ? 'Новый' : mode === 'preparing' ? 'Готовится' : 'Готов'}
              </b>
            </div>

            <div className='cashier-order-card__info'>
              <div>
                <span>Сумма</span>
                <strong>{formatPrice(Number(order.total || 0))}</strong>
              </div>
              <div>
                <span>Оплата</span>
                <strong>
                  {getOrderPaymentMethodValue(order) === 'cash' ? 'Наличные' : 'Онлайн'}
                </strong>
              </div>
            </div>

            <div className='cashier-order-card__actions'>
              <button
                type='button'
                className='danger'
                disabled={busyOrderId === order.id}
                onClick={() => handleCancelOrder(order.id)}
              >
                Отмена
              </button>

              {mode === 'ready' && (
                <button
                  type='button'
                  className='success'
                  disabled={busyOrderId === order.id}
                  onClick={() => handleIssueOrder(order.id)}
                >
                  Выдан
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className='cashier-monitor-page'>
      <div className='cashier-shell'>
        {(error || sessionError || errorMessage) && (
          <div className='cashier-error-box'>{error || sessionError || errorMessage}</div>
        )}

        <div className='cashier-main-tabs'>
          <button
            className={activeTab === 'accept' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('accept')}
          >
            Заказ
          </button>

          <button
            className={activeTab === 'new' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('new')}
          >
            Новый <span>{newOrders.length}</span>
          </button>

          <button
            className={activeTab === 'preparing' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('preparing')}
          >
            Готовится <span>{preparingOrders.length}</span>
          </button>

          <button
            className={activeTab === 'ready' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={() => setActiveTab('ready')}
          >
            Готов <span>{readyOrders.length}</span>
          </button>

          <button
            className={activeTab === 'cashbox' ? 'cashier-main-tab active' : 'cashier-main-tab'}
            onClick={openCashboxWithPin}
          >
            Касса • {formatPrice(cashboxStats.finalAmount)}
          </button>
        </div>

        {activeTab === 'accept' && (
          <div className='cashier-layout'>
            <aside className='cashier-panel cashier-category-panel'>
              <h3>Категории</h3>

              <div className='cashier-category-list'>
                {categories.map(category => (
                  <button
                    key={category.id || 'all'}
                    className={activeCategoryId === category.id ? 'active' : ''}
                    onClick={() => setActiveCategoryId(category.id)}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </aside>

            <section className='cashier-panel cashier-menu-panel'>
              <div className='cashier-panel-toolbar'>
                <h3>Блюда</h3>

                <button
                  type='button'
                  className={`cart-btn ${animateCart ? 'animate' : ''}`}
                  onClick={() => setCartOpen(true)}
                  aria-label='Открыть корзину'
                >
                  <span className='cart-icon'>🛒</span>

                  {totalItems > 0 && (
                    <span key={totalItems} className='cart-count'>
                      {totalItems}
                    </span>
                  )}
                </button>
              </div>

              {pendingClientOrders.length > 0 && (
                <div className='cashier-client-box'>
                  <strong>Заказы от клиента: {pendingClientOrders.length}</strong>

                  {pendingClientOrders.map(order => (
                    <div key={order.id} className='cashier-client-row'>
                      <span>№ {formatDailyOrderNumber(order, allOrders)}</span>
                      <b>{formatPrice(Number(order.total || 0))}</b>
                      <button onClick={() => handleAcceptClientOrder(order.id)}>Принять</button>
                      <button className='danger' onClick={() => handleCancelOrder(order.id)}>
                        Отмена
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <div className='cashier-empty-box'>Загрузка меню...</div>
              ) : (
                <div className='cashier-foods-grid'>
                  {filteredFoods.map(item => (
                    <button
                      key={item.id}
                      className='cashier-food-btn'
                      onClick={() => addToCart(item)}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <CashierCartModal
              open={cartOpen}
              cart={cart}
              totalItems={totalItems}
              totalSum={totalSum}
              orderMode={orderMode}
              paymentMethod={paymentMethod}
              cashReceived={cashReceived}
              changeAmount={changeAmount}
              comment={comment}
              submitting={submitting}
              onClose={() => setCartOpen(false)}
              onOrderModeChange={setOrderMode}
              onPaymentMethodChange={value => {
                setPaymentMethod(value)
                if (value === 'online') setCashReceived('')
              }}
              onCashReceivedChange={setCashReceived}
              onCommentChange={setComment}
              onAdd={addToCart}
              onRemove={removeFromCart}
              onSubmit={handleCreateOrder}
            />
          </div>
        )}

        {activeTab === 'new' && renderOrders(newOrders, 'new')}
        {activeTab === 'preparing' && renderOrders(preparingOrders, 'preparing')}
        {activeTab === 'ready' && renderOrders(readyOrders, 'ready')}

        {activeTab === 'cashbox' && (
          <div className='cashbox-layout'>
            <section className='cashier-panel'>
              <h3>Смена кассы</h3>

              {!session?.id ? (
                <div className='cashier-cash-form'>
                  <input
                    placeholder='Начальная сумма'
                    value={openAmount}
                    onChange={e => setOpenAmount(e.target.value.replace(/\D/g, ''))}
                  />

                  <input
                    placeholder='Сотрудник'
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                  />

                  <button className='cashier-submit-btn' onClick={handleOpenSession}>
                    Открыть смену
                  </button>
                </div>
              ) : (
                <div className='cashier-cash-form'>
                  <input
                    placeholder='Сотрудник'
                    value={cashierName}
                    onChange={e => setCashierName(e.target.value)}
                  />

                  <button className='cashier-submit-btn danger' onClick={handleCloseSession}>
                    Закрыть смену
                  </button>
                </div>
              )}

              <div className='cashier-day-report'>
                <div>
                  <span>Сейчас в кассе</span>
                  <strong>{formatPrice(cashboxStats.finalAmount)}</strong>
                </div>
                <div>
                  <span>Наличные заказы</span>
                  <strong>{formatPrice(cashboxStats.cashOrdersTotal)}</strong>
                </div>
                <div>
                  <span>Внесений</span>
                  <strong>{formatPrice(cashboxStats.approvedIn)}</strong>
                </div>
                <div>
                  <span>Изъятий</span>
                  <strong>{formatPrice(cashboxStats.approvedOut)}</strong>
                </div>
              </div>

              <div className='cashier-cash-actions'>
                <button
                  className={cashRequestType === 'out' ? 'danger active' : 'danger'}
                  onClick={() => setCashRequestType('out')}
                >
                  Изъять
                </button>
                <button
                  className={cashRequestType === 'in' ? 'success active' : 'success'}
                  onClick={() => setCashRequestType('in')}
                >
                  Внести
                </button>
              </div>

              <div className='cashier-cash-form'>
                <input
                  placeholder='Сумма'
                  value={cashRequestAmount}
                  onChange={e => setCashRequestAmount(e.target.value.replace(/\D/g, ''))}
                />

                <input
                  placeholder={cashRequestType === 'in' ? 'Источник' : 'Кому / куда'}
                  value={cashRequestSource}
                  onChange={e => setCashRequestSource(e.target.value)}
                />

                <textarea
                  placeholder='Комментарий'
                  value={cashRequestDescription}
                  onChange={e => setCashRequestDescription(e.target.value)}
                />

                <button className='cashier-submit-btn' onClick={handleCashRequestSubmit}>
                  Отправить на подтверждение
                </button>
              </div>
            </section>

            <aside className='cashier-panel'>
              <h3>Ожидают подтверждения</h3>

              {pendingCashRequests.length === 0 ? (
                <div className='cashier-empty-box'>Нет запросов</div>
              ) : (
                <div className='cashier-journal-list'>
                  {pendingCashRequests.map((item: any) => (
                    <div key={item.id} className='cashier-journal-item'>
                      <strong>{item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}</strong>
                      <b>{formatPrice(Number(item.amount || 0))}</b>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

export default CashierMonitor