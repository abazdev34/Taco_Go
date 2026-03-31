let cachedAudio: HTMLAudioElement | null = null

const playFallbackBeep = () => {
	try {
		const AudioContextClass =
			window.AudioContext || (window as any).webkitAudioContext

		if (!AudioContextClass) return

		const ctx = new AudioContextClass()
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()

		osc.type = "triangle"
		osc.frequency.setValueAtTime(880, ctx.currentTime)
		osc.frequency.setValueAtTime(988, ctx.currentTime + 0.08)
		osc.frequency.setValueAtTime(740, ctx.currentTime + 0.18)

		gain.gain.setValueAtTime(0.001, ctx.currentTime)
		gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02)
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42)

		osc.connect(gain)
		gain.connect(ctx.destination)

		osc.start(ctx.currentTime)
		osc.stop(ctx.currentTime + 0.42)
	} catch (error) {
		console.error("Fallback beep error:", error)
	}
}

export const playNewOrderSound = async () => {
	try {
		if (!cachedAudio) {
			cachedAudio = new Audio("/sounds/new-order.mp3")
			cachedAudio.preload = "auto"
		}

		cachedAudio.pause()
		cachedAudio.currentTime = 0
		await cachedAudio.play()
	} catch (error) {
		console.error("MP3 play error:", error)
		playFallbackBeep()
	}
}