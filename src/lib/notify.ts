// Fire-and-forget notification calls. Email delivery is best-effort —
// a failure here should never surface as a failure of the booking
// action that triggered it (the booking/cancel/reschedule already
// succeeded by the time this is called).
export function notifyWaitlistPromoted(bookingId: string): void {
  fetch("/api/notify/waitlist-promoted", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bookingId }),
  }).catch(() => {});
}

export function notifyFirstClass(clientId: string): void {
  fetch("/api/notify/first-class", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId }),
  }).catch(() => {});
}
