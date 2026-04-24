import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createOrder, updateCashierOrder } from '../../api/orders'
import { useCart } from '../../context/CartContext'
import { TOrderPlace, TPaymentMethod } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import { buildOrderComment } from '../../utils/orderHelpers'
import './ClientMonitor.scss'

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80'

function ClientMonitor() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    removeFromCart,
    clearCart,
    totalItems,
    totalSum,
  } = useCart()

  const [menu, setMenu] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')
  const [comment, setComment] = useState('')
  const [successOpen, setSuccessOpen] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState('001')

  const paymentMethod: TPaymentMethod = 'online'

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchMenuItems()

        if (!mounted) return
        setMenu(Array.isArray(data) ? data : [])
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Не удалось загрузить меню')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    return () => {
      mounted = false
    }
  }, [])

  const categories = useMemo(() => {
    const map = new Map<string, any>()

    for (const item of menu) {
      const cat = item.categories
      if (!cat) continue

      if (!map.has(cat.id)) {
        map.set(cat.id, {
          id: cat.id,
          name: cat.name,
          sort: cat.sort_order || 0,
        })
      }
    }

    return [
      { id: 'all', name: 'Все' },
      ...Array.from(map.values()).sort((a, b) => a.sort - b.sort),
    ]
  }, [menu])

  const filtered = useMemo(() => {
    if (activeCategory === 'all') return menu
    return menu.filter(item => item.categories?.id === activeCategory)
  }, [menu, activeCategory])

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    try {
      setSubmitting(true)

      const hasKitchen = cart.some((item: any) => item.categories?.type !== 'assembly')
      const hasAssembly = cart.some((item: any) => item.categories?.type === 'assembly')

      const nextStatus = hasKitchen ? 'new' : 'preparing'
      const nextCashierStatus = hasKitchen ? 'new' : 'assembly'
      const nextKitchenStatus = hasKitchen ? 'new' : 'skipped'
      const nextAssemblyStatus = hasAssembly
        ? hasKitchen
          ? 'waiting'
          : 'new'
        : 'skipped'

      const savedOrder = await createOrder({
        items: cart,
        total: totalSum,
        comment: buildOrderComment({
          orderPlace: orderMode,
          paymentMethod,
          comment,
        }),
        source: 'client',
        status: nextStatus as any,
        customer_name: 'Гость',
        table_number: null,
        order_place: orderMode,
        payment_method: paymentMethod,
        assembly_progress: [],
      })

      await updateCashierOrder(savedOrder.id, {
        status: nextStatus as any,
        cashier_status: nextCashierStatus as any,
        payment_method: paymentMethod,
        paid_amount: totalSum,
        change_amount: 0,
        paid_at: new Date().toISOString(),
        kitchen_status: nextKitchenStatus as any,
        assembly_status: nextAssemblyStatus as any,
        assembly_progress: [],
      })

      setLastOrderNumber(String(savedOrder.daily_order_number || 0).padStart(3, '0'))
      clearCart()
      setComment('')
      setOrderMode('hall')
      setCartOpen(false)
      setSuccessOpen(true)
    } catch (e: any) {
      console.error('CLIENT ORDER ERROR:', e)
      alert(e?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  if (successOpen) {
    return (
      <div className='client-success-page'>
        <div className='client-success-card'>
          <div className='client-success-check'>✓</div>
          <h1>Заказ принят!</h1>
          <p>Ваш номер заказа</p>
          <strong className='client-success-number'>{lastOrderNumber}</strong>
          <span>Ожидайте, заказ уже передан в работу</span>

          <button type='button' onClick={() => setSuccessOpen(false)}>
            Новый заказ
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className='client-empty'>Загрузка меню...</div>
  if (error) return <div className='client-empty'>{error}</div>

  return (
    <div className='client-page'>
      <div className='client-hero'>
        <span>Mexican Grill</span>
        <h1>БУРРИТОС</h1>
        <p>Выберите блюда и оформите заказ</p>
      </div>

      <div className='client-categories-horizontal'>
        {categories.map(cat => (
          <button
            key={cat.id}
            type='button'
            className={activeCategory === cat.id ? 'active' : ''}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className='client-menu-grid'>
        {filtered.map(item => (
          <div key={item.id} className='client-card'>
            <img
              src={item.image_url || item.image || DEFAULT_IMAGE}
              alt={item.title}
              loading='lazy'
              decoding='async'
            />

            <div className='client-card__body'>
              <h3>{item.title}</h3>
              <p>{item.description || 'Описание блюда пока не добавлено'}</p>

              <div className='client-card__bottom'>
                <b>{formatPrice(Number(item.price || 0))}</b>

                <button type='button' onClick={() => addToCart(item)}>
                  Добавить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalItems > 0 && (
        <button
          type='button'
          className='client-cart-badge'
          onClick={() => setCartOpen(true)}
        >
          🛒 {totalItems} • {formatPrice(totalSum)}
        </button>
      )}

      {cartOpen && (
        <div className='client-cart-drawer'>
          <div
            className='client-cart-drawer__overlay'
            onClick={() => setCartOpen(false)}
          />

          <aside className='client-cart-drawer__panel'>
            <div className='client-cart-drawer__head'>
              <div>
                <h2>Корзина</h2>
                <span>
                  {totalItems} шт. • {formatPrice(totalSum)}
                </span>
              </div>

              <button type='button' onClick={() => setCartOpen(false)}>
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className='client-cart-empty'>Корзина пустая</div>
            ) : (
              <div className='client-cart-list'>
                {cart.map((item: any) => (
                  <div key={item.id} className='client-cart-item'>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{formatPrice(Number(item.price || 0))}</span>
                    </div>

                    <div className='client-cart-qty'>
                      <button type='button' onClick={() => removeFromCart(item)}>
                        −
                      </button>
                      <b>{item.quantity || 1}</b>
                      <button type='button' onClick={() => addToCart(item)}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className='client-settings-group'>
              <div className='client-group-title'>Формат заказа</div>

              <div className='client-segments'>
                <button
                  type='button'
                  className={orderMode === 'hall' ? 'active' : ''}
                  onClick={() => setOrderMode('hall')}
                >
                  Здесь
                </button>

                <button
                  type='button'
                  className={orderMode === 'takeaway' ? 'active' : ''}
                  onClick={() => setOrderMode('takeaway')}
                >
                  С собой
                </button>
              </div>
            </div>

            <div className='client-comment-box'>
              <div className='client-group-title'>Комментарий</div>
              <textarea
                className='client-comment'
                placeholder='Напишите пожелания к заказу'
                value={comment}
                onChange={e => setComment(e.currentTarget.value)}
                rows={3}
              />
            </div>

            <div className='client-cart-total'>
              <span>Итого</span>
              <strong>{formatPrice(totalSum)}</strong>
            </div>

            <button
              type='button'
              className='client-order-btn'
              disabled={!cart.length || submitting}
              onClick={handleCreateOrder}
            >
              {submitting ? 'Оформление...' : 'Оформить заказ'}
            </button>

            <button
              type='button'
              className='client-clear-btn'
              onClick={clearCart}
              disabled={!cart.length || submitting}
            >
              Очистить корзину
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}

export default ClientMonitor