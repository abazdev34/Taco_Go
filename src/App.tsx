import React from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import CashierMonitor from "./pages/CashierMonitor/CashierMonitor"
import KitchenMonitor from "./pages/KitchenMonitor/KitchenMonitor"
import HallMonitor from "./pages/HallMonitor/HallMonitor"
import HistoryMonitor from "./pages/HistoryMonitor/HistoryMonitor"

const App = () => {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="/cashier" replace />} />
			<Route path="/cashier" element={<CashierMonitor />} />
			<Route path="/kitchen" element={<KitchenMonitor />} />
			<Route path="/hall" element={<HallMonitor />} />
			<Route path="/history" element={<HistoryMonitor />} />
		</Routes>
	)
}

export default App