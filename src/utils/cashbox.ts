export const calculateCashboxAmount = (orders: any[], movements: any[]) => {
	const normalizedOrders = Array.isArray(orders) ? orders : []
	const normalizedMovements = Array.isArray(movements) ? movements : []

	const cashOrdersTotal = normalizedOrders.reduce((sum, order) => {
		const payment = String(order.payment_method || '').toLowerCase()
		const isCash =
			payment.includes('cash') ||
			payment.includes('нал') ||
			payment.includes('наличные')

		return isCash ? sum + Number(order.total || 0) : sum
	}, 0)

	const onlineOrdersTotal = normalizedOrders.reduce((sum, order) => {
		const payment = String(order.payment_method || '').toLowerCase()
		const isOnline =
			payment.includes('online') ||
			payment.includes('card') ||
			payment.includes('карта') ||
			payment.includes('безнал')

		return isOnline ? sum + Number(order.total || 0) : sum
	}, 0)

	const approvedIn = normalizedMovements
		.filter(
			(item) => item?.status === 'approved' && item?.movement_type === 'in'
		)
		.reduce((acc, item) => acc + Number(item.amount || 0), 0)

	const approvedOut = normalizedMovements
		.filter(
			(item) => item?.status === 'approved' && item?.movement_type === 'out'
		)
		.reduce((acc, item) => acc + Number(item.amount || 0), 0)

	return {
		cashOrdersTotal,
		onlineOrdersTotal,
		approvedIn,
		approvedOut,
		finalAmount: approvedIn - approvedOut,
	}
}