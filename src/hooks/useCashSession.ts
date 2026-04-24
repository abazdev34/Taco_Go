import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  closeCashSession,
  fetchOpenCashSession,
  openCashSession,
  type ICashSessionRow,
} from '../api/cashSessions'

export const useCashSession = () => {
  const [session, setSession] = useState<ICashSessionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const mountedRef = useRef(false)

  const loadSession = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      setError('')

      const data = await fetchOpenCashSession()

      if (!mountedRef.current) return
      setSession(data)
    } catch (e: any) {
      if (!mountedRef.current) return
      console.error('LOAD CASH SESSION ERROR:', e)
      setError(e?.message || 'Не удалось загрузить смену')
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  const openSession = useCallback(
    async (openedBy: string, openingBalance: number) => {
      try {
        setError('')

        const created = await openCashSession({
          opened_by: openedBy,
          opening_balance: openingBalance,
        })

        setSession(created)
        return created
      } catch (e: any) {
        console.error('OPEN CASH SESSION ERROR:', e)
        setError(e?.message || 'Не удалось открыть смену')
        throw e
      }
    },
    []
  )

  const closeSession = useCallback(
    async (
      id: string,
      payload: {
        closed_by: string
        closing_balance: number
        total_orders: number
        total_cash: number
        total_online: number
        total_in: number
        total_out: number
      }
    ) => {
      try {
        setError('')
        await closeCashSession(id, payload)
        setSession(null)
      } catch (e: any) {
        console.error('CLOSE CASH SESSION ERROR:', e)
        setError(e?.message || 'Не удалось закрыть смену')
        throw e
      }
    },
    []
  )

  useEffect(() => {
    mountedRef.current = true

    void loadSession(true)

    const channel = supabase
      .channel('cash-sessions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cash_sessions',
        },
        payload => {
          const next = payload.new as ICashSessionRow
          if (next?.closed_at) return
          setSession(next)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cash_sessions',
        },
        payload => {
          const next = payload.new as ICashSessionRow
          if (next?.closed_at) {
            setSession(null)
            return
          }
          setSession(next)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cash_sessions',
        },
        payload => {
          const oldRow = payload.old as ICashSessionRow
          setSession(prev => (prev?.id === oldRow?.id ? null : prev))
        }
      )
      .subscribe()

    return () => {
      mountedRef.current = false
      void supabase.removeChannel(channel)
    }
  }, [loadSession])

  return {
    session,
    loading,
    error,
    refetch: () => loadSession(true),
    openSession,
    closeSession,
  }
}