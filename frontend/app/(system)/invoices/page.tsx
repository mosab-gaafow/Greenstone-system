'use client';
import { useQueryClient } from '@tanstack/react-query';
import { Receipt, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { InvoiceList } from '@/features/invoices/components/invoice-list';
import { invoiceKeys } from '@/features/invoices/hooks/use-invoices';

export default function InvoicesPage() {
  const qc = useQueryClient();
  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader icon={Receipt} title="Invoices" description="One invoice per order." secondaryActions={<>
            <ListExportButton source="invoices" fileName="Invoices" /><Button variant="outline" className="h-11" onClick={() => void qc.invalidateQueries({ queryKey: invoiceKeys.all })}><RefreshCw className="size-4" />Refresh</Button></>} />
    <InvoiceList />
  </div>;
}
