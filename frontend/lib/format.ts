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

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Today's date in Africa/Nairobi, as `YYYY-MM-DD` — suitable as both a date
 * input's default value and its `max` attribute, so a date field never lets
 * someone pick a day that hasn't happened yet (a purchase date, a payment
 * date, ...). `en-CA` formats as `YYYY-MM-DD` directly, so no manual
 * reassembly is needed.
 *
 * Deliberately Nairobi-based, not the browser's local date: mirrors the
 * backend's `getNairobiToday`, so the two never disagree near a UTC day
 * boundary (Nairobi, UTC+3, reaches a new calendar date before UTC does).
 */
export function todayInNairobi(): string {
  return isoDateFormatter.format(new Date());
}
