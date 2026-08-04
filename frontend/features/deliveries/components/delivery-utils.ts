/**
 * Pure helpers for delivery display — testable without rendering.
 */

export function computeMaxPlannable(orderRemaining: number, stockAvailable: number): number {
  return Math.max(0, Math.min(orderRemaining, stockAvailable));
}
