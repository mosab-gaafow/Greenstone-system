'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Boxes, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { StockList } from '@/features/stock/components/stock-list';
import { stockKeys } from '@/features/stock/hooks/use-stock';

export default function StockPage() {
  const queryClient = useQueryClient();

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Boxes}
        title="Finished stock"
        description="Physical, reserved, and available quantities per product."
        secondaryActions={
          <Button
            variant="outline"
            className="h-11"
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: stockKeys.all });
            }}
          >
            <RefreshCw className="size-4" aria-hidden />
            Refresh
          </Button>
        }
      />

      <StockList />
    </div>
  );
}
