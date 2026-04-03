function Header() {
	return (
		<header
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				padding: '15px 30px',
				backgroundColor: '#222',
				color: '#fff',
			}}
		>
			<h2>My Monitor System</h2>

			<nav style={{ display: 'flex', gap: '20px' }}>
				<a href="/" style={{ color: '#fff', textDecoration: 'none' }}>
					Client
				</a>
				<a href="/cashier" style={{ color: '#fff', textDecoration: 'none' }}>
					Cashier
				</a>
				<a href="/kitchen" style={{ color: '#fff', textDecoration: 'none' }}>
					Kitchen
				</a>
				<a href="/hall" style={{ color: '#fff', textDecoration: 'none' }}>
					Hall
				</a>
				<a href="/history" style={{ color: '#fff', textDecoration: 'none' }}>
					History
				</a>
			</nav>
		</header>
	)
}

export default Header