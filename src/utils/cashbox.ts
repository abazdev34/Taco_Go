import { IOrderRow } from '../types/order'
import { ICashMovementRow } from '../api/cashMovements'

export function calculateCashboxAmount(
  orders: IOrderRow[],
  movements: ICashMovementRow[]
) {
  const cashOrdersTotal = (Array.isArray(orders) ? orders : []).reduce(
    (acc, order) => {
      if (order.payment_method !== 'cash') return acc

      const paid = Number(order.paid_amount || 0)
      const change = Number(order.change_amount || 0)

      if (paid > 0) {
        return acc + (paid - change)
      }

      return acc + Number(order.total || 0)
    },
    0
  )

  const approvedIn = (Array.isArray(movements) ? movements : [])
    .filter((item) => item.status === 'approved' && item.movement_type === 'in')
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)

  const approvedOut = (Array.isArray(movements) ? movements : [])
    .filter((item) => item.status === 'approved' && item.movement_type === 'out')
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)

  return {
    cashOrdersTotal,
    approvedIn,
    approvedOut,
    finalAmount: cashOrdersTotal + approvedIn - approvedOut,
  }
}