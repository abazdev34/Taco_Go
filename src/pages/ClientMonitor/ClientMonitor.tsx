import { useEffect, useMemo, useState } from 'react'
import { createOrder } from '../../api/orders'
import { fetchMenuItems } from '../../api/menuItems'
import { formatPrice } from '../../utils/currency'
import { buildOrderComment } from '../../utils/orderHelpers'
import {
  ICreateOrderPayload,
  IMenuItem,
  TOrderPlace,
  TPaymentMethod,
} from '../../types/order'
import './ClientMonitor.scss'

type TClientCategory = {
  id?: string
  name?: string
  title?: string
  sort_order?: number | null
}

type TClientMenuItem = IMenuItem & {
  quantity?: number
  description?: string
  image?: string | null
  image_url?: string | null
  photo?: string | null
  category?: string
  categories?: TClientCategory | null
}

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'

const getItemImage = (item: TClientMenuItem) =>
  item.image_url || item.image || item.photo || DEFAULT_IMAGE

const getItemCategoryName = (item: TClientMenuItem) =>
  item.categories?.name ||
  item.categories?.title ||
  item.category ||
  'Другое'

const formatOrderNumber = (value?: number | null) =>
  String(value || 0).padStart(3, '0')

const ClientMonitor = () => {
  const [menuItems, setMenuItems] = useState<TClientMenuItem[]>([])
  const [cart, setCart] = useState<TClientMenuItem[]>([])
  const [comment, setComment] = useState('')
  const [orderMode, setOrderMode] = useState<TOrderPlace>('hall')
  const [paymentMethod, setPaymentMethod] = useState<TPaymentMethod>('cash')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')

  const [successOpen, setSuccessOpen] = useState(false)
  const [lastOrderNumber, setLastOrderNumber] = useState('001')

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true)

        const data = await fetchMenuItems()

        const prepared = (data || [])
          .filter((item: TClientMenuItem) => item.is_active !== false)
          .sort((a: TClientMenuItem, b: TClientMenuItem) => {
            const categorySortA = a.categories?.sort_order ?? 0
            const categorySortB = b.categories?.sort_order ?? 0

            if (categorySortA !== categorySortB) {
              return categorySortA - categorySortB
            }

            return (a.sort_order ?? 0) - (b.sort_order ?? 0)
          })

        setMenuItems(prepared)
      } catch (e) {
        console.error('CLIENT MENU LOAD ERROR:', e)
      } finally {
        setLoading(false)
      }
    }

    void loadMenu()
  }, [])

  const categories = useMemo(() => {
    const list = menuItems
      .map((item) => ({
        id: item.categories?.id || getItemCategoryName(item),
        name: getItemCategoryName(item),
        sort_order: item.categories?.sort_order ?? 0,
      }))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

    const unique = list.filter(
      (category, index, arr) =>
        arr.findIndex((item) => item.id === category.id) === index
    )

    return [{ id: 'all', name: 'Все' }, ...unique]
  }, [menuItems])

  const filteredMenuItems = useMemo(() => {
    if (activeCategory === 'all') return menuItems

    return menuItems.filter((item) => {
      const categoryId = item.categories?.id || getItemCategoryName(item)
      return categoryId === activeCategory
    })
  }, [menuItems, activeCategory])

  const totalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.quantity || 1), 0)
  }, [cart])

  const totalSum = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * (item.quantity || 1), 0)
  }, [cart])

  const addToCart = (item: TClientMenuItem) => {
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

  const removeFromCart = (item: TClientMenuItem) => {
    setCart((prev) =>
      prev
        .map((p) =>
          p.id === item.id ? { ...p, quantity: (p.quantity || 1) - 1 } : p
        )
        .filter((p) => (p.quantity || 0) > 0)
    )
  }

  const resetForm = () => {
    setCart([])
    setComment('')
    setOrderMode('hall')
    setPaymentMethod('cash')
    setActiveCategory('all')
  }

  const handleNextOrder = () => {
    setSuccessOpen(false)
    resetForm()
  }

  const handleSubmit = async () => {
    if (!cart.length || submitting) return

    try {
      setSubmitting(true)

      const payload: ICreateOrderPayload = {
        items: cart,
        total: totalSum,
        comment: buildOrderComment({
          orderPlace: orderMode,
          paymentMethod,
          comment,
        }),
        source: 'client',
        status: 'pending',
        customer_name: 'Гость',
        table_number: null,
        order_place: orderMode,
        payment_method: paymentMethod,
        assembly_progress: [],
      }

      const savedOrder = await createOrder(payload)

      setLastOrderNumber(formatOrderNumber(savedOrder.daily_order_number))
      setSuccessOpen(true)
      resetForm()
    } catch (e: any) {
      console.error('CLIENT CREATE ORDER ERROR:', e)
      alert(e?.message || 'Не удалось отправить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  if (successOpen) {
    return (
      <div className='client-success-page'>
        <div className='client-success-card'>
          <div className='client-success-badge'>Ваш заказ принят</div>
          <h2>Номер заказа</h2>
          <div className='client-success-number'>{lastOrderNumber}</div>
          <p>Ожидайте вызова вашего номера на кассе</p>

          <button
            type='button'
            className='client-success-next-btn'
            onClick={handleNextOrder}
          >
            Следующий заказ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='client-screen-page'>
      <div className='client-screen-layout'>
        <aside className='client-categories'>
          <div className='client-block-head'>
            <div>
              <span className='client-badge'>Категории</span>
              <h2>Выберите раздел</h2>
            </div>
          </div>

          <div className='client-category-list'>
            {categories.map((category) => (
              <button
                key={category.id}
                type='button'
                className={
                  activeCategory === category.id
                    ? 'client-category-btn active'
                    : 'client-category-btn'
                }
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </aside>

        <section className='client-menu'>
          <div className='client-block-head'>
            <div>
              <span className='client-badge'>Меню</span>
              <h2>Соберите свой заказ</h2>
            </div>

            <div className='client-menu-meta'>
              <span>{filteredMenuItems.length} позиций</span>
            </div>
          </div>

          {loading ? (
            <div className='client-empty client-panel'>Загрузка...</div>
          ) : filteredMenuItems.length === 0 ? (
            <div className='client-empty client-panel'>Меню пустое</div>
          ) : (
            <div className='client-menu-grid'>
              {filteredMenuItems.map((item) => (
                <article key={item.id} className='client-menu-card'>
                  <div className='client-menu-image-wrap'>
                    <img
                      src={getItemImage(item)}
                      alt={item.title}
                      className='client-menu-image'
                    />

                    <div className='client-card-category'>
                      {getItemCategoryName(item)}
                    </div>
                  </div>

                  <div className='client-menu-content'>
                    <div className='client-menu-top'>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.description || 'Вкусное блюдо из нашего меню'}</p>
                      </div>

                      <strong className='client-price'>
                        {formatPrice(item.price)}
                      </strong>
                    </div>

                    <button
                      type='button'
                      className='client-add-btn'
                      onClick={() => addToCart(item)}
                    >
                      Добавить
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className='client-cart'>
          <div className='client-order-card'>
            <div className='client-order-top'>
              <div>
                <span className='client-badge'>Ваш заказ</span>
                <h2>Заказ</h2>
              </div>

              <div className='client-order-total'>
                <span>Итого</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>
            </div>

            <div className='client-summary'>
              <div className='client-summary-box'>
                <span>Позиций</span>
                <strong>{totalItems}</strong>
              </div>

              <div className='client-summary-box'>
                <span>Оплата</span>
                <strong>{paymentMethod === 'cash' ? 'Наличные' : 'Онлайн'}</strong>
              </div>
            </div>

            <div className='client-settings-group'>
              <label className='client-group-title'>Формат заказа</label>
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

            <div className='client-settings-group'>
              <label className='client-group-title'>Способ оплаты</label>
              <div className='client-segments'>
                <button
                  type='button'
                  className={paymentMethod === 'cash' ? 'active' : ''}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Наличные
                </button>

                <button
                  type='button'
                  className={paymentMethod === 'online' ? 'active' : ''}
                  onClick={() => setPaymentMethod('online')}
                >
                  Онлайн
                </button>
              </div>
            </div>

            <button
              type='button'
              className='client-submit top-submit'
              onClick={handleSubmit}
              disabled={!cart.length || submitting}
            >
              {submitting ? 'Отправка...' : 'Отправить в кассу'}
            </button>
          </div>

          <div className='client-cart-list-wrap'>
            <div className='client-cart-list-head'>
              <h3>Состав заказа</h3>
            </div>

            <div className='client-cart-list'>
              {cart.length === 0 ? (
                <div className='client-empty'>Корзина пуста</div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className='client-cart-item'>
                    <div className='client-cart-item-info'>
                      <h4>{item.title}</h4>
                      <p>{formatPrice(item.price)}</p>
                    </div>

                    <div className='client-qty'>
                      <button type='button' onClick={() => removeFromCart(item)}>
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button type='button' onClick={() => addToCart(item)}>
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <textarea
              className='client-comment'
              placeholder='Комментарий к заказу'
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              rows={4}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ClientMonitor