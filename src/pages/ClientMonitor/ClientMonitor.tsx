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
  img?: string | null
  price: number
  description?: string | null
  measure?: string | null
  quantity?: number
  category_id?: string
  is_active?: boolean
  categories?: {
    id: string
    title: string
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
        setMenuItems(data)
      } catch (e) {
        console.error('MENU LOAD ERROR:', e)
      } finally {
        setLoading(false)
      }
    }

    loadMenu()
  }, [])

  const categories = useMemo(() => {
    const categoryTitles = Array.from(
      new Set(
        menuItems
          .map((item) => item.categories?.title)
          .filter(Boolean)
      )
    )

    return ['Все', ...categoryTitles]
  }, [menuItems])

  const filteredFoods = useMemo(() => {
    let data = menuItems

    if (activeCategory !== 'Все') {
      data = data.filter((item) => item.categories?.title === activeCategory)
    }

    if (search.trim()) {
      data = data.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
    }

    return data
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

  const clearCart = () => {
    setCart([])
    setSearch('')
    setComment('')
    setActiveCategory('Все')
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
        order_type: orderPlace,
      })

      broadcastOrderCreated(saved)
      setLastOrderNumber(saved.order_number)
      clearCart()

      setShowSuccess(true)
      setShowNextOrder(false)

      setTimeout(() => {
        setShowNextOrder(true)
      }, 4000)

      setTimeout(() => {
        setShowSuccess(false)
        setShowNextOrder(false)
        setLastOrderNumber(null)
      }, 7500)
    } catch (e: any) {
      console.error('CREATE CLIENT ORDER ERROR:', e)
      alert(e?.message || 'Не удалось оформить заказ')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className='client-monitor'>
      <div className='client-categories'>
        {categories.map((category, index) => (
          <button
            key={index}
            onClick={() => setActiveCategory(category)}
            className={
              activeCategory === category
                ? 'client-category-btn active'
                : 'client-category-btn'
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className='client-food-grid'>
        {loading ? (
          <div className='client-empty-box'>Жүктөлүүдө...</div>
        ) : filteredFoods.length === 0 ? (
          <div className='client-empty-box'>Ничего не найдено</div>
        ) : (
          filteredFoods.map((item) => {
            const cartItem = cart.find((c) => c.id === item.id)
            const qty = cartItem?.quantity || 0

            return (
              <div className='client-food-card' key={item.id}>
                <div className='client-food-card__top'>
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.title}
                      className='client-food-card__image'
                    />
                  ) : (
                    <div className='client-food-card__image placeholder'>
                      {item.title?.charAt(0)}
                    </div>
                  )}

                  <div className='client-food-card__info'>
                    <h4>{item.title}</h4>
                    <p>{formatPrice(item.price)}</p>
                  </div>
                </div>

                <div className='client-food-card__bottom'>
                  {qty === 0 ? (
                    <button
                      className='client-add-btn'
                      onClick={() => addToCart(item)}
                    >
                      Добавить
                    </button>
                  ) : (
                    <div className='client-qty-controls'>
                      <button type='button' onClick={() => removeFromCart(item)}>
                        −
                      </button>
                      <span>{qty}</span>
                      <button type='button' onClick={() => addToCart(item)}>
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default ClientMonitor