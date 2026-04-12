export async function updateCashierOrder(
  id: string,
  payload: Partial<
    Pick<
      IUpdateOrderPayload,
      | 'cashier_status'
      | 'payment_method'
      | 'paid_amount'
      | 'change_amount'
      | 'cashier_name'
      | 'paid_at'
      | 'status'
      | 'kitchen_status'
      | 'assembly_status'
      | 'assembly_progress'
    >
  >
): Promise<void> {
  const cleanedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  )

  const { error } = await supabase
    .from('orders')
    .update(cleanedPayload)
    .eq('id', id)

  if (error) throw new Error(error.message)
}