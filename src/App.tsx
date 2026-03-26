/** @format */

import { Route, Routes } from "react-router-dom"
import "./App.css"
import Cart from "./components/Cart/cart.jsx"
import Footer from "./components/Footer/footer"
import Header from "./components/Header/Header"
// ИСПРАВЛЕНО: Импортируем именно компонент истории, а не Header
import History from "./components/History/History" 
import Home from "./Pages/Home/Home/Home"
import Reviews from "./Pages/Reviews/Reviews"
import Sales from "./Pages/Sales/Sales"
import { OrderAddress } from "./Pages/OrderAddress/OrderAddress"
import { OrderPage } from "./Pages/OrderPage/OrderPage"
import Admin from "./admin/Admin"
import Kitchen from "./components/Kitchen/Kitchen" 

function App() {
	return (
		<>
			<Header />
			<Cart />
			<Routes>
				<Route path="/" element={<Home />} />
				<Route path="/sales" element={<Sales />} />
				<Route path="/reviews" element={<Reviews />} />
				<Route path="/address" element={<OrderAddress/>} />
				<Route path="/order" element={<OrderPage/>} />
				<Route path="/admin" element={<Admin/>} />
				
				{/* МАРШРУТ ДЛЯ КУХНИ */}
				<Route path="/kitchen" element={<Kitchen />} /> 
				
				{/* МАРШРУТ ДЛЯ ИСТОРИИ ЗАКАЗОВ */}
				<Route path="/history" element={<History/>} />
				
			</Routes>
			
			<Footer />
		</>
	)
}

export default App
