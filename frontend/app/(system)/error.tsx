'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/page-container';

export default function SystemError({
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
    <PageContainer
      title="Something went wrong"
      description="This page could not be loaded. Please try again."
    >
      <Button onClick={reset}>Try again</Button>
    </PageContainer>
  );
}
