import { useMemo } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderWorkflow } from '../../api/orders'
import '../Navbar/monitor.scss'
import { IMenuItem, IOrderRow } from '../../types/order'

type TGroupedKitchenItem = {
  id: string
  title: string
  quantity: number
}

type TGroupedAssemblyItem = {
  id: string
  title: string
  quantity: number
}

const AssemblyMonitor = () => {
  const { orders = [], loading, error } = useOrders()

  const assemblyRelevantOrders = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        const items = Array.isArray(order.items) ? order.items : []

        const hasAssembly = items.some(
          (item) => item.categories?.type === 'assembly'
        )

        if (!hasAssembly) return false

        return (
          order.assembly_status === 'new' ||
          order.assembly_status === 'preparing' ||
          order.assembly_status === 'ready'
        )
      })
      .sort((a, b) => {
        const priorityMap: Record<string, number> = {
          new: 3,
          preparing: 2,
          ready: 1,
        }

        const aPriority = priorityMap[a.assembly_status || ''] || 0
        const bPriority = priorityMap[b.assembly_status || ''] || 0

        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        return Number(b.order_number) - Number(a.order_number)
      })
  }, [orders])

  const newOrders = useMemo(
    () => assemblyRelevantOrders.filter((order) => order.assembly_status === 'new'),
    [assemblyRelevantOrders]
  )

  const preparingOrders = useMemo(
    () =>
      assemblyRelevantOrders.filter(
        (order) => order.assembly_status === 'preparing'
      ),
    [assemblyRelevantOrders]
  )

  const readyOrders = useMemo(
    () => assemblyRelevantOrders.filter((order) => order.assembly_status === 'ready'),
    [assemblyRelevantOrders]
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

  const getGroupedKitchenItems = (order: IOrderRow): TGroupedKitchenItem[] => {
    const kitchenItems = getKitchenItems(order)
    const map = new Map<string, TGroupedKitchenItem>()

    kitchenItems.forEach((item) => {
      const qty = item.quantity || 1
      const existing = map.get(item.id)

      if (existing) {
        existing.quantity += qty
      } else {
        map.set(item.id, {
          id: item.id,
          title: item.title,
          quantity: qty,
        })
      }
    })

    return Array.from(map.values())
  }

  const getGroupedAssemblyItems = (
    order: IOrderRow
  ): TGroupedAssemblyItem[] => {
    const assemblyItems = getAssemblyItems(order)
    const map = new Map<string, TGroupedAssemblyItem>()

    assemblyItems.forEach((item) => {
      const qty = item.quantity || 1
      const existing = map.get(item.id)

      if (existing) {
        existing.quantity += qty
      } else {
        map.set(item.id, {
          id: item.id,
          title: item.title,
          quantity: qty,
        })
      }
    })

    return Array.from(map.values())
  }

  const isKitchenReady = (order: IOrderRow) => {
    return order.kitchen_status === 'ready' || order.kitchen_status === 'skipped'
  }

  const getKitchenQueueLabel = (order: IOrderRow) => {
    if (order.kitchen_status === 'ready') return 'Готово'
    if (order.kitchen_status === 'preparing') return 'Готовится'
    return 'Новый'
  }

  const getAssemblyUnitKey = (itemId: string, index: number) => {
    return `${itemId}-${index}`
  }

  const getAllAssemblyKeys = (order: IOrderRow) => {
    const groupedAssemblyItems = getGroupedAssemblyItems(order)

    return groupedAssemblyItems.flatMap((item) =>
      Array.from({ length: item.quantity }, (_, index) =>
        getAssemblyUnitKey(item.id, index)
      )
    )
  }

  const getItemCheckedCount = (
    order: IOrderRow,
    itemId: string,
    quantity: number
  ) => {
    const progress = order.assembly_progress || []

    return Array.from({ length: quantity }, (_, index) =>
      getAssemblyUnitKey(itemId, index)
    ).filter((key) => progress.includes(key)).length
  }

  const allAssemblyChecked = (order: IOrderRow) => {
    const allKeys = getAllAssemblyKeys(order)
    const progress = order.assembly_progress || []

    if (!allKeys.length) return true

    return allKeys.every((key) => progress.includes(key))
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
    if (order.kitchen_status === 'new') return 'Новый'
    return 'Пропущено'
  }

  const getAssemblyStatusLabel = (order: IOrderRow) => {
    const kitchenReady = isKitchenReady(order)

    if (order.assembly_status === 'ready') return 'Готово'
    if (order.assembly_status === 'preparing') return 'Собирается'
    if (kitchenReady && order.assembly_status === 'new') return 'Собрать'
    return 'Готовится'
  }

  const updateAssemblyProgress = async (
    order: IOrderRow,
    nextProgress: string[]
  ) => {
    await updateOrderWorkflow(order.id, {
      assembly_progress: nextProgress,
      assembly_status: 'preparing',
      status: 'preparing',
    })
  }

  const handleAssemblyStart = async (order: IOrderRow) => {
    try {
      await updateOrderWorkflow(order.id, {
        assembly_status: 'preparing',
        status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка начала сборки:', err)
      alert('Не удалось начать сборку')
    }
  }

  const handleAddOneAssemblyUnit = async (
    order: IOrderRow,
    itemId: string,
    quantity: number
  ) => {
    try {
      const current = order.assembly_progress || []

      const nextIndex = Array.from({ length: quantity }, (_, index) => index).find(
        (index) => !current.includes(getAssemblyUnitKey(itemId, index))
      )

      if (nextIndex === undefined) return

      const nextProgress = [...current, getAssemblyUnitKey(itemId, nextIndex)]

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка добавления позиции сборки:', err)
      alert('Не удалось обновить сборку')
    }
  }

  const handleRemoveOneAssemblyUnit = async (
    order: IOrderRow,
    itemId: string,
    quantity: number
  ) => {
    try {
      const current = order.assembly_progress || []

      const checkedIndexes = Array.from({ length: quantity }, (_, index) => index)
        .filter((index) => current.includes(getAssemblyUnitKey(itemId, index)))

      const lastCheckedIndex = checkedIndexes[checkedIndexes.length - 1]

      if (lastCheckedIndex === undefined) return

      const nextProgress = current.filter(
        (key) => key !== getAssemblyUnitKey(itemId, lastCheckedIndex)
      )

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка удаления позиции сборки:', err)
      alert('Не удалось изменить сборку')
    }
  }

  const handleCompleteAssemblyItem = async (
    order: IOrderRow,
    itemId: string,
    quantity: number
  ) => {
    try {
      const current = order.assembly_progress || []

      const keysToAdd = Array.from({ length: quantity }, (_, index) =>
        getAssemblyUnitKey(itemId, index)
      )

      const nextProgress = Array.from(new Set([...current, ...keysToAdd]))

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка полного завершения позиции сборки:', err)
      alert('Не удалось полностью собрать позицию')
    }
  }

  const handleAssemblyReady = async (order: IOrderRow) => {
    try {
      if (!isKitchenReady(order)) {
        alert('Сначала дождитесь завершения кухни')
        return
      }

      if (!allAssemblyChecked(order)) {
        alert('Сначала соберите все позиции')
        return
      }

      await updateOrderWorkflow(order.id, {
        assembly_status: 'ready',
        status: 'ready',
      })
    } catch (err) {
      console.error('Ошибка завершения сборки:', err)
      alert('Не удалось завершить сборку')
    }
  }

  const renderOrderCard = (order: IOrderRow) => {
    const groupedKitchenItems = getGroupedKitchenItems(order)
    const groupedAssemblyItems = getGroupedAssemblyItems(order)

    const kitchenReady = isKitchenReady(order)
    const isNewAssemblyOrder = order.assembly_status === 'new'
    const isPreparingAssemblyOrder = order.assembly_status === 'preparing'
    const isReadyAssemblyOrder = order.assembly_status === 'ready'

    return (
      <div
        className={`order-card assembly-card ${
          isNewAssemblyOrder ? 'order-card--new-attention' : ''
        } ${isPreparingAssemblyOrder ? 'order-card--preparing' : ''} ${
          isReadyAssemblyOrder ? 'order-card--ready' : ''
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
            {isNewAssemblyOrder && (
              <span className='status-badge new'>Новый</span>
            )}

            {isPreparingAssemblyOrder && (
              <span className='status-badge preparing'>Собирается</span>
            )}

            {isReadyAssemblyOrder && (
              <span className='status-badge ready'>Готово</span>
            )}

            <span
              className={`status-badge ${
                kitchenReady ? 'ready' : 'preparing'
              }`}
            >
              {kitchenReady ? 'Кухня готова' : 'Кухня готовит'}
            </span>
          </div>
        </div>

        <div className='order-meta'>
          <p>
            <strong>Статус кухни:</strong> {getKitchenStatusLabel(order)}
          </p>
          <p>
            <strong>Статус сборки:</strong> {getAssemblyStatusLabel(order)}
          </p>
        </div>

        {!!groupedKitchenItems.length && (
          <div className='item-group kitchen'>
            <div className='item-group__title'>Позиции кухни</div>

            <div className='kitchen-state-line'>
              <span
                className={`kitchen-state-badge ${
                  order.kitchen_status === 'ready'
                    ? 'ready'
                    : order.kitchen_status === 'preparing'
                    ? 'preparing'
                    : 'new'
                }`}
              >
                {getKitchenQueueLabel(order)}
              </span>
            </div>

            <div className='order-items'>
              {groupedKitchenItems.map((item) => (
                <div
                  key={`${order.id}-k-group-${item.id}`}
                  className={`order-item-line kitchen-preview-line ${
                    kitchenReady ? 'done' : 'pending'
                  }`}
                >
                  <span>{item.title}</span>
                  <strong>x{item.quantity}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {!!groupedAssemblyItems.length && (
          <div className='item-group assembly'>
            <div className='item-group__title'>Позиции сборки</div>

            <div className='order-items'>
              {groupedAssemblyItems.map((item) => {
                const checkedCount = getItemCheckedCount(
                  order,
                  item.id,
                  item.quantity
                )

                const completed = checkedCount >= item.quantity

                return (
                  <div
                    key={`${order.id}-a-group-${item.id}`}
                    className={`assembly-progress-line ${
                      completed ? 'completed' : ''
                    }`}
                  >
                    <div className='assembly-progress-line__info'>
                      <span>{item.title}</span>
                      <strong>
                        {checkedCount}/{item.quantity}
                      </strong>
                    </div>

                    <div className='assembly-progress-line__actions'>
                      <button
                        type='button'
                        className='qty-action minus'
                        onClick={() =>
                          handleRemoveOneAssemblyUnit(order, item.id, item.quantity)
                        }
                        disabled={!kitchenReady || !checkedCount || isReadyAssemblyOrder}
                      >
                        −
                      </button>

                      <button
                        type='button'
                        className='qty-action plus'
                        onClick={() =>
                          handleAddOneAssemblyUnit(order, item.id, item.quantity)
                        }
                        disabled={
                          !kitchenReady ||
                          checkedCount >= item.quantity ||
                          isReadyAssemblyOrder
                        }
                      >
                        +1
                      </button>

                      <button
                        type='button'
                        className='qty-action complete'
                        onClick={() =>
                          handleCompleteAssemblyItem(order, item.id, item.quantity)
                        }
                        disabled={!kitchenReady || completed || isReadyAssemblyOrder}
                      >
                        Всё
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {order.comment && <div className='comment-box'>💬 {order.comment}</div>}

        <div className='action-row'>
          {isNewAssemblyOrder && (
            <button
              type='button'
              className='primary-btn'
              onClick={() => handleAssemblyStart(order)}
            >
              {kitchenReady ? 'Собрать' : 'Подготовка'}
            </button>
          )}

          {isPreparingAssemblyOrder && (
            <button
              type='button'
              className='success-btn'
              onClick={() => handleAssemblyReady(order)}
              disabled={!allAssemblyChecked(order) || !kitchenReady}
            >
              Готово
            </button>
          )}

          {isReadyAssemblyOrder && (
            <button type='button' className='ready-btn' disabled>
              Сборка завершена
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='monitor-page assembly-theme'>
      <div className='page-header'>
        <div>
          <h1>Монитор сборки</h1>
          <p>На сборке отображается весь заказ: позиции кухни и сборки</p>
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
              <div className='empty-box'>Новых заказов на сборку нет</div>
            ) : (
              newOrders.map(renderOrderCard)
            )}
          </div>
        </div>

        <div className='monitor-column'>
          <div className='column-title preparing-col'>
            <h3>Собираются</h3>
            <span>{preparingOrders.length}</span>
          </div>

          <div className='orders-stack'>
            {loading ? (
              <div className='empty-box'>Загрузка...</div>
            ) : preparingOrders.length === 0 ? (
              <div className='empty-box'>Заказов в сборке нет</div>
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

export default AssemblyMonitor