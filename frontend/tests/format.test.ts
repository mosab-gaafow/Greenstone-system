import { describe, it, expect } from 'vitest';
import { formatDateTime } from '../lib/format';

describe('formatDateTime', () => {
  it('formats a UTC timestamp in Africa/Nairobi 12-hour format', () => {
    // 2026-08-04T15:06:35Z = 18:06:35 in Nairobi (UTC+3)
    const result = formatDateTime('2026-08-04T15:06:35.000Z');
    // en-KE locale uses day-first format with 12-hour lowercase am/pm
    expect(result).toContain('2026');
    expect(result).toContain('6:06:35');
    expect(result).toMatch(/pm/i);
  });

  it('formats a morning UTC time as AM in Nairobi', () => {
    // 2026-08-04T03:00:00Z = 06:00:00 in Nairobi (UTC+3)
    const result = formatDateTime('2026-08-04T03:00:00.000Z');
    expect(result).toContain('6:00:00');
    expect(result).toMatch(/am/i);
  });

  it('renders midnight UTC as 3 AM Nairobi', () => {
    // 2026-08-04T00:00:00Z = 03:00:00 in Nairobi
    const result = formatDateTime('2026-08-04T00:00:00.000Z');
    expect(result).toContain('3:00:00');
    expect(result).toMatch(/am/i);
  });
});
