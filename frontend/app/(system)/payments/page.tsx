'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Wallet, Plus, RefreshCw, MoreHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { PageHeader } from '@/components/layout/page-header';
import { ListExportButton } from '@/components/shared/list-export-button';
import { SelectField } from '@/components/forms/select-field';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { usePayments } from '@/features/customer-payments/hooks/use-payments';
import { paymentStatusLabel, paymentMethodLabel, type Payment } from '@/features/customer-payments/types/payment.types';
import { paymentKeys } from '@/features/customer-payments/hooks/use-payments';

const DEFAULTS = { page: '1', search: '', paymentStatus: 'all', paymentMethod: 'all' } as const;
const PAGE_SIZE = 25;
const STATUS_TONE: Record<Payment['status'], StatusTone> = { PENDING: 'neutral', APPROVED: 'success', REVERSED: 'danger' };

const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All payment statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REVERSED', label: 'Reversed' },
];
const PAYMENT_METHOD_OPTIONS = [
  { value: 'all', label: 'All payment methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
];

function syncSearchToUrl(search: string) {
  const params = new URLSearchParams(window.location.search);
  if (search) params.set('search', search); else params.delete('search');
  params.set('page', '1');
  window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
}

function PaymentList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const urlPage = Number.parseInt(values.page, 10) || 1;

  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectivePage = debouncedSearch ? 1 : urlPage;

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
    }, 300);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = localSearch.trim();
    setDebouncedSearch(trimmed);
    syncSearchToUrl(trimmed);
  }

  const query = usePayments({
    page: effectivePage, pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: values.paymentStatus !== 'all' ? (values.paymentStatus as Payment['status']) : undefined,
    paymentMethod: values.paymentMethod !== 'all' ? (values.paymentMethod as 'CASH' | 'MPESA' | 'BANK_TRANSFER' | 'CHEQUE') : undefined,
  });

  const columns: ListColumn<Payment>[] = [
    { key: 'paymentNumber', header: 'Payment', card: 'title', render: (pmt) => <Link href={`/payments/${pmt.id}`} className="text-primary font-semibold hover:underline">{pmt.paymentNumber}</Link> },
    { key: 'customerName', header: 'Customer', card: 'subtitle', render: (pmt) => pmt.customerName },
    { key: 'amount', header: 'Amount', card: 'meta', align: 'right', className: 'tabular-nums', render: (pmt) => `KES ${pmt.amount}` },
    { key: 'paymentMethod', header: 'Method', card: 'meta', render: (pmt) => paymentMethodLabel(pmt.paymentMethod) },
    { key: 'status', header: 'Status', card: 'badge', render: (pmt) => <StatusBadge tone={STATUS_TONE[pmt.status]} label={paymentStatusLabel(pmt.status)} /> },
    { key: 'actions', header: '', align: 'right', render: (pmt) => <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/payments/${pmt.id}`} />}><FileText className="size-4" />View</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
  ];

  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton />;
  if (query.isError) return <EmptyState icon={Wallet} title="Could not load" action={<Button onClick={() => void query.refetch()}>Try again</Button>} />;

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-start rounded-lg border p-3 md:p-4">
        <Input className="w-full md:w-[320px] md:flex-none h-11" placeholder="Search by payment, customer or reference" value={localSearch} onChange={(e) => handleSearchChange(e.target.value)} onKeyDown={handleSearchKeyDown} />
        <SelectField id="paymentStatus" label="" value={values.paymentStatus} onChange={(v) => { setFilters({ paymentStatus: v, page: '1' }); }} options={PAYMENT_STATUS_OPTIONS} />
        <SelectField id="paymentMethod" label="" value={values.paymentMethod} onChange={(v) => { setFilters({ paymentMethod: v, page: '1' }); }} options={PAYMENT_METHOD_OPTIONS} />
      </div>

      <ResponsiveList records={query.data.payments} columns={columns} getRowKey={(p) => p.id} caption="Payments" emptyState={<EmptyState icon={Wallet} title="No payments" description="Record a customer payment." />} />
      <Pagination page={query.data.meta.page} pageSize={query.data.meta.pageSize} totalRecords={query.data.meta.totalRecords} totalPages={query.data.meta.totalPages} onPageChange={setPage} />
    </div>
  );
}

export default function PaymentsPage() {
  const qc = useQueryClient();
  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeader icon={Wallet} title="Customer payments" description="Record and manage payments." secondaryActions={<>
            <ListExportButton source="payments" fileName="Payments" /><Button variant="outline" className="h-11" onClick={() => void qc.invalidateQueries({ queryKey: paymentKeys.all })}><RefreshCw className="size-4" />Refresh</Button></>} action={<Button render={<Link href="/payments/new" />} className="h-11 w-full sm:w-auto"><Plus className="size-4" />Record payment</Button>} />
    <PaymentList />
  </div>;
}
