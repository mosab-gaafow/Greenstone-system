'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Receipt, MoreHorizontal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { SelectField } from '@/components/forms/select-field';
import { DocumentPdfPreviewDialog } from '@/components/shared/document-pdf-preview-dialog';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useInvoices } from '../hooks/use-invoices';
import { invoicePdfUrl } from '../api/invoices.api';
import { invoiceStatusLabel, paymentStatusLabel, type Invoice } from '../types/invoice.types';

const DEFAULTS = { page: '1', search: '', invoiceStatus: 'all', paymentStatus: 'all' } as const;
const PAGE_SIZE = 25;
const TONE: Record<string, StatusTone> = { ISSUED: 'info', VOIDED: 'danger', UNPAID: 'neutral', PARTIALLY_PAID: 'warning', FULLY_PAID: 'success' };

const INVOICE_STATUS_OPTIONS = [
  { value: 'all', label: 'All invoice statuses' },
  { value: 'ISSUED', label: 'Issued' },
  { value: 'VOIDED', label: 'Voided' },
];
const PAYMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All payment statuses' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'FULLY_PAID', label: 'Fully paid' },
  { value: 'VOIDED', label: 'Voided' },
];

/** Sync search to the URL without triggering navigation or a re-render. */
function syncSearchToUrl(search: string) {
  const params = new URLSearchParams(window.location.search);
  if (search) params.set('search', search); else params.delete('search');
  params.set('page', '1');
  window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
}

export function InvoiceList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const urlPage = Number.parseInt(values.page, 10) || 1;

  // --- local search state (stable, never remounts the input) ---
  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  // When search is active, always use page 1.  Otherwise use the URL page
  // (which pagination clicks keep in sync via useUrlFilters).
  const effectivePage = debouncedSearch ? 1 : urlPage;

  /** Typing: update local value immediately, debounce the API query. */
  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
    }, 300);
  }

  /** Enter: flush the debounce and sync the URL non-reactively. */
  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = localSearch.trim();
    setDebouncedSearch(trimmed);
    syncSearchToUrl(trimmed);
  }

  // --- query uses debouncedSearch, NOT values.search ---
  const query = useInvoices({
    page: effectivePage, pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: values.invoiceStatus !== 'all' ? (values.invoiceStatus as Invoice['status']) : undefined,
    paymentStatus: values.paymentStatus !== 'all' ? (values.paymentStatus as 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID' | 'VOIDED') : undefined,
  });

  const cols: ListColumn<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice', card: 'title', render: (inv) => <Link href={`/invoices/${inv.id}`} className="text-primary font-semibold hover:underline">{inv.invoiceNumber}</Link> },
    { key: 'orderNumber', header: 'Order', card: 'subtitle', render: (inv) => inv.orderNumber },
    { key: 'customerName', header: 'Customer', card: 'meta', render: (inv) => inv.customerName },
    { key: 'totalAmount', header: 'Total', card: 'meta', align: 'right', className: 'tabular-nums', render: (inv) => `KES ${inv.totalAmount}` },
    { key: 'status', header: 'Invoice', card: 'badge', render: (inv) => <StatusBadge tone={TONE[inv.status]} label={invoiceStatusLabel(inv.status)} /> },
    { key: 'paymentStatus', header: 'Payment', card: 'badge', render: (inv) => inv.paymentStatus ? <StatusBadge tone={TONE[inv.paymentStatus]} label={paymentStatusLabel(inv.paymentStatus)} /> : null },
    { key: 'actions', header: '', align: 'right', render: (inv) => (
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title="Preview invoice"
          aria-label={`Preview invoice ${inv.invoiceNumber}`}
          onClick={() => setPreviewInvoice(inv)}
        >
          <Eye className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuItem render={<Link href={`/invoices/${inv.id}`} />}><FileText className="size-4" />View</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ) },
  ];

  // placeholderData keeps the previous list visible while the new results load,
  // so the component never unmounts the <Input> during a query-key change.
  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton />;
  if (query.isError) return <EmptyState icon={Receipt} title="Could not load" action={<Button onClick={() => void query.refetch()}>Try again</Button>} />;

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-start rounded-lg border p-3 md:p-4">
        <Input className="w-full md:w-[320px] md:flex-none h-11" placeholder="Search by invoice, order or customer" value={localSearch} onChange={(e) => handleSearchChange(e.target.value)} onKeyDown={handleSearchKeyDown} />
        <SelectField id="invoiceStatus" label="" value={values.invoiceStatus} onChange={(v) => { setFilters({ invoiceStatus: v, page: '1' }); }} options={INVOICE_STATUS_OPTIONS} />
        <SelectField id="paymentStatus" label="" value={values.paymentStatus} onChange={(v) => { setFilters({ paymentStatus: v, page: '1' }); }} options={PAYMENT_STATUS_OPTIONS} />
      </div>

      <ResponsiveList records={query.data.invoices} columns={cols} getRowKey={(i) => i.id} caption="Invoices" emptyState={<EmptyState icon={Receipt} title="No invoices" description="Create an invoice from an order." />} />
      <Pagination page={query.data.meta.page} pageSize={query.data.meta.pageSize} totalRecords={query.data.meta.totalRecords} totalPages={query.data.meta.totalPages} onPageChange={setPage} />

      {/* Invoice PDF Preview */}
      <DocumentPdfPreviewDialog
        open={previewInvoice !== null}
        onOpenChange={(o) => { if (!o) setPreviewInvoice(null); }}
        docType="Invoice"
        docNumber={previewInvoice?.invoiceNumber ?? ''}
        pdfUrl={previewInvoice ? invoicePdfUrl(previewInvoice.id) : ''}
        downloadFileName={previewInvoice ? `Invoice_${previewInvoice.invoiceNumber}.pdf` : ''}
      />
    </div>
  );
}
