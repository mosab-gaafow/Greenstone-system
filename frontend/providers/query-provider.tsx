'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';

/**
 * TanStack Query provider.
 *
 * The client is created inside state so each browser session gets its own
 * cache, and a server render never shares one between users.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // Never retry a request the server deliberately refused.
              // Retrying a 401 or 403 cannot succeed and only adds noise.
              if (error instanceof ApiError && error.status < 500) {
                return false;
              }

              return failureCount < 2;
            },
          },
          mutations: {
            // Sensitive actions must never be retried automatically. A repeated
            // payment or approval is worse than a failed one.
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
