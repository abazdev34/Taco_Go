import React, { useEffect, useRef, useState } from "react"
import Navbar from "../Navbar/Navbar"
import "../Navbar/monitor.scss"
import { useOrders } from "../../hooks/useOrders"
import { isFullscreenActive, toggleFullscreen } from "../../utils/fullscreen"

const HallMonitor = () => {
	const { orders, loading, error } = useOrders()
	const [clock, setClock] = useState(new Date())
	const [isTvMode, setIsTvMode] = useState(false)
	const pageRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		const timer = setInterval(() => setClock(new Date()), 1000)
		return () => clearInterval(timer)
	}, [])

	useEffect(() => {
		const onChange = () => {
			setIsTvMode(isFullscreenActive())
		}

		document.addEventListener("fullscreenchange", onChange)
		return () => document.removeEventListener("fullscreenchange", onChange)
	}, [])

	const leftOrders = orders.filter(
		(order) => order.status === "new" || order.status === "preparing"
	)
	const readyOrders = orders.filter((order) => order.status === "ready")

	const handleToggleTvMode = async () => {
		await toggleFullscreen(pageRef.current)
		setIsTvMode(isFullscreenActive())
	}

	return (
		<div className="monitor-page hall-theme" ref={pageRef}>
			<Navbar />

			<div className="page-header">
				<div>
					<h1>Монитор зала</h1>
					<p>Заказы в работе и готовые к выдаче</p>
				</div>

				<div className="hall-header-actions">
					<div className="top-info-card">
						<span>Текущее время</span>
						<strong>
							{clock.toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
								second: "2-digit",
							})}
						</strong>
					</div>

					<button className="tv-mode-btn" onClick={handleToggleTvMode}>
						{isTvMode ? "Выйти из TV режима" : "TV режим"}
					</button>
				</div>
			</div>

			{error && <div className="error-box">{error}</div>}

			<div className="hall-split-layout">
				<div className="hall-side hall-side--left">
					<div className="split-title">
						<h2>В работе</h2>
						<span>{leftOrders.length}</span>
					</div>

					{loading ? (
						<div className="empty-monitor">
							<h2>Загрузка...</h2>
						</div>
					) : leftOrders.length === 0 ? (
						<div className="empty-monitor">
							<h2>Нет заказов в работе</h2>
						</div>
					) : (
						<div className="hall-monitor-grid compact">
							{leftOrders.map((order) => (
								<div className="hall-order-card" key={order.id}>
									<div className="hall-order-card__top">
										<h2>№ {order.order_number}</h2>
										<span className={`status-badge large ${order.status}`}>
											{order.status === "new" && "Новый"}
											{order.status === "preparing" && "Готовится"}
										</span>
									</div>

									<div className="hall-order-card__info">
										<p>Создан: {new Date(order.created_at).toLocaleTimeString()}</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="hall-side hall-side--right">
					<div className="split-title">
						<h2>Готовы</h2>
						<span>{readyOrders.length}</span>
					</div>

					{loading ? (
						<div className="empty-monitor">
							<h2>Загрузка...</h2>
						</div>
					) : readyOrders.length === 0 ? (
						<div className="empty-monitor">
							<h2>Нет готовых заказов</h2>
						</div>
					) : (
						<div className="hall-monitor-grid compact">
							{readyOrders.map((order) => (
								<div className="hall-order-card ready-highlight" key={order.id}>
									<div className="hall-order-card__top">
										<h2>№ {order.order_number}</h2>
										<span className="status-badge large ready">Готов</span>
									</div>

									<div className="hall-order-card__info">
										<p>Создан: {new Date(order.created_at).toLocaleTimeString()}</p>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default HallMonitor