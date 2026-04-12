import { useEffect, useState } from 'react'
import { fetchOrders } from '../api/orders'
import { IOrderRow } from '../types/order'
import { supabase } from '../lib/supabase'

function getOrderTime(order: IOrderRow) {
  const raw = order?.created_at || order?.updated_at || ''
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function uniqueOrdersById(list: IOrderRow[]) {
  const map = new Map<string, IOrderRow>()

  for (const order of list) {
    if (!order?.id) continue

    const existing = map.get(order.id)

    if (!existing) {
      map.set(order.id, order)
      continue
    }

    const existingTime = getOrderTime(existing)
    const nextTime = getOrderTime(order)

    if (nextTime >= existingTime) {
      map.set(order.id, {
        ...existing,
        ...order,
      })
    }
  }

  return Array.from(map.values())
}

function sortOrders(list: IOrderRow[]) {
  return [...list].sort((a, b) => {
    const aTime = getOrderTime(a)
    const bTime = getOrderTime(b)

    if (aTime !== bTime) {
      return bTime - aTime
    }

    return Number(b?.order_number || 0) - Number(a?.order_number || 0)
  })
}

function normalizeOrders(list: IOrderRow[]) {
  return sortOrders(uniqueOrdersById(Array.isArray(list) ? list : []))
}

function upsertOrder(list: IOrderRow[], order: IOrderRow) {
  const next = [...list]
  const index = next.findIndex((item) => item.id === order.id)

  if (index === -1) {
    return normalizeOrders([order, ...next])
  }

  next[index] = {
    ...next[index],
    ...order,
  }

  return normalizeOrders(next)
}

function removeOrder(list: IOrderRow[], id?: string) {
  if (!id) return normalizeOrders(list)
  return normalizeOrders(list.filter((item) => item.id !== id))
}

export function useAllOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchOrders()

        if (!isMounted) return

        setOrders(normalizeOrders(Array.isArray(data) ? data : []))
      } catch (err: any) {
        console.error('LOAD ALL ORDERS ERROR:', err)

        if (!isMounted) return

        setError(err?.message || 'Не удалось загрузить заказы')
        setOrders([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void load()

    const channel = supabase
      .channel('orders-all-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (!isMounted) return

          const eventType = payload.eventType
          const newRow = payload.new as IOrderRow | undefined
          const oldRow = payload.old as IOrderRow | undefined

          setOrders((prev) => {
            const safePrev = Array.isArray(prev) ? prev : []

            if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow) {
              return upsertOrder(safePrev, newRow)
            }

            if (eventType === 'DELETE') {
              return removeOrder(safePrev, oldRow?.id)
            }

            return normalizeOrders(safePrev)
          })
        }
      )
      .subscribe((status) => {
        console.log('ALL ORDERS CHANNEL STATUS:', status)

        if (!isMounted) return

        if (status === 'CHANNEL_ERROR') {
          setError('Realtime connection error')
        }
      })

    return () => {
      isMounted = false
      void supabase.removeChannel(channel)
    }
  }, [])

  return {
    orders,
    loading,
    error,
    setOrders,
  }
}