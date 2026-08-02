import type { Transition, Variants } from 'motion/react';

/**
 * Shared animation presets.
 *
 * Kept in one place so every feature reaches for the same easing and duration
 * instead of hand-rolling its own — small, fast, and consistent is the goal,
 * per the approved redesign rules. `prefers-reduced-motion` is handled once,
 * globally, by `MotionConfig` in `providers/index.tsx`, so components using
 * these presets do not need to check it themselves.
 */

export const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1];

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/** For a row of cards or list items — each child staggers in after the last. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.15 } },
};
