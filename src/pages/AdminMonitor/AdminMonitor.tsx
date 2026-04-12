import { useState } from 'react'
import { IOrderRow } from '../../types/order'
import { formatPrice } from '../../utils/currency'
import {
  updateOrderWorkflow,
  updateOrderComment,
} from '../../api/orders'

type Props = {
  orders: IOrderRow[]
  refresh: () => void
}

const AdminMonitor = ({ orders, refresh }: Props) => {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [commentValue, setCommentValue] = useState('')

  const handleStatus = async (
    order: IOrderRow,
    status: IOrderRow['status']
  ) => {
    try {
      await updateOrderWorkflow(order.id, { status })
      refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  const handleSaveComment = async (id: string) => {
    try {
      await updateOrderComment(id, commentValue)
      setEditingCommentId(null)
      setCommentValue('')
      refresh()
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className='monitor-page'>
      <h1>Админ панель</h1>

      {orders.map((order) => (
        <div key={order.id} className='order-card'>
          <div className='order-header'>
            <h3>
              Заказ №{' '}
              {String(order.order_number || 0).padStart(3, '0')}
            </h3>

            <span>{formatPrice(order.total)}</span>
          </div>

          {/* ITEMS */}
          <div className='order-items'>
            {(order.items || []).map((item, i) => (
              <div key={i}>
                {item.title} × {item.quantity}
              </div>
            ))}
          </div>

          {/* COMMENT */}
          <div className='order-comment'>
            {editingCommentId === order.id ? (
              <>
                <input
                  value={commentValue}
                  onChange={(e) => setCommentValue(e.target.value)}
                />
                <button onClick={() => handleSaveComment(order.id)}>
                  Сохранить
                </button>
              </>
            ) : (
              <>
                <p>{order.comment || 'Нет комментария'}</p>
                <button
                  onClick={() => {
                    setEditingCommentId(order.id)
                    setCommentValue(order.comment || '')
                  }}
                >
                  ✏️
                </button>
              </>
            )}
          </div>

          {/* STATUS BUTTONS */}
          <div className='order-actions'>
            <button onClick={() => handleStatus(order, 'new')}>
              Новый
            </button>

            <button onClick={() => handleStatus(order, 'preparing')}>
              Готовится
            </button>

            <button onClick={() => handleStatus(order, 'ready')}>
              Готов
            </button>

            <button onClick={() => handleStatus(order, 'completed')}>
              Выдан
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default AdminMonitor