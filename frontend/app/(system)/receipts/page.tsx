'use client';
import { Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { ReceiptList } from '@/features/receipts/components/receipt-list';
import { receiptKeys } from '@/features/receipts/hooks/use-receipts';
import { useQueryClient } from '@tanstack/react-query';

export default function ReceiptsPage() {
  const qc = useQueryClient();
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        icon={Receipt}
        title="Receipts"
        description="Receipts are issued automatically when a customer payment is approved."
        secondaryActions={<>
            <ListExportButton source="receipts" fileName="Receipts" /><Button variant="outline" className="h-11" onClick={() => void qc.invalidateQueries({ queryKey: receiptKeys.all })}><RefreshCw className="size-4" />Refresh</Button></>}
      />
      <ReceiptList />
    </div>
  );
}
