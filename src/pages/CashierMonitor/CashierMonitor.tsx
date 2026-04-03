import { useEffect, useMemo, useState } from "react"
import { tacosData } from "../../Redux/tacosData/tacosData"
import { createOrder, updateOrderStatus } from "../../api/orders"
import { useOrders } from "../../hooks/useOrders"
import {
  broadcastOrderCreated,
  broadcastOrderUpdated,
} from "../../lib/orderSync"
import { IMenuItem } from "../../types/order"
import { formatPrice } from "../../utils/currency"
import "../Navbar/monitor.scss"

const CashierMonitor = () => {
  const [cart, setCart] = useState<IMenuItem[]>([])
  const [activeCategory, setActiveCategory] = useState("Все")
  const [search, setSearch] = useState("")
  const [comment, setComment] = useState("")
  const [clock, setClock] = useState(new Date())
  const [submitting, setSubmitting] = useState(false)
  const [busyOrderId, setBusyOrderId] = useState("")

  const { orders, history, loading, error } = useOrders()

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const categories = useMemo(
    () => ["Все", ...tacosData.map((item: any) => item.title)],
    []
  )

  const allFoods = useMemo(() => {
    return tacosData.flatMap((group: any) =>
      (group.tacoCategory || []).map((item: any) => ({
        ...item,
        category: group.title,
      }))
    )
  }, [])

  const filteredFoods = useMemo(() => {
    let data = allFoods

    if (activeCategory !== "Все") {
      data = data.filter((item: any) => item.category === activeCategory)
    }

    if (search.trim()) {
      data = data.filter((item: any) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      )
    }

    return data
  }, [allFoods, activeCategory, search])

  const totalSum = cart.reduce(
    (acc, item) => acc + item.price * (item.quantity || 1),
    0
  )

  const totalItems = cart.reduce((acc, item) => acc + (item.quantity || 1), 0)

  const addToCart = (item: IMenuItem) => {
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

  const removeFromCart = (item: IMenuItem) => {
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
    setSearch("")
    setComment("")
    setActiveCategory("Все")
  }

  const handleCreateOrder = async () => {
    if (!cart.length || submitting) return

    try {
      setSubmitting(true)

      const saved = await createOrder({
        items: cart,
        total: totalSum,
        comment: comment.trim(),
        source: "cashier",
        status: "new",
        customer_name: "Гость",
        table_number: null,
      })

      broadcastOrderCreated(saved)
      clearCart()
    } catch (e: any) {
      console.error("CREATE ORDER ERROR:", e)
      alert(e?.message || "Не удалось создать заказ")
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async (id: string) => {
    try {
      setBusyOrderId(id)
      const saved = await updateOrderStatus(id, "completed")
      broadcastOrderUpdated(saved)
    } catch (e: any) {
      console.error("COMPLETE ORDER ERROR:", e)
      alert(e?.message || "Не удалось завершить заказ")
    } finally {
      setBusyOrderId("")
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "new":
        return "Новый"
      case "preparing":
        return "Готовится"
      case "ready":
        return "Готов к выдаче"
      case "completed":
        return "Выдан"
      default:
        return "Неизвестно"
    }
  }

  return (
    <div className="monitor-page cashier-theme">
      <div className="page-header">
        <div>
          <h1>Рабочее место кассира</h1>
          <p>Прием заказов и выдача готовых заказов</p>
        </div>

        <div className="top-info-card">
          <span>Текущее время</span>
          <strong>
            {clock.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </strong>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-box">
          <span>Активные заказы</span>
          <h2>{orders.length}</h2>
        </div>

        <div className="stat-box">
          <span>Позиций в корзине</span>
          <h2>{totalItems}</h2>
        </div>

        <div className="stat-box">
          <span>Закрытые заказы</span>
          <h2>{history.length}</h2>
        </div>

        <div className="stat-box accent">
          <span>Сумма корзины</span>
          <h2>{formatPrice(totalSum)}</h2>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="cashier-layout cashier-layout-custom">
        <aside className="panel right-category-panel">
          <div className="panel-heading">
            <h3>Категории</h3>
          </div>

          <div className="category-list">
            {categories.map((category, index) => (
              <button
                key={index}
                onClick={() => setActiveCategory(category)}
                className={
                  activeCategory === category
                    ? "category-btn active"
                    : "category-btn"
                }
              >
                {category}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel menu-panel simple-menu-panel">
          <div className="panel-toolbar">
            <div>
              <h3>Блюда</h3>
              <p>Нажмите на блюдо, чтобы добавить в заказ</p>
            </div>

            <div className="cashier-menu-top">
              <div className="cashier-menu-total">
                <span>Сумма</span>
                <strong>{formatPrice(totalSum)}</strong>
              </div>

              <input
                type="text"
                className="search-input"
                placeholder="Поиск блюда..."
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
              />
            </div>
          </div>

          <div className="simple-foods-grid simple-foods-grid-names">
            {filteredFoods.map((item: any) => (
              <button
                type="button"
                className="food-name-btn"
                key={item.id}
                onClick={() => addToCart(item)}
              >
                <span>{item.title}</span>
                <strong>{formatPrice(item.price)}</strong>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel order-panel">
          <div className="panel-heading">
            <h3>Корзина</h3>
          </div>

          <div className="cart-list">
            {cart.length === 0 ? (
              <div className="empty-box">Корзина пуста</div>
            ) : (
              cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item__top">
                    <div>
                      <h4>{item.title}</h4>
                      <p>{formatPrice(item.price)}</p>
                    </div>

                    <strong>
                      {formatPrice(item.price * (item.quantity || 1))}
                    </strong>
                  </div>

                  <div className="qty-controls">
                    <button onClick={() => removeFromCart(item)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => addToCart(item)}>+</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <span>Позиций</span>
              <strong>{totalItems}</strong>
            </div>

            <div className="summary-total">
              <span>Итого</span>
              <h2>{formatPrice(totalSum)}</h2>
            </div>

            <textarea
              className="order-comment-input"
              placeholder="Комментарий к заказу..."
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              rows={4}
            />

            <button
              className="primary-btn"
              onClick={handleCreateOrder}
              disabled={!cart.length || submitting}
            >
              {submitting ? "Сохранение..." : "Принять заказ"}
            </button>
          </div>

          <div className="accepted-orders">
            <div className="panel-heading">
              <h3>Принятые заказы</h3>
            </div>

            {loading ? (
              <div className="empty-box small">Загрузка...</div>
            ) : orders.length === 0 ? (
              <div className="empty-box small">Активных заказов нет</div>
            ) : (
              orders.map((order: any) => (
                <div className="accepted-order-item" key={order.id}>
                  <div>
                    <h4>Заказ №{order.order_number}</h4>
                    <p>{new Date(order.created_at).toLocaleTimeString()}</p>

                    {order.comment && (
                      <div className="order-comment-preview">
                        Комментарий: {order.comment}
                      </div>
                    )}
                  </div>

                  <div className="accepted-order-actions">
                    <span className={`status-badge ${order.status}`}>
                      {getStatusText(order.status)}
                    </span>

                    {order.status === "ready" && (
                      <button
                        className="issue-btn"
                        disabled={busyOrderId === order.id}
                        onClick={() => handleComplete(order.id)}
                      >
                        {busyOrderId === order.id ? "..." : "Выдан"}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default CashierMonitor