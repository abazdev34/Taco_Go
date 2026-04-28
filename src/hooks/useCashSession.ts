import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  closeCashSession,
  fetchOpenCashSession,
  openCashSession,
  type ICashSessionRow,
  type TCloseCashSessionPayload,
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

        const current = await fetchOpenCashSession()
        if (current?.id) {
          setSession(current)
          return current
        }

        const created = await openCashSession({
          opened_by: openedBy || 'Кассир',
          opening_balance: Number(openingBalance || 0),
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
    async (id: string, payload: TCloseCashSessionPayload) => {
      try {
        setError('')

        if (!id) {
          throw new Error('Активная смена не найдена')
        }

        const closed = await closeCashSession(id, payload)
        setSession(null)
        return closed
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
        { event: '*', schema: 'public', table: 'cash_sessions' },
        payload => {
          const next = payload.new as ICashSessionRow | null
          const oldRow = payload.old as ICashSessionRow | null

          if (payload.eventType === 'DELETE') {
            setSession(prev => (prev?.id === oldRow?.id ? null : prev))
            return
          }

          if (!next) return

          if (next.closed_at) {
            setSession(prev => (prev?.id === next.id ? null : prev))
            return
          }

          setSession(next)
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