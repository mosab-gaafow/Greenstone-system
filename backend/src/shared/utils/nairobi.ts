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
