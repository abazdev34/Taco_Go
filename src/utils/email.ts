export const sendEmailReport = (subject: string, body: string, to = '') => {
	const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
		to
	)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

	const mailtoLink = `mailto:${encodeURIComponent(
		to
	)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

	const popup = window.open(gmailLink, '_blank', 'noopener,noreferrer')

	if (!popup) {
		window.location.href = mailtoLink
	}
}