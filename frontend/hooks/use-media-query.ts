'use client';

import { useSyncExternalStore } from 'react';

/**
 * Reads a CSS media query on the client.
 *
 * Backed by `useSyncExternalStore` rather than `useState` + `useEffect` — the
 * store already handles the server/first-paint value safely, so there is no
 * hydration-mismatch flash to work around by hand.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => {
        mediaQueryList.removeEventListener('change', onChange);
      };
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
