import { useEffect, useState } from 'react'
import { fetchOrders } from '../api/orders'
import { IOrderRow } from '../types/order'
import { supabase } from '../lib/supabase'

export function useAllOrders() {
  const [orders, setOrders] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchOrders()

        if (mounted) {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (err: any) {
        console.error('LOAD ALL ORDERS ERROR:', err)

        if (mounted) {
          setError(err?.message || 'Не удалось загрузить заказы')
          setOrders([])
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    const channel = supabase
      .channel(`orders-all-realtime-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (!mounted) return

          const eventType = payload.eventType
          const newRow = payload.new as IOrderRow | undefined
          const oldRow = payload.old as IOrderRow | undefined

          setOrders((prev) => {
            let next = Array.isArray(prev) ? [...prev] : []

            if ((eventType === 'INSERT' || eventType === 'UPDATE') && newRow) {
              const exists = next.some((item) => item.id === newRow.id)

              if (exists) {
                next = next.map((item) =>
                  item.id === newRow.id ? newRow : item
                )
              } else {
                next = [newRow, ...next]
              }
            }

            if (eventType === 'DELETE' && oldRow) {
              next = next.filter((item) => item.id !== oldRow.id)
            }

            return next.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { orders, loading, error }
}