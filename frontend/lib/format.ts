/**
 * Shared display formatting.
 *
 * `frontend/CLAUDE.md` requires dates to display in Africa/Nairobi regardless
 * of where the browser is, so every screen agrees on "today."
 */

const dateFormatter = new Intl.DateTimeFormat('en-KE', {
  timeZone: 'Africa/Nairobi',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Formats an ISO timestamp as a short, human date, e.g. "12 Jan 2026". */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
