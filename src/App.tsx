import { Link, Outlet, Route, Routes } from 'react-router-dom'

import CashierMonitor from './pages/CashierMonitor/CashierMonitor'
import ClientMonitor from './pages/ClientMonitor/ClientMonitor'
import HallMonitor from './pages/HallMonitor/HallMonitor'
import HistoryMonitor from './pages/HistoryMonitor/HistoryMonitor'
import KitchenMonitor from './pages/KitchenMonitor/KitchenMonitor'

import AdminDashboardPage from './pages/Admin/AdminDashboardPage'
import AdminLayout from './pages/Admin/AdminLayout'
import AdminOrdersPage from './pages/Admin/AdminOrdersPage'
import CategoriesPage from './pages/Admin/CategoriesPage'
import KitchenAssemblyPage from './pages/Admin/KitchenAssemblyPage'
import MenuItemsPage from './pages/Admin/MenuItemsPage'
import RolesPage from './pages/Admin/RolesPage'
import TechCardsPage from './pages/Admin/TechCardsPage'
import AdminCashMonitor from './pages/AdminCashMonitor/AdminCashMonitor'
import AssemblyMonitor from './pages/AssemblyMonitor/AssemblyMonitor'

function Layout() {
	return (
		<div>
			<nav style={styles.nav}>
				<Link style={styles.link} to='/'>
					Клиент
				</Link>
				<Link style={styles.link} to='/cashier'>
					Кассир
				</Link>
				<Link style={styles.link} to='/kitchen'>
					Кухня
				</Link>
				<Link style={styles.link} to='/monitor'>
					зал
				</Link>
				<Link style={styles.link} to='/history'>
					История
				</Link>
				<Link style={styles.link} to='/admin'>
					Админ
				</Link>
				<Link style={styles.link} to='/assembly'>
					Сборка
				</Link>
				<Link style={styles.link} to='/adminCash'>
          Касса админ
				</Link>
			</nav>

			<main style={styles.main}>
				<Outlet />
			</main>
		</div>
	)
}

function App() {
	return (
		<Routes>
			<Route path='/adminCash' element={<AdminCashMonitor />} />

			<Route path='/' element={<Layout />}>
				<Route index element={<ClientMonitor />} />
				<Route path='cashier' element={<CashierMonitor />} />
				<Route path='kitchen' element={<KitchenMonitor />} />
				<Route path='monitor' element={<HallMonitor />} />
				<Route path='history' element={<HistoryMonitor />} />
				<Route path='assembly' element={<AssemblyMonitor />} />

				<Route path='admin' element={<AdminLayout />}>
					<Route index element={<AdminDashboardPage />} />
					<Route path='orders' element={<AdminOrdersPage />} />
					<Route path='kitchen-assembly' element={<KitchenAssemblyPage />} />
					<Route path='categories' element={<CategoriesPage />} />
					<Route path='menu-items' element={<MenuItemsPage />} />
					<Route path='tech-cards' element={<TechCardsPage />} />
					<Route path='roles' element={<RolesPage />} />
				</Route>
			</Route>
		</Routes>
	)
}

const styles = {
	nav: {
		display: 'flex',
		gap: '15px',
		padding: '15px 20px',
		background: '#222',
		flexWrap: 'wrap' as const,
	},
	link: {
		color: '#fff',
		textDecoration: 'none',
		fontWeight: 'bold',
	},
	main: {
		padding: '20px',
	},
}

export default App
