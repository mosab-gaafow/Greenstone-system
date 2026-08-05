'use client';
import Link from 'next/link';
import { Receipt, MoreHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useInvoices } from '../hooks/use-invoices';
import { invoiceStatusLabel, type Invoice } from '../types/invoice.types';

const DEFAULTS = { page: '1', search: '' } as const;
const PAGE_SIZE = 25;
const STATUS_TONE: Record<Invoice['status'], StatusTone> = { ISSUED: 'info', VOIDED: 'danger' };

export function InvoiceList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const page = Number.parseInt(values.page, 10) || 1;
  const query = useInvoices({ page, pageSize: PAGE_SIZE, search: values.search || undefined });

  const columns: ListColumn<Invoice>[] = [
    {
      key: 'invoiceNumber', header: 'Invoice', card: 'title',
      render: (inv) => <Link href={`/invoices/${inv.id}`} className="text-primary font-semibold hover:underline">{inv.invoiceNumber}</Link>,
    },
    { key: 'orderNumber', header: 'Order', card: 'subtitle', render: (inv) => inv.orderNumber },
    { key: 'customerName', header: 'Customer', card: 'meta', render: (inv) => inv.customerName },
    { key: 'totalAmount', header: 'Total', card: 'meta', align: 'right', className: 'tabular-nums', render: (inv) => `KES ${inv.totalAmount}` },
    { key: 'status', header: 'Status', card: 'badge', render: (inv) => <StatusBadge tone={STATUS_TONE[inv.status]} label={invoiceStatusLabel(inv.status)} /> },
    {
      key: 'actions', header: '', align: 'right',
      render: (inv) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/invoices/${inv.id}`} />}><FileText className="size-4" />View</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const isFiltered = values.search !== '';

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <EmptyState icon={Receipt} title="Could not load invoices" action={<Button onClick={() => void query.refetch()}>Try again</Button>} />;

  return (
    <div className="space-y-4">
      <TableToolbar search={values.search} onSearchChange={(s) => setFilters({ search: s })} searchPlaceholder="Search invoices" isFiltered={isFiltered} onReset={() => setFilters({ search: '' })} />
      <ResponsiveList records={query.data.invoices} columns={columns} getRowKey={(i) => i.id} caption="Invoices" emptyState={<EmptyState icon={Receipt} title="No invoices" description="Create an invoice from an order." />} />
      <Pagination page={query.data.meta.page} pageSize={query.data.meta.pageSize} totalRecords={query.data.meta.totalRecords} totalPages={query.data.meta.totalPages} onPageChange={setPage} />
    </div>
  );
}
