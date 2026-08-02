'use client';

import { Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FlaskConical, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { RawMaterialList } from '@/features/raw-materials/components/raw-material-list';
import { rawMaterialKeys } from '@/features/raw-materials/hooks/use-raw-materials';

export default function RawMaterialsPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={FlaskConical}
        title="Raw materials"
        description="Cement, dust, pumice, and other materials used in production."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: rawMaterialKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
      />

      {/* useSearchParams needs a Suspense boundary while prerendering. */}
      <Suspense fallback={<ListSkeleton />}>
        <RawMaterialList />
      </Suspense>
    </div>
  );
}
