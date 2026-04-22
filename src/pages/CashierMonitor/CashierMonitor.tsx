import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createOrder, updateCashierOrder } from '../../api/orders'
import { createCashMovement } from '../../api/cashMovements'
import { closeCashSession, openCashSession } from '../../api/cashSessions'
import { useAllOrders } from '../../hooks/useAllOrders'
import { useCashMovements } from '../../hooks/useCashMovements'
import { useCashSession } from '../../hooks/useCashSession'
import {
  broadcastOrderCreated,
  broadcastOrderUpdated,
} from '../../lib/orderSync'
import { formatPrice } from '../../utils/currency'
import { calculateCashboxAmount } from '../../utils/cashbox'
import { generateCashReportPdf } from '../../utils/report'
import { sendEmailReport } from '../../utils/email'
import {
  buildDailyNumberOrders,
  getDailyOrderNumber,
} from '../../utils/orderNumber'
import {
  buildOrderComment,
  getOrderAgeMinutes,
  getOrderPaymentMethodValue,
  getOrderPlaceText,
  getPaymentMethodLabel,
} from '../../utils/orderHelpers'
import {
  IMenuItem,
  IOrderRow,
  TOrderPlace,
  TPaymentMethod,
} from '../../types/order'
import './CashierMonitor.scss'

type TCashierTab = 'accept' | 'new' | 'preparing' | 'ready' | 'cashbox'

type TCashierCategory = {
  id: string
  name: string
  sort_order?: number | null
  type?: 'kitchen' | 'assembly' | null
}

type TCashierMenuItem = IMenuItem & {
  categories?: TCashierCategory | null
  quantity?: number
  image_url?: string | null
  image?: string | null
  photo?: string | null
}

const CASHBOX_PIN = '1234'

const uniqueOrdersById = <T extends { id: string }>(orders: T[]) => {
  const map = new Map<string, T>()
  orders.forEach(order => map.set(order.id, order))
  return Array.from(map.values())
}

const resolveCashierCreatedOrderStatus = (
  items: TCashierMenuItem[]
): {
  status: IOrderRow['status']
  cashier_status: string
  assembly_progress: string[]
} => {
  const normalizedItems = items || []

  const hasKitchenItems = normalizedItems.some(
    item => item.categories?.type === 'kitchen'
  )

  const hasAssemblyItems = normalizedItems.some(
    item => item.categories?.type === 'assembly'
  )

  if (!hasKitchenItems && hasAssemblyItems) {
    return {
      status: 'preparing',
      cashier_status: 'assembly',
      assembly_progress: [],
    }
  }

  if (!hasKitchenItems) {
    return {
      status: 'preparing',
      cashier_status: 'assembly',
      assembly_progress: [],
    }
  }

  return {
    status: 'new',
    cashier_status: 'new',
    assembly_progress: [],
  }
}

const CartIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.7L21 7H7'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <circle cx='10' cy='19' r='1.8' fill='currentColor' />
    <circle cx='18' cy='19' r='1.8' fill='currentColor' />
  </svg>
)

const CashIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <rect
      x='3'
      y='6'
      width='18'
      height='12'
      rx='2'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    />
    <circle
      cx='12'
      cy='12'
      r='2.5'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    />
  </svg>
)

const PlusMoneyIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <rect
      x='3'
      y='7'
      width='18'
      height='10'
      rx='2'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path
      d='M12 9.5v5M9.5 12h5'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
)

const MinusMoneyIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <rect
      x='3'
      y='7'
      width='18'
      height='10'
      rx='2'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path
      d='M9 12h6'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
)

const HallIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M7 20v-7m10 7v-7M5 11h14M8 11V7a2 2 0 1 1 4 0v4m0 0V7a2 2 0 1 1 4 0v4'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const TakeawayIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M6 8h12l-1 10H7L6 8ZM9 8V6a3 3 0 0 1 6 0v2'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const OnlineIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <rect
      x='3'
      y='5'
      width='18'
      height='14'
      rx='2'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
    />
    <path
      d='M3 10h18'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
    />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M5 12.5 9.5 17 19 7.5'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.4'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const CloseIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M6 6l12 12M18 6 6 18'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.2'
      strokeLinecap='round'
    />
  </svg>
)

const BellIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M15 18a3 3 0 0 1-6 0m9-2H6c1-1 2-2.5 2-6a4 4 0 1 1 8 0c0 3.5 1 5 2 6Z'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const LockIcon = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

const getItemImage = (item: TCashierMenuItem) =>
  item.image_url || item.image || item.photo || ''

