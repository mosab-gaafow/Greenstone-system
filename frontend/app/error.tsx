'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

/**
 * Root error boundary.
 *
 * The underlying error is never shown to the user — it may contain internal
 * detail. It is logged for the developer console instead.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />

      <div className="max-w-md space-y-2">
        <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground text-pretty">
          The page could not be shown. Please try again. If it keeps happening, contact a system
          administrator.
        </p>
        {error.digest && (
          <p className="text-muted-foreground/70 font-mono text-xs">Reference: {error.digest}</p>
        )}
      </div>

      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
