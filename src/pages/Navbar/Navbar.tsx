import React from "react"
import { NavLink } from "react-router-dom"
import "./monitor.scss"

const Navbar = () => {
	return (
		<header className="monitor-navbar">
			<div className="monitor-navbar__brand">
				<h2>Taco Go POS</h2>
				<p>Система заказов</p>
			</div>

			<nav className="monitor-navbar__links">
				<NavLink to="/cashier">Кассир</NavLink>
				<NavLink to="/kitchen">Кухня</NavLink>
				<NavLink to="/hall">Монитор зала</NavLink>
				<NavLink to="/history">История</NavLink>
			</nav>
		</header>
	)
}

export default Navbar