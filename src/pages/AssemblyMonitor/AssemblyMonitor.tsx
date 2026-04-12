import { useMemo } from 'react'
import { useOrders } from '../../hooks/useOrders'
import { updateOrderWorkflow } from '../../api/orders'
import '../Navbar/monitor.scss'
import { IMenuItem, IOrderRow } from '../../types/order'
import { getDailyOrderNumber } from '../../utils/orderNumber'

type TGroupedItem = {
  id: string
  title: string
  quantity: number
  source: 'kitchen' | 'assembly'
}

type TEffectiveAssemblyStatus =
  | 'waiting'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'skipped'

const AssemblyMonitor = () => {
  const { orders = [], loading, error } = useOrders()

  const getDaySequence = (targetOrder: IOrderRow) => {
    if (targetOrder.daily_order_number) {
      return String(targetOrder.daily_order_number).padStart(3, '0')
    }

    return getDailyOrderNumber(targetOrder, orders || [])
  }

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

  const groupItems = (
    items: IMenuItem[],
    source: 'kitchen' | 'assembly'
  ): TGroupedItem[] => {
    const map = new Map<string, TGroupedItem>()

    items.forEach((item) => {
      const qty = item.quantity || 1
      const key = `${source}:${item.id}`
      const existing = map.get(key)

      if (existing) {
        existing.quantity += qty
      } else {
        map.set(key, {
          id: item.id,
          title: item.title,
          quantity: qty,
          source,
        })
      }
    })

    return Array.from(map.values())
  }

  const getGroupedKitchenItems = (order: IOrderRow): TGroupedItem[] => {
    return groupItems(getKitchenItems(order), 'kitchen')
  }

  const getGroupedAssemblyItems = (order: IOrderRow): TGroupedItem[] => {
    return groupItems(getAssemblyItems(order), 'assembly')
  }

  const isKitchenReady = (order: IOrderRow) => {
    const kitchenItems = getKitchenItems(order)

    if (!kitchenItems.length) return true

    return order.kitchen_status === 'ready' || order.kitchen_status === 'skipped'
  }

  const getProgressUnitKey = (
    source: 'kitchen' | 'assembly',
    itemId: string,
    index: number
  ) => {
    return `${source}:${itemId}-${index}`
  }

  const getAllProgressKeys = (order: IOrderRow) => {
    const kitchen = getGroupedKitchenItems(order)
    const assembly = getGroupedAssemblyItems(order)
    const allItems = [...kitchen, ...assembly]

    return allItems.flatMap((item) =>
      Array.from({ length: item.quantity }, (_, index) =>
        getProgressUnitKey(item.source, item.id, index)
      )
    )
  }

  const getItemCheckedCount = (order: IOrderRow, item: TGroupedItem) => {
    const progress = order.assembly_progress || []

    return Array.from({ length: item.quantity }, (_, index) =>
      getProgressUnitKey(item.source, item.id, index)
    ).filter((key) => progress.includes(key)).length
  }

  const allItemsChecked = (order: IOrderRow) => {
    const allKeys = getAllProgressKeys(order)
    const progress = order.assembly_progress || []

    if (!allKeys.length) return true

    return allKeys.every((key) => progress.includes(key))
  }

  const getEffectiveAssemblyStatus = (
    order: IOrderRow
  ): TEffectiveAssemblyStatus => {
    const rawStatus = order.assembly_status as
      | TEffectiveAssemblyStatus
      | undefined
    const kitchenReady = isKitchenReady(order)
    const isComplete = allItemsChecked(order)

    if (rawStatus === 'skipped') return 'skipped'

    if (!kitchenReady) {
      return 'waiting'
    }

    if (rawStatus === 'ready' && !isComplete) {
      return 'preparing'
    }

    if (rawStatus === 'waiting') {
      return 'new'
    }

    if (rawStatus === 'ready' && isComplete) {
      return 'ready'
    }

    if (rawStatus === 'preparing') {
      return 'preparing'
    }

    return 'new'
  }

  const getKitchenStatusLabel = (order: IOrderRow) => {
    const kitchenItems = getKitchenItems(order)

    if (!kitchenItems.length) return 'Не требуется'

    if (order.kitchen_status === 'ready') return 'Готово'
    if (order.kitchen_status === 'preparing') return 'Готовится'
    if (order.kitchen_status === 'new') return 'Новый'
    if (order.kitchen_status === 'skipped') return 'Пропущено'
    return 'Неизвестно'
  }

  const getAssemblyStatusLabel = (order: IOrderRow) => {
    const effectiveStatus = getEffectiveAssemblyStatus(order)

    if (effectiveStatus === 'ready') return 'Готово'
    if (effectiveStatus === 'preparing') return 'Собирается'
    if (effectiveStatus === 'new') return 'Собрать'
    if (effectiveStatus === 'waiting') return 'Ожидает кухню'
    if (effectiveStatus === 'skipped') return 'Пропущено'

    return 'Ожидает кухню'
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

  const updateAssemblyProgress = async (
    order: IOrderRow,
    nextProgress: string[]
  ) => {
    await updateOrderWorkflow(order.id, {
      assembly_progress: nextProgress,
      assembly_status: 'preparing',
    })
  }

  const handleAssemblyStart = async (order: IOrderRow) => {
    try {
      if (!isKitchenReady(order)) {
        alert('Сначала дождитесь завершения кухни')
        return
      }

      await updateOrderWorkflow(order.id, {
        assembly_status: 'preparing',
      })
    } catch (err) {
      console.error('Ошибка начала сборки:', err)
      alert('Не удалось начать сборку')
    }
  }

  const handleAddOneUnit = async (order: IOrderRow, item: TGroupedItem) => {
    try {
      const effectiveStatus = getEffectiveAssemblyStatus(order)

      if (!isKitchenReady(order) || effectiveStatus === 'ready') return

      const current = order.assembly_progress || []

      const nextIndex = Array.from(
        { length: item.quantity },
        (_, index) => index
      ).find(
        (index) =>
          !current.includes(getProgressUnitKey(item.source, item.id, index))
      )

      if (nextIndex === undefined) return

      const nextProgress = [
        ...current,
        getProgressUnitKey(item.source, item.id, nextIndex),
      ]

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка добавления позиции:', err)
      alert('Не удалось обновить сборку')
    }
  }

  const handleRemoveOneUnit = async (order: IOrderRow, item: TGroupedItem) => {
    try {
      const effectiveStatus = getEffectiveAssemblyStatus(order)

      if (!isKitchenReady(order) || effectiveStatus === 'ready') return

      const current = order.assembly_progress || []

      const checkedIndexes = Array.from(
        { length: item.quantity },
        (_, index) => index
      ).filter((index) =>
        current.includes(getProgressUnitKey(item.source, item.id, index))
      )

      const lastCheckedIndex = checkedIndexes[checkedIndexes.length - 1]
      if (lastCheckedIndex === undefined) return

      const nextProgress = current.filter(
        (key) =>
          key !== getProgressUnitKey(item.source, item.id, lastCheckedIndex)
      )

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка удаления позиции:', err)
      alert('Не удалось изменить сборку')
    }
  }

  const handleCompleteItem = async (order: IOrderRow, item: TGroupedItem) => {
    try {
      const effectiveStatus = getEffectiveAssemblyStatus(order)

      if (!isKitchenReady(order) || effectiveStatus === 'ready') return

      const current = order.assembly_progress || []

      const keysToAdd = Array.from({ length: item.quantity }, (_, index) =>
        getProgressUnitKey(item.source, item.id, index)
      )

      const nextProgress = Array.from(new Set([...current, ...keysToAdd]))

      await updateAssemblyProgress(order, nextProgress)
    } catch (err) {
      console.error('Ошибка полного завершения позиции:', err)
      alert('Не удалось полностью отметить позицию')
    }
  }

  const handleAssemblyReady = async (order: IOrderRow) => {
    try {
      if (!isKitchenReady(order)) {
        alert('Сначала дождитесь завершения кухни')
        return
      }

      if (!allItemsChecked(order)) {
        alert('Сначала всё отметьте')
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

  const assemblyRelevantOrders = useMemo(() => {
    return (orders || [])
      .filter((order) => {
        const items = Array.isArray(order.items) ? order.items : []
        if (!items.length) return false

        const hasAssemblyItems = getAssemblyItems(order).length > 0
        if (!hasAssemblyItems) return false

        const isAcceptedByCashier =
          order.source === 'cashier' || order.cashier_status === 'new'

        if (!isAcceptedByCashier) return false

        const effectiveStatus = getEffectiveAssemblyStatus(order)

        return (
          effectiveStatus === 'waiting' ||
          effectiveStatus === 'new' ||
          effectiveStatus === 'preparing' ||
          effectiveStatus === 'ready'
        )
      })
      .sort((a, b) => {
        const priorityMap: Record<TEffectiveAssemblyStatus, number> = {
          waiting: 4,
          new: 3,
          preparing: 2,
          ready: 1,
          skipped: 0,
        }

        const aPriority = priorityMap[getEffectiveAssemblyStatus(a)] || 0
        const bPriority = priorityMap[getEffectiveAssemblyStatus(b)] || 0

        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }

        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
        return bTime - aTime
      })
  }, [orders])

  const newOrders = useMemo(
    () =>
      assemblyRelevantOrders.filter((order) => {
        const effectiveStatus = getEffectiveAssemblyStatus(order)
        return effectiveStatus === 'waiting' || effectiveStatus === 'new'
      }),
    [assemblyRelevantOrders]
  )

  const preparingOrders = useMemo(
    () =>
      assemblyRelevantOrders.filter(
        (order) => getEffectiveAssemblyStatus(order) === 'preparing'
      ),
    [assemblyRelevantOrders]
  )

  const readyOrders = useMemo(
    () =>
      assemblyRelevantOrders.filter(
        (order) => getEffectiveAssemblyStatus(order) === 'ready'
      ),
    [assemblyRelevantOrders]
  )

  const renderProgressBlock = (
    order: IOrderRow,
    items: TGroupedItem[],
    title: string,
    blockClass: string,
    isReadyAssemblyOrder: boolean,
    kitchenReady: boolean
  ) => {
    if (!items.length) return null

    return (
      <div className={`item-group ${blockClass}`}>
        <div className='item-group__title'>{title}</div>

        <div className='order-items'>
          {items.map((item) => {
            const checkedCount = getItemCheckedCount(order, item)
            const completed = checkedCount >= item.quantity

            return (
              <div
                key={`${order.id}-${item.source}-${item.id}`}
                className={`assembly-progress-line ${completed ? 'completed' : ''}`}
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
                    onClick={() => handleRemoveOneUnit(order, item)}
                    disabled={!kitchenReady || !checkedCount || isReadyAssemblyOrder}
                  >
                    −
                  </button>

                  <button
                    type='button'
                    className='qty-action plus'
                    onClick={() => handleAddOneUnit(order, item)}
                    disabled={
                      !kitchenReady ||
                      checkedCount >= item.quantity ||
                      isReadyAssemblyOrder
                    }
                  >
                    +
                  </button>

                  <button
                    type='button'
                    className='qty-action complete'
                    onClick={() => handleCompleteItem(order, item)}
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
    )
  }

  const renderOrderCard = (order: IOrderRow) => {
    const groupedKitchenItems = getGroupedKitchenItems(order)
    const groupedAssemblyItems = getGroupedAssemblyItems(order)

    const kitchenReady = isKitchenReady(order)
    const effectiveStatus = getEffectiveAssemblyStatus(order)

    const isWaitingAssemblyOrder = effectiveStatus === 'waiting'
    const isNewAssemblyOrder = effectiveStatus === 'new'
    const isPreparingAssemblyOrder = effectiveStatus === 'preparing'
    const isReadyAssemblyOrder = effectiveStatus === 'ready'

    return (
      <div
        className={`order-card assembly-card ${
          isWaitingAssemblyOrder ? 'order-card--waiting' : ''
        } ${isNewAssemblyOrder ? 'order-card--new-attention' : ''} ${
          isPreparingAssemblyOrder ? 'order-card--preparing' : ''
        } ${isReadyAssemblyOrder ? 'order-card--ready' : ''}`}
        key={order.id}
      >
        <div className='order-card__header'>
          <div>
            <h2>Заказ №{getDaySequence(order)}</h2>
            <p className='order-card__time'>
              Время: {formatOrderTime(order.created_at)}
            </p>
          </div>

          <div className='badge-row'>
            {isWaitingAssemblyOrder && (
              <span className='status-badge waiting'>Ожидает кухню</span>
            )}

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
              className={`status-badge ${kitchenReady ? 'ready' : 'preparing'}`}
            >
              {groupedKitchenItems.length
                ? kitchenReady
                  ? 'Кухня готова'
                  : 'Кухня готовит'
                : 'Кухня не нужна'}
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

        {renderProgressBlock(
          order,
          groupedKitchenItems,
          'Позиции кухни',
          'kitchen',
          isReadyAssemblyOrder,
          kitchenReady
        )}

        {renderProgressBlock(
          order,
          groupedAssemblyItems,
          'Позиции сборки',
          'assembly',
          isReadyAssemblyOrder,
          kitchenReady
        )}

        {order.comment && <div className='comment-box'>💬 {order.comment}</div>}

        <div className='action-row'>
          {isWaitingAssemblyOrder && (
            <button type='button' className='primary-btn' disabled>
              Ждать кухню
            </button>
          )}

          {isNewAssemblyOrder && (
            <button
              type='button'
              className='primary-btn'
              onClick={() => handleAssemblyStart(order)}
              disabled={!kitchenReady}
            >
              {kitchenReady ? 'Собрать' : 'Ждать кухню'}
            </button>
          )}

          {isPreparingAssemblyOrder && (
            <button
              type='button'
              className='success-btn'
              onClick={() => handleAssemblyReady(order)}
              disabled={!allItemsChecked(order) || !kitchenReady}
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
          <p>Позициялар бирден белгиленип, анан гана заказ готов болот</p>
        </div>
      </div>

      {error && <div className='error-box'>{error}</div>}

      <div className='monitor-columns three-columns'>
        <div className='monitor-column'>
          <div className='column-title new-col'>
            <h3>Новые / Ожидают</h3>
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