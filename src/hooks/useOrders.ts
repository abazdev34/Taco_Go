import { useEffect, useRef, useState } from 'react'
import { fetchActiveOrders } from '../api/orders'
import { supabase } from '../lib/supabase'
import { IOrderRow } from '../types/order'

const ACTIVE_STATUSES = ['pending', 'new', 'preparing', 'ready']
const MAX_ACTIVE_ORDERS = 200

function getOrderTime(order: IOrderRow) {
  const raw = order?.updated_at || order?.created_at || ''
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function isActiveOrder(order?: IOrderRow | null) {
  return !!order?.id && ACTIVE_STATUSES.includes(String(order.status || ''))
}

function mergeOrder(oldOrder: IOrderRow, newOrder: IOrderRow): IOrderRow {
  return {
    ...oldOrder,
    ...newOrder,
    items:
      Array.isArray(newOrder.items) && newOrder.items.length > 0
        ? newOrder.items
        : oldOrder.items,
    assembly_progress: Array.isArray(newOrder.assembly_progress)
      ? newOrder.assembly_progress
      : oldOrder.assembly_progress,
  }
}

function sortOrders(list: IOrderRow[]) {
  return [...list].sort((a, b) => {
    const bTime = getOrderTime(b)
    const aTime = getOrderTime(a)

    if (bTime !== aTime) return bTime - aTime

    return (
      Number(b.daily_order_number || b.order_number || 0) -
      Number(a.daily_order_number || a.order_number || 0)
    )
  })
}

function normalizeOrders(list: IOrderRow[]) {
  const map = new Map<string, IOrderRow>()

  for (const order of list) {
    if (!isActiveOrder(order)) continue

    const existing = map.get(order.id)
    map.set(order.id, existing ? mergeOrder(existing, order) : order)
  }

  return sortOrders(Array.from(map.values())).slice(0, MAX_ACTIVE_ORDERS)
}

function upsertOrder(prev: IOrderRow[], incoming: IOrderRow) {
  if (!isActiveOrder(incoming)) {
    return prev.filter(order => order.id !== incoming.id)
  }

  const index = prev.findIndex(order => order.id === incoming.id)

  if (index === -1) {
    return normalizeOrders([incoming, ...prev])
  }

  const next = [...prev]
  next[index] = mergeOrder(next[index], incoming)

  return normalizeOrders(next)
}

function removeOrder(prev: IOrderRow[], id?: string) {
  if (!id) return prev
  return prev.filter(order => order.id !== id)
}

export function useOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchActiveOrders()

        if (!mountedRef.current) return

        setOrders(normalizeOrders(Array.isArray(data) ? data : []))
      } catch (e: any) {
        console.error('LOAD ACTIVE ORDERS ERROR:', e)

        if (!mountedRef.current) return

        setError(e?.message || 'Не удалось загрузить заказы')
        setOrders([])
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    void load()

    const channel = supabase
      .channel('orders-active-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        payload => {
          if (!mountedRef.current) return

          const newRow = payload.new as IOrderRow | undefined
          const oldRow = payload.old as IOrderRow | undefined

          setOrders(prev => {
            if (payload.eventType === 'INSERT' && newRow) {
              return upsertOrder(prev, newRow)
            }

            if (payload.eventType === 'UPDATE' && newRow) {
              return upsertOrder(prev, newRow)
            }

            if (payload.eventType === 'DELETE') {
              return removeOrder(prev, oldRow?.id)
            }

            return prev
          })
        }
      )
      .subscribe(status => {
        if (!mountedRef.current) return

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Ошибка realtime соединения')
        }
      })

    return () => {
      mountedRef.current = false
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