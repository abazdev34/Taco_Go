import { useEffect, useState } from 'react'
import { fetchHistoryOrders } from '../api/orders'
import { IOrderRow } from '../types/order'
import { supabase } from '../lib/supabase'

function sortHistory(list: IOrderRow[]) {
  return [...list].sort((a, b) => {
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })
}

export function useOrderHistory() {
  const [history, setHistory] = useState<IOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const data = await fetchHistoryOrders()

        if (!mounted) return

        setHistory(sortHistory(Array.isArray(data) ? data : []))
      } catch (err: any) {
        console.error('LOAD ORDER HISTORY ERROR:', err)

        if (!mounted) return

        setError(err?.message || 'Не удалось загрузить историю заказов')
        setHistory([])
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    const channel = supabase
      .channel('orders-history-realtime')
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

          setHistory((prev) => {
            let next = Array.isArray(prev) ? [...prev] : []

            if (eventType === 'INSERT' && newRow) {
              if (newRow.status !== 'completed') return next

              const index = next.findIndex((item) => item.id === newRow.id)

              if (index >= 0) {
                next[index] = newRow
              } else {
                next.unshift(newRow)
              }
            }

            if (eventType === 'UPDATE' && newRow) {
              const index = next.findIndex((item) => item.id === newRow.id)

              if (newRow.status === 'completed') {
                if (index >= 0) {
                  next[index] = newRow
                } else {
                  next.unshift(newRow)
                }
              } else {
                next = next.filter((item) => item.id !== newRow.id)
              }
            }

            if (eventType === 'DELETE' && oldRow?.id) {
              next = next.filter((item) => item.id !== oldRow.id)
            }

            return sortHistory(next)
          })
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { history, loading, error, setHistory }
}