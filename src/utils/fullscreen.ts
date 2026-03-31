export const isFullscreenActive = () => {
	return !!document.fullscreenElement
}

export const enterFullscreen = async (element?: HTMLElement | null) => {
	try {
		const target = element || document.documentElement
		if (!document.fullscreenElement) {
			await target.requestFullscreen()
		}
	} catch (error) {
		console.error("Enter fullscreen error:", error)
	}
}

export const exitFullscreen = async () => {
	try {
		if (document.fullscreenElement) {
			await document.exitFullscreen()
		}
	} catch (error) {
		console.error("Exit fullscreen error:", error)
	}
}

export const toggleFullscreen = async (element?: HTMLElement | null) => {
	if (isFullscreenActive()) {
		await exitFullscreen()
	} else {
		await enterFullscreen(element)
	}
}