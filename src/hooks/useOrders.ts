import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { fetchActiveOrders, fetchHistoryOrders } from "../api/orders"
import { IOrderRow } from "../types/order"

export const useOrders = () => {
	const [orders, setOrders] = useState<IOrderRow[]>([])
	const [history, setHistory] = useState<IOrderRow[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState("")

	useEffect(() => {
		let mounted = true

		const loadInitial = async () => {
			try {
				setLoading(true)
				const [activeData, historyData] = await Promise.all([
					fetchActiveOrders(),
					fetchHistoryOrders(),
				])

				if (!mounted) return
				setOrders(activeData)
				setHistory(historyData)
				setError("")
			} catch (e: any) {
				if (!mounted) return
				setError(e.message || "Ошибка загрузки заказов")
			} finally {
				if (mounted) setLoading(false)
			}
		}

		loadInitial()

		const channel = supabase
			.channel("orders-realtime-fast")
			.on(
				"postgres_changes",
				{ event: "INSERT", schema: "public", table: "orders" },
				(payload: any) => {
					const row = payload.new as IOrderRow
					if (!mounted) return

					if (row.status === "completed") {
						setHistory((prev) => [row, ...prev])
					} else {
						setOrders((prev) => [row, ...prev])
					}
				}
			)
			.on(
				"postgres_changes",
				{ event: "UPDATE", schema: "public", table: "orders" },
				(payload: any) => {
					const row = payload.new as IOrderRow
					if (!mounted) return

					if (row.status === "completed") {
						setOrders((prev) => prev.filter((item) => item.id !== row.id))
						setHistory((prev) => {
							const filtered = prev.filter((item) => item.id !== row.id)
							return [row, ...filtered]
						})
					} else {
						setOrders((prev) => {
							const exists = prev.some((item) => item.id === row.id)
							if (exists) {
								return prev.map((item) => (item.id === row.id ? row : item))
							}
							return [row, ...prev]
						})
					}
				}
			)
			.on(
				"postgres_changes",
				{ event: "DELETE", schema: "public", table: "orders" },
				(payload: any) => {
					const row = payload.old as IOrderRow
					if (!mounted) return
					setOrders((prev) => prev.filter((item) => item.id !== row.id))
					setHistory((prev) => prev.filter((item) => item.id !== row.id))
				}
			)
			.subscribe()

		return () => {
			mounted = false
			supabase.removeChannel(channel)
		}
	}, [])

	return { orders, history, loading, error }
}