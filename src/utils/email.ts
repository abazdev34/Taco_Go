export const sendEmailReport = (subject: string, body: string) => {
	const mailtoLink = `mailto:?subject=${encodeURIComponent(
		subject
	)}&body=${encodeURIComponent(body)}`

	window.location.href = mailtoLink
}