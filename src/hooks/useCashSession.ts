import { useCallback, useEffect, useState } from 'react'
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

	const loadSession = useCallback(async () => {
		try {
			setLoading(true)
			setError('')
			const data = await fetchOpenCashSession()
			setSession(data)
		} catch (e: any) {
			console.error('LOAD CASH SESSION ERROR:', e)
			setError(e?.message || 'Не удалось загрузить смену')
		} finally {
			setLoading(false)
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
		loadSession()

		const channel = supabase
			.channel('cash-sessions-realtime')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cash_sessions',
				},
				() => {
					loadSession()
				}
			)
			.subscribe()

		return () => {
			supabase.removeChannel(channel)
		}
	}, [loadSession])

	return {
		session,
		loading,
		error,
		refetch: loadSession,
		openSession,
		closeSession,
	}
}