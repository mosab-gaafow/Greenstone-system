'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, RefreshCw, MoreHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { TableToolbar } from '@/components/data-display/table-toolbar';
import { PageHeader } from '@/components/layout/page-header';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { usePayments } from '@/features/customer-payments/hooks/use-payments';
import { paymentStatusLabel, paymentMethodLabel, type Payment } from '@/features/customer-payments/types/payment.types';
import { paymentKeys } from '@/features/customer-payments/hooks/use-payments';

const DEFAULTS = { page: '1', search: '' } as const;
const PAGE_SIZE = 25;
const STATUS_TONE: Record<Payment['status'], StatusTone> = { PENDING: 'neutral', APPROVED: 'success', REVERSED: 'danger' };

function PaymentList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const page = Number.parseInt(values.page, 10) || 1;
  const query = usePayments({ page, pageSize: PAGE_SIZE, search: values.search || undefined });
  const columns: ListColumn<Payment>[] = [
    { key: 'paymentNumber', header: 'Payment', card: 'title', render: (pmt) => <Link href={`/payments/${pmt.id}`} className="text-primary font-semibold hover:underline">{pmt.paymentNumber}</Link> },
    { key: 'customerName', header: 'Customer', card: 'subtitle', render: (pmt) => pmt.customerName },
    { key: 'amount', header: 'Amount', card: 'meta', align: 'right', className: 'tabular-nums', render: (pmt) => `KES ${pmt.amount}` },
    { key: 'paymentMethod', header: 'Method', card: 'meta', render: (pmt) => paymentMethodLabel(pmt.paymentMethod) },
    { key: 'status', header: 'Status', card: 'badge', render: (pmt) => <StatusBadge tone={STATUS_TONE[pmt.status]} label={paymentStatusLabel(pmt.status)} /> },
    { key: 'actions', header: '', align: 'right', render: (pmt) => <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/payments/${pmt.id}`} />}><FileText className="size-4" />View</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ];
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) return <EmptyState icon={Wallet} title="Could not load" action={<Button onClick={() => void query.refetch()}>Try again</Button>} />;
  return <div className="space-y-4"><TableToolbar search={values.search} onSearchChange={(s) => setFilters({ search: s })} searchPlaceholder="Search payments" isFiltered={values.search !== ''} onReset={() => setFilters({ search: '' })} /><ResponsiveList records={query.data.payments} columns={columns} getRowKey={(p) => p.id} caption="Payments" emptyState={<EmptyState icon={Wallet} title="No payments" description="Record a customer payment." />} /><Pagination page={query.data.meta.page} pageSize={query.data.meta.pageSize} totalRecords={query.data.meta.totalRecords} totalPages={query.data.meta.totalPages} onPageChange={setPage} /></div>;
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader icon={Wallet} title="Customer payments" description="Record and manage payments." secondaryActions={<Button variant="outline" className="h-11" onClick={() => void qc.invalidateQueries({ queryKey: paymentKeys.all })}><RefreshCw className="size-4" />Refresh</Button>} action={<Button render={<Link href="/payments/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" />Record payment</Button>} />
    <Suspense fallback={<ListSkeleton />}><PaymentList /></Suspense>
  </div>;
}
