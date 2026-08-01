'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Keeps list filters in the URL.
 *
 * Search, filters, sort and page live in the address bar rather than component
 * state, so a view survives a refresh, works with the back button, and can be
 * sent to a colleague as a link.
 *
 * Changing any filter resets the page, because staying on page 4 of a result
 * set that now has one page shows an empty screen.
 */
export function useUrlFilters<TDefaults extends Record<string, string>>(defaults: TDefaults) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const result = { ...defaults };

    for (const key of Object.keys(defaults)) {
      const value = searchParams.get(key);
      if (value !== null) {
        result[key as keyof TDefaults] = value as TDefaults[keyof TDefaults];
      }
    }

    return result;
  }, [defaults, searchParams]);

  const setFilters = useCallback(
    (
      changes: Partial<Record<keyof TDefaults, string | undefined>>,
      options?: { keepPage?: boolean },
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        // A value equal to the default is left out, so the URL stays short and
        // the same view always has the same address.
        if (value === undefined || value === '' || value === defaults[key]) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      if (!options?.keepPage && !Object.hasOwn(changes, 'page')) {
        params.delete('page');
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaults, pathname, router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => {
      setFilters({ page: String(page) } as Partial<Record<keyof TDefaults, string>>, {
        keepPage: true,
      });
    },
    [setFilters],
  );

  return { values, setFilters, setPage };
}
