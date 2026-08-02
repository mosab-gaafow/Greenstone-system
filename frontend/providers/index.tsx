'use client';

import type { ReactNode } from 'react';
import { MotionConfig, useReducedMotion } from 'motion/react';
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
        <MotionSettings>{children}</MotionSettings>
        <Toaster position="top-right" richColors closeButton />
      </QueryProvider>
    </ThemeProvider>
  );
}

/**
 * Turns every Motion animation in the app into an instant cut when the user
 * has asked their system for reduced motion, in one place rather than in every
 * component that animates.
 */
function MotionSettings({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();

  return <MotionConfig reducedMotion={reduce ? 'always' : 'never'}>{children}</MotionConfig>;
}
