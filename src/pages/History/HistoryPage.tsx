import { Link, Outlet, useLocation } from 'react-router-dom'
import './history.scss'

function HistoryPage() {
	const location = useLocation()

	const isActive = (path: string) => location.pathname.includes(path)

	return (
		<div className='history-shell'>
			<div className='history-shell__header'>
				<h1>История</h1>
				<p>Бардык отчеттор</p>
			</div>

			<div className='history-shell__tabs'>
				<Link to='/history/orders' className={isActive('orders') ? 'active' : ''}>
					Заказы
				</Link>
				<Link to='/history/dishes' className={isActive('dishes') ? 'active' : ''}>
					Блюда
				</Link>
				<Link to='/history/cash' className={isActive('cash') ? 'active' : ''}>
					Касса
				</Link>
				<Link to='/history/products' className={isActive('products') ? 'active' : ''}>
					Продукты
				</Link>
			</div>

			<div className='history-shell__content'>
				<Outlet />
			</div>
		</div>
	)
}

export default HistoryPage