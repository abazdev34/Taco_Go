import { IOrderRow, TOrderStatus } from "../types/order"

type SyncMessage =
	| { type: "ORDER_CREATED"; payload: IOrderRow }
	| { type: "ORDER_UPDATED"; payload: IOrderRow }
	| { type: "ORDER_COMPLETED"; payload: IOrderRow }

const CHANNEL_NAME = "taco-go-orders-sync"

let channel: BroadcastChannel | null = null

export const getOrderChannel = () => {
	if (typeof window === "undefined") return null
	if (!("BroadcastChannel" in window)) return null

	if (!channel) {
		channel = new BroadcastChannel(CHANNEL_NAME)
	}

	return channel
}

export const broadcastOrderCreated = (order: IOrderRow) => {
	getOrderChannel()?.postMessage({
		type: "ORDER_CREATED",
		payload: order,
	})
}

export const broadcastOrderUpdated = (order: IOrderRow) => {
	getOrderChannel()?.postMessage({
		type: "ORDER_UPDATED",
		payload: order,
	})
}

export const broadcastOrderCompleted = (order: IOrderRow) => {
	getOrderChannel()?.postMessage({
		type: "ORDER_COMPLETED",
		payload: order,
	})
}

export const subscribeOrderSync = (
	handler: (message: SyncMessage) => void
) => {
	const ch = getOrderChannel()
	if (!ch) return () => {}

	const listener = (event: MessageEvent<SyncMessage>) => {
		handler(event.data)
	}

	ch.addEventListener("message", listener)

	return () => {
		ch.removeEventListener("message", listener)
	}
}

export const patchOrderStatus = (
	order: IOrderRow,
	status: TOrderStatus
): IOrderRow => {
	return {
		...order,
		status,
		updated_at: new Date().toISOString(),
	}
}