function Footer() {
	return <footer style={styles.footer}>© 2026 My App</footer>
}

const styles = {
	footer: {
		background: '#222',
		color: '#fff',
		textAlign: 'center' as const,
		padding: '15px 20px',
		marginTop: 'auto',
	},
}

export default Footer