'use client';

import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from './query-provider';
import { ThemeProvider } from './theme-provider';

/**
 * All client providers, in one place.
 *
 * There is no authentication provider. Better Auth's `useSession` hook reads
 * the session directly, so a second copy of that state would only risk drifting
 * out of date.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}
