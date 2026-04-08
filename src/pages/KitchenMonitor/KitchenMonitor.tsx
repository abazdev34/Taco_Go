import { useMemo } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderWorkflow } from '../../api/orders'
import '../Navbar/monitor.scss'
import { IMenuItem, IOrderRow } from '../../types/order'

const KitchenMonitor = () => {
  const { orders = [], loading, error } = useOrders()

  const kitchenRelevantOrders = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        const items = Array.isArray(order.items) ? order.items : []

        const hasKitchen = items.some(
          (item) => item.categories?.type !== 'assembly'
        )

        if (!hasKitchen) return false

        return (
          order.kitchen_status === 'new' ||
          order.kitchen_status === 'preparing' ||
          order.kitchen_status === 'ready'
        )
      })
      .sort((a, b) => {
        const priorityMap: Record<string, number> = {
          new: 3,
          preparing: 2,
          ready: 1,
        }

        const aPriority = priorityMap[a.kitchen_status || ''] || 0
        const bPriority = priorityMap[b.kitchen_status || ''] || 0

        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        return Number(b.order_number) - Number(a.order_number)
      })
  }, [orders])

  const newOrders = useMemo(
    () => kitchenRelevantOrders.filter((order) => order.kitchen_status === 'new'),
    [kitchenRelevantOrders]
  )

  const preparingOrders = useMemo(
    () =>
      kitchenRelevantOrders.filter(
        (order) => order.kitchen_status === 'preparing'
      ),
    [kitchenRelevantOrders]
  )

  const readyOrders = useMemo(
    () => kitchenRelevantOrders.filter((order) => order.kitchen_status === 'ready'),
    [kitchenRelevantOrders]
  )

  const getKitchenItems = (order: IOrderRow): IMenuItem[] => {
    return (order.items || []).filter(
      (item) => item.categories?.type !== 'assembly'
    )
  }

  const getAssemblyItems = (order: IOrderRow): IMenuItem[] => {
    return (order.items || []).filter(
      (item) => item.categories?.type === 'assembly'
    )
  }

  const formatOrderTime = (createdAt?: string) => {
    if (!createdAt) return '--:--'

    const date = new Date(createdAt)
    if (Number.isNaN(date.getTime())) return '--:--'

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getKitchenStatusLabel = (order: IOrderRow) => {
    if (order.kitchen_status === 'ready') return 'Готово'
    if (order.kitchen_status === 'preparing') return 'Готовится'
    return 'Ожидает принятия'
  }

  const getAssemblyFlowLabel = (order: IOrderRow) => {
    const hasAssembly = getAssemblyItems(order).length > 0

    if (!hasAssembly) return 'Сборка не требуется'
    if (order.kitchen_status === 'ready') return 'Передано в сборку'
    if (order.kitchen_status === 'preparing') return 'Заказ виден в сборке'
    return 'Появится после принятия'
  }

  const handleKitchenStart = async (order: IOrderRow) => {
    try {
      const hasAssembly = getAssemblyItems(order).length > 0

      await updateOrderWorkflow(order.id, {
        kitchen_status: 'preparing',
        assembly_status: hasAssembly ? 'new' : 'skipped',
        status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка принятия кухни:', err)
      alert('Не удалось принять заказ')
    }
  }

  const handleKitchenReady = async (order: IOrderRow) => {
    try {
      const hasAssembly = getAssemblyItems(order).length > 0

      await updateOrderWorkflow(order.id, {
        kitchen_status: 'ready',
        assembly_status: hasAssembly
          ? order.assembly_status === 'ready'
            ? 'ready'
            : 'new'
          : 'skipped',
        status: hasAssembly
          ? order.assembly_status === 'ready'
            ? 'ready'
            : 'preparing'
          : 'ready',
      })
    } catch (err) {
      console.error('Ошибка завершения кухни:', err)
      alert('Не удалось отметить кухню как готовую')
    }
  }

  const renderOrderCard = (order: IOrderRow) => {
    const kitchenItems = getKitchenItems(order)
    const hasAssembly = getAssemblyItems(order).length > 0

    const isNewKitchenOrder = order.kitchen_status === 'new'
    const isPreparingKitchenOrder = order.kitchen_status === 'preparing'
    const isReadyKitchenOrder = order.kitchen_status === 'ready'

    return (
      <div
        className={`order-card kitchen-card ${
          isNewKitchenOrder ? 'order-card--new-attention' : ''
        } ${isPreparingKitchenOrder ? 'order-card--preparing' : ''} ${
          isReadyKitchenOrder ? 'order-card--ready' : ''
        }`}
        key={order.id}
      >
        <div className='order-card__header'>
          <div>
            <h2>Заказ №{order.order_number}</h2>
            <p className='order-card__time'>
              Время: {formatOrderTime(order.created_at)}
            </p>
          </div>

          <div className='badge-row'>
            {isNewKitchenOrder && (
              <span className='status-badge new'>Новый</span>
            )}
            {isPreparingKitchenOrder && (
              <span className='status-badge preparing'>Готовится</span>
            )}
            {isReadyKitchenOrder && (
              <span className='status-badge ready'>Готово</span>
            )}
            {hasAssembly && (
              <span className='status-badge waiting'>Есть сборка</span>
            )}
          </div>
        </div>

        <div className='order-meta'>
          <p>
            <strong>Статус кухни:</strong> {getKitchenStatusLabel(order)}
          </p>
          <p>
            <strong>Переход в сборку:</strong> {getAssemblyFlowLabel(order)}
          </p>
        </div>

        {!!kitchenItems.length && (
          <div className='item-group kitchen'>
            <div className='item-group__title'>Позиции кухни</div>
            <div className='order-items'>
              {kitchenItems.map((item, index) => (
                <div
                  key={`${order.id}-k-${item.id}-${index}`}
                  className={`order-item-line kitchen-item-line ${
                    isReadyKitchenOrder ? 'done' : ''
                  }`}
                >
                  <span>{item.title}</span>
                  <strong>x{item.quantity || 1}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.comment && <div className='comment-box'>💬 {order.comment}</div>}

        <div className='action-row'>
          {isNewKitchenOrder && (
            <button
              type='button'
              className='primary-btn'
              onClick={() => handleKitchenStart(order)}
            >
              Принять
            </button>
          )}

          {isPreparingKitchenOrder && (
            <button
              type='button'
              className='success-btn'
              onClick={() => handleKitchenReady(order)}
            >
              Готово
            </button>
          )}

          {isReadyKitchenOrder && (
            <button type='button' className='ready-btn' disabled>
              Кухня завершила
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='monitor-page kitchen-theme'>
      <div className='page-header'>
        <div>
          <h1>Монитор кухни</h1>
          <p>На кухне отображаются только позиции, относящиеся к кухне</p>
        </div>
      </div>

      {error && <div className='error-box'>{error}</div>}

      <div className='monitor-columns three-columns'>
        <div className='monitor-column'>
          <div className='column-title new-col'>
            <h3>Новые</h3>
            <span>{newOrders.length}</span>
          </div>

          <div className='orders-stack'>
            {loading ? (
              <div className='empty-box'>Загрузка...</div>
            ) : newOrders.length === 0 ? (
              <div className='empty-box'>Новых заказов нет</div>
            ) : (
              newOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        <div className='monitor-column'>
          <div className='column-title preparing-col'>
            <h3>Готовятся</h3>
            <span>{preparingOrders.length}</span>
          </div>

          <div className='orders-stack'>
            {loading ? (
              <div className='empty-box'>Загрузка...</div>
            ) : preparingOrders.length === 0 ? (
              <div className='empty-box'>Заказов в работе нет</div>
            ) : (
              preparingOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        <div className='monitor-column'>
          <div className='column-title ready-col'>
            <h3>Готово</h3>
            <span>{readyOrders.length}</span>
          </div>

          <div className='orders-stack'>
            {loading ? (
              <div className='empty-box'>Загрузка...</div>
            ) : readyOrders.length === 0 ? (
              <div className='empty-box'>Готовых заказов нет</div>
            ) : (
              readyOrders.map(renderOrderCard)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default KitchenMonitor