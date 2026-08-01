import { describe, expect, it } from 'vitest';
import { getNairobiYear } from '../../src/shared/utils/nairobi.js';

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
