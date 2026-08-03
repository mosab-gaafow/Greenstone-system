import { describe, expect, it } from 'vitest';
import { getNairobiToday, getNairobiYear, isNotFutureNairobiDate } from '../../src/shared/utils/nairobi.js';

describe('Africa/Nairobi calendar year', () => {
  it('returns the year for a mid-year date', () => {
    expect(getNairobiYear(new Date('2026-06-15T12:00:00Z'))).toBe(2026);
  });

  it('uses the Nairobi year, not the UTC year, on new year eve', () => {
    // Nairobi is UTC+3, so this instant is already 1 January 2027 locally.
    // The sequence for the new year must start here, not three hours later.
    expect(getNairobiYear(new Date('2026-12-31T22:00:00Z'))).toBe(2027);
  });

  it('still returns the old year just before the local rollover', () => {
    // 23:59 local on 31 December 2026.
    expect(getNairobiYear(new Date('2026-12-31T20:59:00Z'))).toBe(2026);
  });

  it('returns the new year at the start of January UTC', () => {
    expect(getNairobiYear(new Date('2027-01-01T00:30:00Z'))).toBe(2027);
  });
});

describe('getNairobiToday', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(getNairobiToday(new Date('2026-06-15T12:00:00Z'))).toBe('2026-06-15');
  });

  it('reflects the Nairobi calendar date even just after the UTC day rolls over', () => {
    // 00:30 UTC is already 03:30 local — still the same Nairobi day it was
    // three hours earlier, not the previous UTC day.
    expect(getNairobiToday(new Date('2026-08-04T00:30:00Z'))).toBe('2026-08-04');
  });

  it('is already the next Nairobi day shortly before UTC midnight', () => {
    // 21:30 UTC is 00:30 the next day in Nairobi.
    expect(getNairobiToday(new Date('2026-08-03T21:30:00Z'))).toBe('2026-08-04');
  });
});

describe('isNotFutureNairobiDate', () => {
  it('accepts a bare date-only value for the current Nairobi day', () => {
    const today = getNairobiToday();
    expect(isNotFutureNairobiDate(new Date(today))).toBe(true);
  });

  it('accepts any date in the past', () => {
    expect(isNotFutureNairobiDate(new Date('2020-01-01'))).toBe(true);
  });

  it('rejects a date in the future', () => {
    expect(isNotFutureNairobiDate(new Date('2999-01-01'))).toBe(false);
  });

  it('does not reject "today" during the first hours of the Nairobi day', () => {
    // 21:30 UTC on Aug 3 is already 00:30 on Aug 4 in Nairobi (UTC+3). A
    // naive `submittedDate > now` instant comparison would wrongly reject
    // Aug 4 here, since Aug 4T00:00:00Z is still a few hours in the future
    // relative to this instant — the whole reason this function compares
    // calendar dates instead.
    const nairobiMidnightThirty = new Date('2026-08-03T21:30:00Z');
    const submittedAsAug4 = new Date('2026-08-04'); // the date-only value the user picked
    expect(isNotFutureNairobiDate(submittedAsAug4, nairobiMidnightThirty)).toBe(true);
  });
});
