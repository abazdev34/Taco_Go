import { useEffect, useMemo, useState } from 'react'
import { fetchMenuItems } from '../../api/menuItems'
import { createOrder } from '../../api/orders'
import { broadcastOrderCreated } from '../../lib/orderSync'
import { formatPrice } from '../../utils/currency'
import './ClientMonitor.scss'

type TOrderPlace = 'hall' | 'takeaway'

type TClientMenuItem = {
  id: string
  title: string
  image?: string | null
  price: number
  description?: string | null
  weight_g?: number | null
  quantity?: number
  category?: string
  is_active?: boolean
  sort_order?: number | null
  categories?: {
    id: string
    name: string
    image?: string | null
    sort_order?: number | null
    type?: 'kitchen' | 'assembly' | null
  } | null
}

const ClientMonitor = () => {
  const [cart, setCart] = useState<TClientMenuItem[]>([])
  const [menuItems, setMenuItems] = useState<TClientMenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Все')
  const [search, setSearch] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [orderPlace, setOrderPlace] = useState<TOrderPlace>('takeaway')
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showNextOrder, setShowNextOrder] = useState(false)

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true)
        const data = await fetchMenuItems()
        setMenuItems(
          (data || []).filter((item: TClientMenuItem) => item.is_active !== false)
        )
      } catch (e) {
        console.error('MENU LOAD ERROR:', e)
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [])

  const categories = useMemo(() => {
    const prepared = [...menuItems]
      .map((item) => item.categories)
      .filter(Boolean)
      .sort((a, b) => (a?.sort_order ?? 0) - (b?.sort_order ?? 0))

    const unique = prepared.filter(
      (category, index, arr) =>
        arr.findIndex((item) => item?.id === category?.id) === index
    )

    return [
      { id: 'all', name: 'Все' },
      ...unique.map((category) => ({
        id: category!.id,
        name: category!.name,
      })),
    ]
  }, [menuItems])

  const filteredFoods = useMemo(() => {
    let data = [...menuItems]

    if (activeCategory !== 'Все') {
      data = data.filter((item) => item.categories?.name === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      data = data.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      )
    }

    return data
      .filter((item) => item.is_active !== false)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [menuItems, activeCategory, search])

  const totalSum = cart.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0
  )

  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0)

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

  const resetToInitialState = () => {
    setCart([])
    setSearch('')
    setComment('')
    setActiveCategory('Все')
    setOrderPlace('takeaway')
  }

  const getOrderPlaceLabel = (value: TOrderPlace) => {
    return value === 'hall' ? 'Здесь' : 'С собой'
  }

  const buildOrderComment = () => {
    const placeText = `Тип заказа: ${getOrderPlaceLabel(orderPlace)}`
    const cleanComment = comment.trim()

    if (!cleanComment) return placeText
    return `${placeText} | Комментарий: ${cleanComment}`
  }

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    try {
      setSubmitting(true)

      const saved = await createOrder({
        items: cart,
        total: totalSum,
        comment: buildOrderComment(),
        source: 'client',
        status: 'new',
        customer_name: 'Гость',
        table_number: null,
        order_place: orderPlace,
      })

      broadcastOrderCreated(saved)
      setLastOrderNumber(saved.order_number)

      setShowSuccess(true)
      setShowNextOrder(false)

      resetToInitialState()

      window.setTimeout(() => {
        setShowNextOrder(true)
      }, 2500)

      window.setTimeout(() => {
        setShowSuccess(false)
        setShowNextOrder(false)
        setLastOrderNumber(null)
      }, 6500)
    } catch (e: any) {
      console.error('CREATE CLIENT ORDER ERROR:', e)
      alert(e?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='client-monitor'>
      <aside className='client-sidebar'>
        <div className='client-sidebar__head'>
          <h2>Категории</h2>
          <p>Выберите раздел</p>
        </div>

        <div className='client-categories'>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.name)}
              className={
                activeCategory === category.name
                  ? 'client-category-btn active'
                  : 'client-category-btn'
              }
            >
              {category.name}
            </button>
          ))}
        </div>
      </aside>

      <main className='client-main'>
        <div className='client-toolbar'>
          <div className='client-toolbar__top'>
            <div>
              <h1>Меню</h1>
              <p>Выберите блюда и оформите заказ</p>
            </div>

            <div className='client-order-place'>
              <button
                type='button'
                className={orderPlace === 'hall' ? 'active' : ''}
                onClick={() => setOrderPlace('hall')}
              >
                Здесь
              </button>
              <button
                type='button'
                className={orderPlace === 'takeaway' ? 'active' : ''}
                onClick={() => setOrderPlace('takeaway')}
              >
                С собой
              </button>
            </div>
          </div>

          <input
            type='text'
            className='client-search-input'
            placeholder='Поиск по названию или описанию...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='client-food-grid'>
          {loading ? (
            <div className='client-empty-box'>Загрузка меню...</div>
          ) : filteredFoods.length === 0 ? (
            <div className='client-empty-box'>Ничего не найдено</div>
          ) : (
            filteredFoods.map((item) => {
              const cartItem = cart.find((c) => c.id === item.id)
              const qty = cartItem?.quantity || 0

              return (
                <div className='client-food-card' key={item.id}>
                  <div className='client-food-card__image-wrap'>
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        className='client-food-card__image'
                      />
                    ) : (
                      <div className='client-food-card__image placeholder'>
                        {item.title?.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className='client-food-card__body'>
                    <div className='client-food-card__meta'>
                      {item.categories?.name && (
                        <span className='client-food-card__category'>
                          {item.categories.name}
                        </span>
                      )}
                      {item.weight_g ? (
                        <span className='client-food-card__weight'>
                          {item.weight_g} г
                        </span>
                      ) : null}
                    </div>

                    <h4>{item.title}</h4>

                    {item.description ? (
                      <p className='client-food-card__description'>
                        {item.description}
                      </p>
                    ) : (
                      <p className='client-food-card__description muted'>
                        Описание отсутствует
                      </p>
                    )}

                    <div className='client-food-card__footer'>
                      <strong>{formatPrice(item.price)}</strong>

                      {qty === 0 ? (
                        <button
                          className='client-add-btn'
                          onClick={() => addToCart(item)}
                        >
                          Добавить
                        </button>
                      ) : (
                        <div className='client-qty-controls'>
                          <button
                            type='button'
                            onClick={() => removeFromCart(item)}
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type='button'
                            onClick={() => addToCart(item)}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      <aside className='client-cart'>
        <div className='client-cart__header'>
          <div>
            <h3>Корзина</h3>
            <p>{totalItems} шт.</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <div className='client-cart__empty'>
            Добавьте товары, чтобы оформить заказ
          </div>
        ) : (
          <>
            <div className='client-cart__list'>
              {cart.map((item) => (
                <div key={item.id} className='client-cart__item'>
                  <div className='client-cart__item-info'>
                    <strong>{item.title}</strong>
                    <span>
                      {item.quantity} × {formatPrice(item.price)}
                    </span>
                  </div>

                  <div className='client-cart__item-actions'>
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
            </div>

            <textarea
              className='client-cart__comment'
              placeholder='Комментарий к заказу'
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />

            <div className='client-cart__type'>
              <span>Тип заказа:</span>
              <strong>{getOrderPlaceLabel(orderPlace)}</strong>
            </div>

            <div className='client-cart__footer'>
              <div className='client-cart__total'>
                <span>Итого:</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>

              <button
                className='client-cart__submit'
                onClick={handleCreateOrder}
                disabled={!cart.length || submitting}
              >
                {submitting ? 'Оформление...' : 'Оформить заказ'}
              </button>
            </div>
          </>
        )}
      </aside>

      {showSuccess && (
        <div className='client-success-modal'>
          <div className='client-success-modal__card'>
            <p className='client-success-modal__label'>Заказ успешно принят</p>
            <h2>Ваш номер заказа</h2>

            {lastOrderNumber !== null && (
              <div className='client-success-modal__number'>
                #{lastOrderNumber}
              </div>
            )}

            <p className='client-success-modal__text'>
              Сохраните номер и ожидайте готовности заказа
            </p>

            {showNextOrder && (
              <p className='client-success-modal__next'>
                Экран готов для следующего заказа
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientMonitor