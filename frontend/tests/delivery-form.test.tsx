import { describe, it, expect } from 'vitest';
import { computeMaxPlannable } from '../features/deliveries/components/delivery-utils';

describe('computeMaxPlannable', () => {
  it('returns the minimum of order remaining and stock available', () => {
    expect(computeMaxPlannable(100, 50)).toBe(50);
  });

  it('returns 0 when stock is 0 even if order has remaining', () => {
    expect(computeMaxPlannable(1000, 0)).toBe(0);
  });

  it('returns remaining when stock exceeds it', () => {
    expect(computeMaxPlannable(20, 500)).toBe(20);
  });

  it('returns 0 when both are 0', () => {
    expect(computeMaxPlannable(0, 0)).toBe(0);
  });
});
