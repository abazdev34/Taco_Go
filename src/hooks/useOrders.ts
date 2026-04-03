import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchActiveOrders, fetchHistoryOrders } from '../api/orders'
import { IOrderRow } from '../types/order'
import { subscribeOrderSync } from '../lib/orderSync'

const sortDesc = (rows: IOrderRow[]) =>
	[...rows].sort((a, b) => b.order_number - a.order_number)

export const useOrders = () => {
	const [orders, setOrders] = useState<IOrderRow[]>([])
	const [history, setHistory] = useState<IOrderRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const initializedRef = useRef(false)
	const pollingRef = useRef<number | null>(null)

	useEffect(() => {
		let mounted = true

		const loadAll = async (silent = false) => {
			try {
				if (!silent) setLoading(true)

				const [activeData, historyData] = await Promise.all([
					fetchActiveOrders(),
					fetchHistoryOrders(),
				])

				if (!mounted) return

				setOrders(sortDesc(activeData))
				setHistory(sortDesc(historyData))
				setError('')
				initializedRef.current = true
			} catch (e: any) {
				if (!mounted) return
				setError(e?.message || 'Ошибка загрузки заказов')
			} finally {
				if (mounted && !silent) setLoading(false)
			}
		}

		const mergeActive = (row: IOrderRow) => {
			setOrders((prev) => {
				const filtered = prev.filter((item) => item.id !== row.id)
				return sortDesc([row, ...filtered])
			})

			setHistory((prev) => prev.filter((item) => item.id !== row.id))
		}

		const moveToHistory = (row: IOrderRow) => {
			setOrders((prev) => prev.filter((item) => item.id !== row.id))

			setHistory((prev) => {
				const filtered = prev.filter((item) => item.id !== row.id)
				return sortDesc([row, ...filtered])
			})
		}

		const removeOrderEverywhere = (id: string) => {
			setOrders((prev) => prev.filter((item) => item.id !== id))
			setHistory((prev) => prev.filter((item) => item.id !== id))
		}

		loadAll()

		const unsubscribeSync = subscribeOrderSync((message) => {
			if (!mounted) return

			if (message.type === 'ORDER_CREATED') {
				if (message.payload.status === 'completed') {
					moveToHistory(message.payload)
				} else {
					mergeActive(message.payload)
				}
				return
			}

			if (message.type === 'ORDER_UPDATED') {
				if (message.payload.status === 'completed') {
					moveToHistory(message.payload)
				} else {
					mergeActive(message.payload)
				}
				return
			}

			if (message.type === 'ORDER_COMPLETED') {
				moveToHistory(message.payload)
			}
		})

		const channel = supabase
			.channel('orders-live-channel-hybrid')
			.on(
				'postgres_changes',
				{ event: 'INSERT', schema: 'public', table: 'orders' },
				(payload: any) => {
					if (!mounted || !initializedRef.current) return

					const row = payload.new as IOrderRow

					if (row.status === 'completed') {
						moveToHistory(row)
					} else {
						mergeActive(row)
					}
				}
			)
			.on(
				'postgres_changes',
				{ event: 'UPDATE', schema: 'public', table: 'orders' },
				(payload: any) => {
					if (!mounted || !initializedRef.current) return

					const row = payload.new as IOrderRow

					if (row.status === 'completed') {
						moveToHistory(row)
					} else {
						mergeActive(row)
					}
				}
			)
			.on(
				'postgres_changes',
				{ event: 'DELETE', schema: 'public', table: 'orders' },
				(payload: any) => {
					if (!mounted || !initializedRef.current) return

					const row = payload.old as IOrderRow
					removeOrderEverywhere(row.id)
				}
			)
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					setError('')
				}
			})

		pollingRef.current = window.setInterval(() => {
			loadAll(true)
		}, 3000)

		const onFocus = () => loadAll(true)

		const onVisibilityChange = () => {
			if (!document.hidden) {
				loadAll(true)
			}
		}

		window.addEventListener('focus', onFocus)
		document.addEventListener('visibilitychange', onVisibilityChange)

		return () => {
			mounted = false
			unsubscribeSync()
			supabase.removeChannel(channel)

			if (pollingRef.current) {
				window.clearInterval(pollingRef.current)
			}

			window.removeEventListener('focus', onFocus)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [])

	return {
		orders,
		history,
		loading,
		error,
		setOrders,
		setHistory,
	}
}