function CashierMonitor() {
  const [activeTab, setActiveTab] = useState<TCashierTab>('accept')
  const [cart, setCart] = useState<TCashierMenuItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
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
  const [cashboxAmount, setCashboxAmount] = useState(0)
  const [cashRequestType, setCashRequestType] = useState<'out' | 'in'>('out')
  const [cashRequestAmount, setCashRequestAmount] = useState('')
  const [cashRequestDescription, setCashRequestDescription] = useState('')
  const [cashRequestSource, setCashRequestSource] = useState('')
  const [categoryToast, setCategoryToast] = useState('')
  const [openAmount, setOpenAmount] = useState('')
  const [cashboxUnlocked, setCashboxUnlocked] = useState(false)

  const { orders, error } = useAllOrders()
  const { movements } = useCashMovements()
  const { session, refetch: refetchSession } = useCashSession()
  const [localOrders, setLocalOrders] = useState<IOrderRow[]>([])

  useEffect(() => {
    setLocalOrders(uniqueOrdersById((orders || []) as IOrderRow[]))
  }, [orders])

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

    void loadMenu()
  }, [])

  const categories = useMemo(() => {
    const prepared = [...menuItems]
      .map(item => item.categories)
      .filter((item): item is TCashierCategory => Boolean(item))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const unique = prepared.filter(
      (category, index, arr) =>
        arr.findIndex(item => item.id === category.id) === index
    )

    return [{ id: '', name: 'Все', sort_order: -1, type: null as null }, ...unique]
  }, [menuItems])

  useEffect(() => {
    if (!categoryToast) return
    const timer = setTimeout(() => setCategoryToast(''), 1200)
    return () => clearTimeout(timer)
  }, [categoryToast])

  useEffect(() => {
    if (activeCategoryId === '') return
    const exists = categories.some(category => category.id === activeCategoryId)
    if (!exists) setActiveCategoryId('')
  }, [categories, activeCategoryId])

  const filteredFoods = useMemo(() => {
    let data = [...menuItems]

    if (activeCategoryId) {
      data = data.filter(item => item.categories?.id === activeCategoryId)
    }

    return data
      .filter(item => item.is_active !== false)
      .sort((a, b) => {
        const categorySortA = a.categories?.sort_order ?? 0
        const categorySortB = b.categories?.sort_order ?? 0

        if (categorySortA !== categorySortB) return categorySortA - categorySortB
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
  }, [menuItems, activeCategoryId])

  const totalItems = useMemo(
    () => cart.reduce((acc, item) => acc + (item.quantity || 1), 0),
    [cart]
  )

  const totalSum = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0),
    [cart]
  )

  const cashReceivedNumber = Number(cashReceived || 0)
  const changeAmount =
    paymentMethod === 'cash' ? Math.max(cashReceivedNumber - totalSum, 0) : 0

  const allOrders = useMemo(() => uniqueOrdersById(localOrders), [localOrders])

  const numberingOrders = useMemo(() => buildDailyNumberOrders(allOrders), [allOrders])

  const visibleOrders = useMemo(
    () =>
      allOrders.filter(
        order => order.status !== 'cancelled' && order.status !== 'completed'
      ),
    [allOrders]
  )

  const clientPendingOrders = useMemo(
    () =>
      visibleOrders.filter(
        order => order.status === 'pending' && order.source === 'client'
      ),
    [visibleOrders]
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

  const cashboxStats = useMemo(() => {
    return calculateCashboxAmount(localOrders as any[], movements || [])
  }, [localOrders, movements])

  useEffect(() => {
    setCashboxAmount(cashboxStats.finalAmount)
  }, [cashboxStats.finalAmount])

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

  const addToCart = (item: TCashierMenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === item.id)

      if (existing) {
        return prev.map(p =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
        )
      }

      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (item: TCashierMenuItem) => {
    setCart(prev =>
      prev
        .map(p =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p
        )
        .filter(p => (p.quantity || 0) > 0)
    )
  }

  const appendCashDigit = (digit: string) => {
    setCashReceived(prev => `${prev}${digit}`)
  }

  const clearCashInput = () => setCashReceived('')
  const backspaceCashInput = () => setCashReceived(prev => prev.slice(0, -1))

  const clearCart = () => {
    setCart([])
    setComment('')
    setActiveCategoryId('')
    setOrderMode('hall')
    setPaymentMethod('cash')
    setCashReceived('')
    setCartOpen(false)
  }

  const formatDailyOrderNumber = (order: IOrderRow) => {
    if (order.daily_order_number) {
      return String(order.daily_order_number).padStart(3, '0')
    }

    return getDailyOrderNumber(order, numberingOrders)
  }

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    if (paymentMethod === 'cash' && cashReceivedNumber < totalSum) {
      alert('Наличности недостаточно')
      return
    }

    try {
      setSubmitting(true)

      const paidAt = new Date().toISOString()
      const initialFlow = resolveCashierCreatedOrderStatus(cart)

      const hasKitchen = cart.some(item => item.categories?.type !== 'assembly')
      const hasAssembly = cart.some(item => item.categories?.type === 'assembly')

      const nextKitchenStatus = hasKitchen ? 'new' : 'skipped'
      const nextAssemblyStatus = hasAssembly
        ? hasKitchen
          ? 'waiting'
          : 'new'
        : 'skipped'

      const saved = await createOrder({
        items: cart,
        total: totalSum,
        comment: buildOrderComment({
          orderPlace: orderMode,
          paymentMethod,
          comment,
        }),
        source: 'cashier',
        status: initialFlow.status,
        customer_name: 'Гость',
        table_number: null,
        order_place: orderMode,
        payment_method: paymentMethod,
        assembly_progress: initialFlow.assembly_progress,
      })

      await updateCashierOrder(saved.id, {
        status: initialFlow.status,
        cashier_status: initialFlow.cashier_status as
          | 'new'
          | 'preparing'
          | 'ready'
          | 'issued'
          | null,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? cashReceivedNumber : totalSum,
        change_amount: paymentMethod === 'cash' ? changeAmount : 0,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
        kitchen_status: nextKitchenStatus as any,
        assembly_status: nextAssemblyStatus as any,
        assembly_progress: initialFlow.assembly_progress,
      })

      const mergedOrder = {
        ...saved,
        status: initialFlow.status,
        cashier_status: initialFlow.cashier_status,
        payment_method: paymentMethod,
        paid_amount: paymentMethod === 'cash' ? cashReceivedNumber : totalSum,
        change_amount: paymentMethod === 'cash' ? changeAmount : 0,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
        kitchen_status: nextKitchenStatus,
        assembly_status: nextAssemblyStatus,
        assembly_progress: initialFlow.assembly_progress,
      } as IOrderRow

      setLocalOrders(prev => uniqueOrdersById([mergedOrder, ...prev]))
      broadcastOrderCreated(mergedOrder)
      clearCart()
      setActiveTab(initialFlow.status === 'preparing' ? 'preparing' : 'new')
    } catch (e: any) {
      console.error('CREATE ORDER ERROR:', e)
      alert(e?.message || 'Не удалось создать заказ')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAcceptClientOrder = async (id: string) => {
    const previousOrders = [...localOrders]

    try {
      setBusyOrderId(id)

      const targetOrder = localOrders.find(order => order.id === id)
      const resolvedPaymentMethod: TPaymentMethod =
        targetOrder ? getOrderPaymentMethodValue(targetOrder) : 'cash'

      const items = (targetOrder?.items || []) as TCashierMenuItem[]
      const hasKitchen = items.some(item => item.categories?.type !== 'assembly')
      const hasAssembly = items.some(item => item.categories?.type === 'assembly')
      const paidAt = new Date().toISOString()

      const nextKitchenStatus = hasKitchen ? 'new' : 'skipped'
      const nextAssemblyStatus = hasAssembly
        ? hasKitchen
          ? 'waiting'
          : 'new'
        : 'skipped'

      const optimisticOrder = {
        ...(targetOrder as IOrderRow),
        status: 'new',
        cashier_status: 'new',
        payment_method: resolvedPaymentMethod,
        kitchen_status: nextKitchenStatus,
        assembly_status: nextAssemblyStatus,
        assembly_progress: targetOrder?.assembly_progress ?? [],
        paid_amount:
          resolvedPaymentMethod === 'online'
            ? Number(targetOrder?.total || 0)
            : targetOrder?.paid_amount ?? 0,
        change_amount: targetOrder?.change_amount ?? 0,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      } as IOrderRow

      setLocalOrders(prev =>
        uniqueOrdersById(prev.map(order => (order.id === id ? optimisticOrder : order)))
      )

      await updateCashierOrder(id, {
        status: 'new',
        cashier_status: 'new',
        payment_method: resolvedPaymentMethod,
        kitchen_status: nextKitchenStatus as any,
        assembly_status: nextAssemblyStatus as any,
        assembly_progress: targetOrder?.assembly_progress ?? [],
        paid_amount:
          resolvedPaymentMethod === 'online'
            ? Number(targetOrder?.total || 0)
            : targetOrder?.paid_amount ?? 0,
        change_amount: targetOrder?.change_amount ?? 0,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      })

      broadcastOrderUpdated(optimisticOrder)
      setActiveTab('new')
    } catch (e: any) {
      console.error('ACCEPT CLIENT ORDER ERROR:', e)
      setLocalOrders(previousOrders)
      alert(e?.message || 'Не удалось принять заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleIssueOrder = async (id: string) => {
    const previousOrders = [...localOrders]

    try {
      setBusyOrderId(id)

      const paidAt = new Date().toISOString()
      const existingOrder = localOrders.find(order => order.id === id)

      const optimisticOrder = existingOrder
        ? ({
            ...existingOrder,
            cashier_status: 'issued',
            status: 'completed',
            cashier_name: cashierName.trim() || 'Кассир',
            paid_at: paidAt,
          } as IOrderRow)
        : null

      setLocalOrders(prev =>
        uniqueOrdersById(
          prev.map(order =>
            order.id === id
              ? {
                  ...order,
                  cashier_status: 'issued',
                  status: 'completed',
                  cashier_name: cashierName.trim() || 'Кассир',
                  paid_at: paidAt,
                }
              : order
          )
        )
      )

      await updateCashierOrder(id, {
        cashier_status: 'issued',
        status: 'completed',
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      })

      if (existingOrder && getOrderPaymentMethodValue(existingOrder) === 'cash') {
        await createCashMovement({
          movement_type: 'in',
          amount: Number(existingOrder.total || 0),
          description: `Выдан заказ №${existingOrder.order_number || ''}`.trim(),
          source_name: 'Выдан заказ',
          requested_by: cashierName.trim() || 'Кассир',
          status: 'approved',
        })
      }

      if (optimisticOrder) {
        broadcastOrderUpdated(optimisticOrder)
      }
    } catch (e: any) {
      console.error('ISSUE ORDER ERROR:', e)
      setLocalOrders(previousOrders)
      alert(e?.message || 'Не удалось закрыть заказ')
    } finally {
      setBusyOrderId('')
    }
  }

  const handleCancelOrder = async (id: string) => {
    const previousOrders = [...localOrders]

    try {
      setBusyOrderId(id)

      const paidAt = new Date().toISOString()
      const existingOrder = localOrders.find(order => order.id === id)

      const optimisticOrder = existingOrder
        ? ({
            ...existingOrder,
            status: 'cancelled',
            cashier_status: null,
            cashier_name: cashierName.trim() || 'Кассир',
            paid_at: paidAt,
          } as IOrderRow)
        : null

      setLocalOrders(prev =>
        uniqueOrdersById(
          prev.map(order =>
            order.id === id
              ? {
                  ...order,
                  status: 'cancelled',
                  cashier_status: null,
                  cashier_name: cashierName.trim() || 'Кассир',
                  paid_at: paidAt,
                }
              : order
          )
        )
      )

      await updateCashierOrder(id, {
        status: 'cancelled',
        cashier_status: null,
        cashier_name: cashierName.trim() || 'Кассир',
        paid_at: paidAt,
      })

      if (optimisticOrder) {
        broadcastOrderUpdated(optimisticOrder)
      }
    } catch (e: any) {
      console.error('CANCEL ORDER ERROR:', e)
      setLocalOrders(previousOrders)
      alert(e?.message || 'Не удалось отменить заказ')
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

    if (!cashierName.trim()) {
      alert('Укажите сотрудника')
      return
    }

    if (!cashRequestSource.trim()) {
      alert(
        cashRequestType === 'in'
          ? 'Укажите источник поступления'
          : 'Укажите, кому или куда выдаются деньги'
      )
      return
    }

    try {
      await createCashMovement({
        movement_type: cashRequestType,
        amount,
        description: cashRequestDescription.trim() || null,
        source_name: cashRequestSource.trim() || null,
        requested_by: cashierName.trim() || 'Кассир',
        status: 'pending',
      })

      setCashRequestAmount('')
      setCashRequestDescription('')
      setCashRequestSource('')

      alert('Запрос отправлен администратору')
    } catch (e: any) {
      console.error('CASH REQUEST ERROR:', e)
      alert(e?.message || 'Не удалось выполнить операцию')
    }
  }

  const openCashboxWithPin = () => {
    if (cashboxUnlocked) {
      setActiveTab('cashbox')
      return
    }

    const entered = window.prompt('Введите PIN для кассы')
    if (entered === CASHBOX_PIN) {
      setCashboxUnlocked(true)
      setActiveTab('cashbox')
    } else if (entered !== null) {
      alert('Неверный PIN')
    }
  }

  const renderOrderList = (
    list: IOrderRow[],
    mode: 'new' | 'preparing' | 'ready'
  ) => {
    if (list.length === 0) {
      return <div className='cashier-empty-box'>Пусто</div>
    }

    return (
      <div className='cashier-status-list cashier-status-list--compact'>
        {list.map(order => {
          const age = getOrderAgeMinutes(order.created_at)
          const isLate = mode === 'preparing' && age >= 10
          const paymentValue = getOrderPaymentMethodValue(order)
          const isCash = paymentValue === 'cash'
          const paidAmount = Number(order.paid_amount || 0)
          const change = Number(order.change_amount || 0)

          return (
            <div
              key={order.id}
              className={`cashier-status-card cashier-status-card--compact ${isLate ? 'danger' : ''}`}
            >
              <div className='cashier-status-card__top'>
                <strong className='cashier-order-number'>
                  Заказ № {formatDailyOrderNumber(order)}
                </strong>
                <span className='cashier-order-badge'>
                  {mode === 'new'
                    ? 'Новый'
                    : mode === 'preparing'
                      ? 'Готовится'
                      : 'Готов'}
                </span>
              </div>

              <div className='cashier-status-card__meta cashier-status-card__meta--compact'>
                <span>
                  Время:{' '}
                  {order.created_at
                    ? new Date(order.created_at).toLocaleTimeString('ru-RU')
                    : '—'}
                </span>
                <span>Минут прошло: {age}</span>
                <span>Сумма: {formatPrice(Number(order.total || 0))}</span>
                <span>Тип: {getOrderPlaceText(order)}</span>
                <span>Оплата: {getPaymentMethodLabel(paymentValue)}</span>

                {isCash ? (
                  <>
                    <span>Получено: {formatPrice(paidAmount)}</span>
                    <span>Сдача: {formatPrice(change)}</span>
                  </>
                ) : (
                  <span>Оплачено: {formatPrice(Number(order.total || 0))}</span>
                )}
              </div>

              <div className='cashier-status-card__actions'>
                <button
                  type='button'
                  className='cashier-cancel-btn'
                  disabled={busyOrderId === order.id}
                  onClick={() => handleCancelOrder(order.id)}
                >
                  {busyOrderId === order.id ? '...' : 'Отмена'}
                </button>

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
          {categories.map(category => (
            <button
              key={category.id || 'all'}
              type='button'
              onClick={() => {
                setActiveCategoryId(category.id)
                setCategoryToast(category.name)
              }}
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

      <section className='cashier-panel cashier-menu-panel cashier-menu-panel--wide'>
        <div className='cashier-panel-toolbar cashier-panel-toolbar--between cashier-panel-toolbar--accept'>
          <div>
            <h3>Блюда</h3>
          </div>

          <div className='cashier-accept-top-actions'>
            <button
              type='button'
              className='cashier-order-side-btn cashier-order-side-btn--cart'
              onClick={() => setCartOpen(true)}
            >
              <span className='cashier-btn-icon'>
                <CartIcon />
              </span>
              <span>Корзина</span>
              {totalItems > 0 && (
                <strong className='cashier-cart-count'>{totalItems}</strong>
              )}
            </button>
          </div>
        </div>

        {clientPendingOrders.length > 0 && (
          <div className='cashier-client-inline-box'>
            <div className='cashier-client-inline-box__head'>
              <h4>Заказы от клиента</h4>
              <span>{clientPendingOrders.length}</span>
            </div>

            <div className='cashier-status-list cashier-status-list--compact'>
              {clientPendingOrders.map(order => {
                const age = getOrderAgeMinutes(order.created_at)

                return (
                  <div
                    key={order.id}
                    className='cashier-status-card cashier-status-card--compact'
                  >
                    <div className='cashier-status-card__top'>
                      <strong className='cashier-order-number'>
                        Заказ № {formatDailyOrderNumber(order)}
                      </strong>
                      <span className='cashier-order-badge'>Клиент</span>
                    </div>

                    <div className='cashier-status-card__meta cashier-status-card__meta--compact'>
                      <span>
                        Время:{' '}
                        {order.created_at
                          ? new Date(order.created_at).toLocaleTimeString('ru-RU')
                          : '—'}
                      </span>
                      <span>Минут прошло: {age}</span>
                      <span>Сумма: {formatPrice(Number(order.total || 0))}</span>
                      <span>Тип: {getOrderPlaceText(order)}</span>
                      <span>Источник: Клиентский экран</span>
                      <span>
                        Оплата:{' '}
                        {getPaymentMethodLabel(getOrderPaymentMethodValue(order))}
                      </span>
                    </div>

                    <div className='cashier-status-card__actions'>
                      <button
                        type='button'
                        className='cashier-cancel-btn'
                        disabled={busyOrderId === order.id}
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        {busyOrderId === order.id ? '...' : 'Отмена'}
                      </button>

                      <button
                        type='button'
                        className='cashier-issue-btn'
                        disabled={busyOrderId === order.id}
                        onClick={() => handleAcceptClientOrder(order.id)}
                      >
                        {busyOrderId === order.id ? '...' : 'Принять'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {categoryToast && (
          <div className='cashier-category-toast'>
            <span className='cashier-btn-icon'>
              <BellIcon />
            </span>
            <span>{categoryToast}</span>
          </div>
        )}

        {loading ? (
          <div className='cashier-empty-box'>Загрузка меню...</div>
        ) : filteredFoods.length === 0 ? (
          <div className='cashier-empty-box'>Блюда не найдены</div>
        ) : (
          <div className='cashier-foods-grid cashier-foods-grid--names-only'>
            {filteredFoods.map(item => (
              <button
                type='button'
                className='cashier-food-btn cashier-food-btn--name-only'
                key={item.id}
                onClick={() => addToCart(item)}
                title={item.title}
              >
                <span className='cashier-food-btn__title cashier-food-btn__title--only'>
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {cartOpen && (
        <div className='cashier-cart-drawer'>
          <div
            className='cashier-cart-drawer__overlay'
            onClick={() => setCartOpen(false)}
          />
          <div className='cashier-cart-drawer__panel cashier-cart-drawer__panel--checkout'>
            <div className='cashier-cart-drawer__head'>
              <div>
                <h3>Корзина</h3>
                <p>
                  {totalItems} шт. • {formatPrice(totalSum)}
                </p>
              </div>

              <button
                type='button'
                className='cashier-cart-dropdown__close'
                onClick={() => setCartOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className='cashier-order-grid-pairs cashier-order-grid-pairs--drawer'>
              <div className='cashier-order-pair-card'>
                <span>Позиции</span>
                <strong>{totalItems}</strong>
              </div>

              <div className='cashier-order-pair-card cashier-order-pair-card--total'>
                <span>Итого</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>
            </div>

            <div className='cashier-segmented cashier-segmented--pairs'>
              <button
                type='button'
                className={
                  orderMode === 'hall'
                    ? 'cashier-segmented-btn active'
                    : 'cashier-segmented-btn'
                }
                onClick={() => setOrderMode('hall')}
              >
                <span className='cashier-btn-icon'>
                  <HallIcon />
                </span>
                <span>Здесь</span>
              </button>

              <button
                type='button'
                className={
                  orderMode === 'takeaway'
                    ? 'cashier-segmented-btn active'
                    : 'cashier-segmented-btn'
                }
                onClick={() => setOrderMode('takeaway')}
              >
                <span className='cashier-btn-icon'>
                  <TakeawayIcon />
                </span>
                <span>С собой</span>
              </button>
            </div>

            <div className='cashier-segmented cashier-segmented--pairs'>
              <button
                type='button'
                className={
                  paymentMethod === 'cash'
                    ? 'cashier-segmented-btn active'
                    : 'cashier-segmented-btn'
                }
                onClick={() => setPaymentMethod('cash')}
              >
                <span className='cashier-btn-icon'>
                  <CashIcon />
                </span>
                <span>Наличные</span>
              </button>

              <button
                type='button'
                className={
                  paymentMethod === 'online'
                    ? 'cashier-segmented-btn active'
                    : 'cashier-segmented-btn'
                }
                onClick={() => setPaymentMethod('online')}
              >
                <span className='cashier-btn-icon'>
                  <OnlineIcon />
                </span>
                <span>Онлайн</span>
              </button>
            </div>

            {paymentMethod === 'cash' && (
              <div className='cashier-cash-paybox cashier-cash-paybox--side'>
                <input
                  className='cashier-cash-input cashier-cash-input--small'
                  value={cashReceived}
                  onChange={e =>
                    setCashReceived(e.currentTarget.value.replace(/\D/g, ''))
                  }
                  placeholder='Получено'
                />

                <div className='cashier-change-row cashier-change-row--compact'>
                  <span>Сдача</span>
                  <strong>{formatPrice(changeAmount)}</strong>
                </div>

                <div className='cashier-keypad cashier-keypad--compact'>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(
                    digit => (
                      <button
                        key={digit}
                        type='button'
                        className='cashier-key-btn cashier-key-btn--small'
                        onClick={() => appendCashDigit(digit)}
                      >
                        {digit}
                      </button>
                    )
                  )}

                  <button
                    type='button'
                    className='cashier-key-btn cashier-key-btn--small secondary'
                    onClick={backspaceCashInput}
                  >
                    ⌫
                  </button>

                  <button
                    type='button'
                    className='cashier-key-btn cashier-key-btn--small secondary'
                    onClick={clearCashInput}
                  >
                    C
                  </button>
                </div>
              </div>
            )}

            <textarea
              className='cashier-comment-input cashier-comment-input--side'
              placeholder='Комментарий'
              value={comment}
              onChange={e => setComment(e.currentTarget.value)}
              rows={3}
            />

            <div className='cashier-cart-drawer__grid cashier-cart-drawer__grid--compact'>
              {cart.length === 0 ? (
                <div className='cashier-empty-box'>Корзина пуста</div>
              ) : (
                cart.map(item => (
                  <div
                    className='cashier-cart-drawer__item cashier-cart-drawer__item--compact'
                    key={item.id}
                  >
                    {getItemImage(item) ? (
                      <img
                        src={getItemImage(item)}
                        alt={item.title}
                        className='cashier-cart-drawer__image cashier-cart-drawer__image--small'
                      />
                    ) : (
                      <div className='cashier-cart-drawer__image cashier-cart-drawer__image--empty cashier-cart-drawer__image--small'>
                        Нет фото
                      </div>
                    )}

                    <div className='cashier-cart-drawer__body'>
                      <h4>{item.title}</h4>
                      <p>{formatPrice(item.price)}</p>
                      <strong>
                        {formatPrice(item.price * (item.quantity || 1))}
                      </strong>

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
                  </div>
                ))
              )}
            </div>

            <div className='cashier-cart-drawer__footer'>
              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={handleCreateOrder}
                disabled={!cart.length || submitting}
              >
                <span className='cashier-btn-icon'>
                  <CheckIcon />
                </span>
                <span>{submitting ? 'Сохранение...' : 'Оформить заказ'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderCashboxTab = () => {
    const sessionAny = session as any
    const openingBalance = Number(
      sessionAny?.opening_balance ??
        sessionAny?.opening_amount ??
        sessionAny?.initial_amount ??
        0
    )

    return (
      <div className='cashbox-layout'>
        <div className='cashier-panel'>
          <div className='cashier-panel-heading'>
            <h3>Смена кассы</h3>
          </div>

          {!session ? (
            <div className='cashier-cash-form' style={{ marginBottom: 16 }}>
              <input
                className='cashier-cash-input'
                placeholder='Начальная сумма'
                value={openAmount}
                onChange={e =>
                  setOpenAmount(e.currentTarget.value.replace(/\D/g, ''))
                }
              />

              <input
                className='cashier-name-input'
                placeholder='Сотрудник'
                value={cashierName}
                onChange={e => setCashierName(e.currentTarget.value)}
              />

              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={async () => {
                  try {
                    const amount = Number(openAmount || 0)
                    const created = await openCashSession(
                      cashierName.trim() || 'Кассир',
                      amount
                    )

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
                        created.opened_at
                      ).toLocaleString('ru-RU')}`
                    )
                  } catch (e: any) {
                    alert(e?.message || 'Не удалось открыть смену')
                  }
                }}
              >
                <span>Открыть смену</span>
              </button>
            </div>
          ) : (
            <div className='cashier-cash-form' style={{ marginBottom: 16 }}>
              <input
                className='cashier-name-input'
                placeholder='Сотрудник'
                value={cashierName}
                onChange={e => setCashierName(e.currentTarget.value)}
              />

              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={async () => {
                  try {
                    await closeCashSession(session.id, {
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
                }}
              >
                <span>Закрыть смену</span>
              </button>

              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={() =>
                  generateCashReportPdf({
                    dateLabel: new Date().toLocaleDateString('ru-RU'),
                    totalOrders: localOrders.length,
                    totalCashOrders: cashboxStats.cashOrdersTotal,
                    totalOnlineOrders: cashboxStats.onlineOrdersTotal,
                    totalOrdersAmount:
                      cashboxStats.cashOrdersTotal +
                      cashboxStats.onlineOrdersTotal,
                    totalIn: cashboxStats.approvedIn,
                    totalOut: cashboxStats.approvedOut,
                    cashboxBalance: cashboxStats.finalAmount,
                    movements: (movements || [])
                      .filter((item: any) => item.status === 'approved')
                      .map((item: any) => ({
                        createdAt: new Date(
                          item.approved_at || item.created_at || ''
                        ).toLocaleString('ru-RU'),
                        type: item.movement_type === 'in' ? 'Внесение' : 'Изъятие',
                        amount: Number(item.amount || 0),
                        requestedBy: item.requested_by || '—',
                        sourceName: item.source_name || '—',
                        description: item.description || '—',
                        approvedBy: item.approved_by || '—',
                      })),
                  })
                }
              >
                <span>PDF отчет</span>
              </button>

              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={() =>
                  sendEmailReport(
                    'Кассовый отчет',
                    `
Смена: ${session.opened_at ? new Date(session.opened_at).toLocaleString('ru-RU') : '—'}
Старт смены: ${formatPrice(openingBalance)}
Заказов: ${localOrders.length}
Наличка: ${formatPrice(cashboxStats.cashOrdersTotal)}
Онлайн: ${formatPrice(cashboxStats.onlineOrdersTotal)}
Внесено: ${formatPrice(cashboxStats.approvedIn)}
Изъято: ${formatPrice(cashboxStats.approvedOut)}
Касса: ${formatPrice(cashboxStats.finalAmount)}
`.trim()
                  )
                }
              >
                <span>Email отчет</span>
              </button>
            </div>
          )}

          <div className='cashier-panel-heading'>
            <h3>Состояние кассы</h3>
          </div>

          <div className='cashier-day-report'>
            <div className='cashier-day-report__card'>
              <span>Старт смены</span>
              <strong>{formatPrice(openingBalance)}</strong>
            </div>

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

          <div className='cashier-cash-operations'>
            <div className='cashier-cash-actions'>
              <button
                type='button'
                className={
                  cashRequestType === 'out'
                    ? 'cashier-cash-action-btn danger active'
                    : 'cashier-cash-action-btn danger'
                }
                onClick={() => setCashRequestType('out')}
              >
                <span className='cashier-btn-icon'>
                  <MinusMoneyIcon />
                </span>
                <span>Изъять деньги</span>
              </button>

              <button
                type='button'
                className={
                  cashRequestType === 'in'
                    ? 'cashier-cash-action-btn success active'
                    : 'cashier-cash-action-btn success'
                }
                onClick={() => setCashRequestType('in')}
              >
                <span className='cashier-btn-icon'>
                  <PlusMoneyIcon />
                </span>
                <span>Внести деньги</span>
              </button>
            </div>

            <div className='cashier-cash-form'>
              <input
                className='cashier-cash-input'
                placeholder='Сумма'
                value={cashRequestAmount}
                onChange={e =>
                  setCashRequestAmount(e.currentTarget.value.replace(/\D/g, ''))
                }
              />

              <input
                className='cashier-name-input'
                placeholder='Сотрудник'
                value={cashierName}
                onChange={e => setCashierName(e.currentTarget.value)}
              />

              <input
                className='cashier-name-input'
                placeholder={
                  cashRequestType === 'in'
                    ? 'Источник поступления'
                    : 'Кому / куда выдаются деньги'
                }
                value={cashRequestSource}
                onChange={e => setCashRequestSource(e.currentTarget.value)}
              />

              <textarea
                className='cashier-comment-input'
                placeholder={
                  cashRequestType === 'in'
                    ? 'Основание внесения'
                    : 'Причина изъятия'
                }
                value={cashRequestDescription}
                onChange={e => setCashRequestDescription(e.currentTarget.value)}
                rows={3}
              />

              <button
                type='button'
                className='cashier-primary-btn cashier-primary-btn--submit'
                onClick={handleCashRequestSubmit}
              >
                <span className='cashier-btn-icon'>
                  <CheckIcon />
                </span>
                <span>Отправить на подтверждение</span>
              </button>
            </div>
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
              {pendingCashRequests.map((item: any) => (
                <div key={item.id} className='cashier-journal-item'>
                  <div className='cashier-journal-item__top'>
                    <strong>
                      {item.movement_type === 'in' ? 'Внесение' : 'Изъятие'}
                    </strong>
                    <span>{formatPrice(Number(item.amount || 0))}</span>
                  </div>

                  <div className='cashier-journal-item__meta'>
                    <span>Кто отправил: {item.requested_by || '—'}</span>
                    <span>
                      {item.movement_type === 'in'
                        ? `Откуда внесение: ${item.source_name || '—'}`
                        : `Куда / кому: ${item.source_name || '—'}`}
                    </span>
                    <span>
                      {item.movement_type === 'in'
                        ? `Основание внесения: ${item.description || '—'}`
                        : `Причина изъятия: ${item.description || '—'}`}
                    </span>
                    <span>
                      Когда отправлен:{' '}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString('ru-RU')
                        : '—'}
                    </span>
                    <span>Статус: Ожидает подтверждения администратора</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='cashier-monitor-page'>
      <div className='cashier-shell'>
        {(error || errorMessage) && (
          <div className='cashier-error-box'>{error || errorMessage}</div>
        )}

        <div className='cashier-main-tabs'>
          <button
            className={
              activeTab === 'accept'
                ? 'cashier-main-tab active'
                : 'cashier-main-tab'
            }
            onClick={() => setActiveTab('accept')}
          >
            Принимать заказ
          </button>

          <button
            className={
              activeTab === 'new'
                ? 'cashier-main-tab active'
                : 'cashier-main-tab'
            }
            onClick={() => setActiveTab('new')}
          >
            Новый <span className='cashier-tab-count'>{newOrders.length}</span>
          </button>

          <button
            className={
              activeTab === 'preparing'
                ? 'cashier-main-tab active'
                : 'cashier-main-tab'
            }
            onClick={() => setActiveTab('preparing')}
          >
            Готовится{' '}
            <span className='cashier-tab-count'>{preparingOrders.length}</span>
          </button>

          <button
            className={
              activeTab === 'ready'
                ? 'cashier-main-tab active'
                : 'cashier-main-tab'
            }
            onClick={() => setActiveTab('ready')}
          >
            Готов <span className='cashier-tab-count'>{readyOrders.length}</span>
          </button>

          <button
            className={
              activeTab === 'cashbox'
                ? 'cashier-main-tab active'
                : 'cashier-main-tab'
            }
            onClick={openCashboxWithPin}
          >
            <span className='cashier-btn-icon'>
              <LockIcon />
            </span>
            <span>Касса</span>
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