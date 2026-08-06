'use client';
import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Download, Eye, MoreHorizontal, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/forms/select-field';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { EmptyState } from '@/components/data-display/empty-state';
import { Pagination } from '@/components/data-display/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DocumentPdfPreviewDialog } from '@/components/shared/document-pdf-preview-dialog';
import { useReceipts } from '@/features/receipts/hooks/use-receipts';
import { receiptPdfUrl } from '@/features/receipts/api/receipts.api';
import { receiptStatusLabel, paymentMethodLabel } from '@/features/receipts/types/receipt.types';
import type { Receipt as ReceiptRow } from '@/features/receipts/types/receipt.types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDateTime } from '@/lib/format';

const PAGE_SIZE = 25;

const DEFAULTS = {
  page: '1',
  search: '',
  status: 'all',
  paymentMethod: 'all',
} as const;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All receipt statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'VOIDED', label: 'Voided' },
];

const METHOD_OPTIONS = [
  { value: 'all', label: 'All payment methods' },
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
];

const TONES: Record<string, StatusTone> = { ACTIVE: 'success', VOIDED: 'danger' };

export function ReceiptList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptRow | null>(null);

  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = useCallback((v: string) => {
    setLocalSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v);
      setFilters({ search: v || '', page: '1' });
    }, 300);
  }, [setFilters]);

  const syncSearchToUrl = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedSearch(localSearch);
    if (localSearch !== values.search) {
      const params = new URLSearchParams(window.location.search);
      params.set('search', localSearch);
      params.set('page', '1');
      window.history.replaceState(null, '', `?${params.toString()}`);
    }
  }, [localSearch, values.search]);

  const effectivePage = debouncedSearch ? 1 : Number(values.page);

  const query = useReceipts({
    page: effectivePage,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: values.status !== 'all' ? values.status : undefined,
    paymentMethod: values.paymentMethod !== 'all' ? values.paymentMethod : undefined,
  });

  const receipts = query.data?.receipts ?? [];
  const meta = query.data?.meta as { page: number; pageSize: number; totalRecords: number; totalPages: number } | undefined;

  const cols: ListColumn<ReceiptRow>[] = [
    { key: 'receiptNumber', header: 'Receipt', card: 'title', render: (r) => <Link href={`/receipts/${r.id}`} className="text-primary hover:underline font-medium">{r.receiptNumber}</Link> },
    { key: 'customerName', header: 'Customer', card: 'subtitle', render: (r) => <>{r.customerName}</> },
    { key: 'paymentNumber', header: 'Payment', render: (r) => <Link href={`/payments/${r.id}`} className="text-primary hover:underline">{r.paymentNumber}</Link> },
    { key: 'invoiceNumber', header: 'Invoice', render: (r) => r.invoiceNumber ? <span className="text-muted-foreground">{r.invoiceNumber}</span> : <span className="text-muted-foreground/50">—</span> },
    { key: 'amount', header: 'Amount', align: 'right', className: 'tabular-nums', render: (r) => `KES ${Number(r.amount).toLocaleString()}` },
    { key: 'paymentMethod', header: 'Method', render: (r) => paymentMethodLabel(r.paymentMethod) },
    { key: 'issuedAt', header: 'Date', render: (r) => formatDateTime(r.issuedAt) },
    { key: 'status', header: 'Status', card: 'badge', render: (r) => <StatusBadge tone={TONES[r.status]} label={receiptStatusLabel(r.status)} /> },
    {
      key: 'actions', header: '', align: 'right', render: (r) => (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon" className="size-8"
            title="Preview receipt"
            aria-label={`Preview receipt ${r.receiptNumber}`}
            onClick={() => setPreviewReceipt(r)}
          >
            <Eye className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} />
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link href={`/receipts/${r.id}`} />}><Eye className="size-4" />View</DropdownMenuItem>
              <DropdownMenuItem render={<a href={receiptPdfUrl(r.id)} target="_blank" rel="noopener noreferrer" />}><Download className="size-4" />Download PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton rows={8} />;
  if (query.isError) return <EmptyState icon={Receipt} title="Could not load receipts" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by receipt number"
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') syncSearchToUrl(); }}
          className="max-w-sm"
        />
        <SelectField id="receiptStatus" label="" options={STATUS_OPTIONS} value={values.status} onChange={(v) => setFilters({ status: v, page: '1' })} />
        <SelectField id="paymentMethod" label="" options={METHOD_OPTIONS} value={values.paymentMethod} onChange={(v) => setFilters({ paymentMethod: v, page: '1' })} />
      </div>

      {receipts.length === 0 ? (
        <EmptyState icon={Receipt} title="No receipts found" description="Receipts are created automatically when a customer payment is approved." />
      ) : (
        <>
          <ResponsiveList records={receipts} columns={cols} getRowKey={(r) => r.id} emptyState={<EmptyState icon={Receipt} title="No receipts" />} />
          {meta && <Pagination page={meta.page} pageSize={meta.pageSize} totalRecords={meta.totalRecords} totalPages={meta.totalPages} onPageChange={setPage} />}
        </>
      )}

      {/* Receipt PDF Preview */}
      <DocumentPdfPreviewDialog
        open={previewReceipt !== null}
        onOpenChange={(o) => { if (!o) setPreviewReceipt(null); }}
        docType="Receipt"
        docNumber={previewReceipt?.receiptNumber ?? ''}
        pdfUrl={previewReceipt ? receiptPdfUrl(previewReceipt.id) : ''}
        downloadFileName={previewReceipt ? `Receipt_${previewReceipt.receiptNumber}.pdf` : ''}
      />
    </div>
  );
}
