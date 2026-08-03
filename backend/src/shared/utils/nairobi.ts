import { APP_TIMEZONE } from '../constants/time.js';

/**
 * Returns the calendar year for a moment in the Africa/Nairobi timezone.
 *
 * Document sequences restart on the Nairobi new year, not the UTC one. Nairobi
 * is UTC+3, so 31 December 22:00 UTC is already 1 January locally and must
 * receive the new year's sequence.
 *
 * See docs/technical-blueprint.md section 10.4.
 */
export function getNairobiYear(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
  });

  const year = Number.parseInt(formatter.format(date), 10);

  if (!Number.isFinite(year)) {
    throw new Error(`Unable to determine ${APP_TIMEZONE} year for ${date.toISOString()}`);
  }

  return year;
}

const NAIROBI_TODAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Returns today's calendar date in the Africa/Nairobi timezone, as
 * `YYYY-MM-DD` — the same "which day is it locally, not in UTC" concern
 * `getNairobiYear` already solves, extended to the full date. `en-CA`
 * formats as `YYYY-MM-DD` directly, so no manual reassembly is needed.
 */
export function getNairobiToday(date: Date = new Date()): string {
  return NAIROBI_TODAY_FORMATTER.format(date);
}

/**
 * True when a date-only value (a purchase date, a payment date, ...) is
 * today or earlier in the Africa/Nairobi timezone.
 *
 * Deliberately compares calendar dates as strings, not `Date` instants:
 * a bare `YYYY-MM-DD` string is parsed as UTC midnight
 * (`z.coerce.date()`/`new Date(...)`), and comparing that instant directly
 * against the current instant would wrongly reject "today" for the first
 * few hours of the Nairobi day, since Nairobi (UTC+3) reaches a new calendar
 * date before UTC does.
 *
 * `now` defaults to the real current instant; a caller may pass a fixed
 * value to test the day-boundary behaviour deterministically.
 */
export function isNotFutureNairobiDate(date: Date, now: Date = new Date()): boolean {
  return date.toISOString().slice(0, 10) <= getNairobiToday(now);
}
