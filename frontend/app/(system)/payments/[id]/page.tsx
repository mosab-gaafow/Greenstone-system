'use client';
import { use, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Eye, FileText, Upload, Wallet, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PreviewDialog } from '@/components/shared/preview-dialog';
import { DocumentPdfPreviewDialog } from '@/components/shared/document-pdf-preview-dialog';
import { usePayment, useApprovePayment, useReversePayment } from '@/features/customer-payments/hooks/use-payments';
import { useInvoices } from '@/features/invoices/hooks/use-invoices';
import { paymentStatusLabel, paymentMethodLabel } from '@/features/customer-payments/types/payment.types';
import { receiptPdfUrl } from '@/features/receipts/api/receipts.api';
import { evidenceDownloadUrl, evidencePreviewUrl, uploadEvidence } from '@/features/customer-payments/api/payments.api';
import { formatDateTime } from '@/lib/format';

const TONES: Record<string, StatusTone> = { PENDING: 'neutral', APPROVED: 'success', REVERSED: 'danger' };

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = usePayment(id);
  const approveMut = useApprovePayment(id);
  const reverseMut = useReversePayment(id);
  const [approving, setApproving] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [reasonErr, setReasonErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [evidencePreviewOpen, setEvidencePreviewOpen] = useState(false);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);

  // For approval: show invoices for this customer
  const invoicesQuery = useInvoices({ page: 1, pageSize: 100, customerId: q.data?.customerId ?? '' });
  const eligibleInvoices = useMemo(() => invoicesQuery.data?.invoices.filter(inv => inv.status === 'ISSUED') ?? [], [invoicesQuery.data]);

  if (q.isPending) return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>;
  if (q.isError) return <div className="w-full p-4 sm:p-6 lg:p-8"><EmptyState icon={Wallet} title="Not found" action={<Button variant="outline" render={<Link href="/payments" />}><ArrowLeft className="size-4" />Back</Button>} /></div>;

  const p = q.data;
  const canApprove = p.status === 'PENDING';
  const canReverse = p.status === 'APPROVED';

  function doApprove() {
    approveMut.mutate(undefined, { onSuccess: () => setApproving(false) });
  }

  function doReverse() {
    const t = reversalReason.trim();
    if (!t) { setReasonErr('Required.'); return; }
    reverseMut.mutate(t, { onSuccess: () => setReversing(false) });
  }

  return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" render={<Link href="/payments" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
    <PageHeader icon={Wallet} title={p.paymentNumber} badge={<StatusBadge tone={TONES[p.status]} label={paymentStatusLabel(p.status)} />} description={p.customerName} />

    <div className="flex flex-wrap gap-2">
      {canApprove && <Button variant="outline" onClick={() => setApproving(true)} disabled={eligibleInvoices.length === 0}>{eligibleInvoices.length === 0 ? 'No eligible invoice' : 'Approve payment'}</Button>}
      {canReverse && <Button variant="outline" onClick={() => { setReversing(true); setReversalReason(''); setReasonErr(null); }}><Ban className="size-4" />Reverse payment</Button>}
    </div>

    <div className="max-w-2xl space-y-6">
      <Card><CardContent className="space-y-4">
        <DetailRow label="Customer"><Link href={`/customers/${p.customerId}`} className="text-primary hover:underline">{p.customerName}</Link></DetailRow>
        <DetailRow label="Amount">KES {p.amount}</DetailRow>
        <DetailRow label="Method">{paymentMethodLabel(p.paymentMethod)}</DetailRow>
        {p.paymentReference && <DetailRow label="Reference">{p.paymentReference}</DetailRow>}
        <DetailRow label="Date">{formatDateTime(p.paymentDate)}</DetailRow>
        {p.approvedAt && <DetailRow label="Approved">{formatDateTime(p.approvedAt)}</DetailRow>}
        {p.reversedAt && <DetailRow label="Reversed">{formatDateTime(p.reversedAt)}</DetailRow>}
        {p.reversalReason && <DetailRow label="Reversal reason">{p.reversalReason}</DetailRow>}
      </CardContent></Card>

      {p.allocations.length > 0 && <Card><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-4 font-medium">Invoice</th><th className="p-4 text-right font-medium">Amount</th></tr></thead><tbody>{p.allocations.map(a => <tr key={a.id} className="border-b last:border-0"><td className="p-4"><Link href={`/invoices/${a.invoiceId}`} className="text-primary hover:underline">{a.invoiceNumber}</Link></td><td className="p-4 text-right tabular-nums">KES {a.amount}</td></tr>)}</tbody></table></div></CardContent></Card>}

      {p.receiptNumber && p.receiptId && (
        <Card><CardContent className="space-y-3">
          <DetailRow label="Receipt">
            <Link href={`/receipts/${p.receiptId}`} className="text-primary hover:underline">{p.receiptNumber}</Link>
          </DetailRow>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setReceiptPreviewOpen(true)} title="Preview receipt" aria-label={`Preview receipt ${p.receiptNumber}`}><Eye className="size-3.5" />Preview</Button>
            <Button variant="outline" size="sm" render={<a href={receiptPdfUrl(p.receiptId)} target="_blank" rel="noopener noreferrer" />}><Download className="size-3.5" />Download Receipt</Button>
          </div>
        </CardContent></Card>
      )}

      {/* Evidence */}
      <Card><CardContent className="space-y-3">
        <h3 className="text-sm font-semibold">Payment evidence</h3>
        {p.evidence ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground" />
              <span>{p.evidence.originalFileName}</span>
              <span className="text-xs text-muted-foreground">({(p.evidence.sizeBytes / 1024).toFixed(1)} KB) — uploaded {formatDateTime(p.evidence.uploadedAt)}</span>
            </div>
            <div className="flex gap-2">
              {(p.evidence.mimeType.startsWith('image/') || p.evidence.mimeType === 'application/pdf') && (
                <Button variant="outline" size="sm" onClick={() => setEvidencePreviewOpen(true)}><Eye className="size-3.5" />Preview</Button>
              )}
              <Button variant="outline" size="sm" render={<a href={evidenceDownloadUrl(p.id)} download />}><Download className="size-3.5" />Download</Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="size-3.5" />Replace</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">No evidence uploaded.</p>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}><Upload className="size-3.5" />Upload evidence</Button>
          </>
        )}
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true); setUploadErr(null);
          try {
            await uploadEvidence(p.id, file);
            await q.refetch();
          } catch (err: unknown) { setUploadErr(err instanceof Error ? err.message : 'Upload failed.'); }
          finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
        }} />
        {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
        {uploadErr && <p className="text-sm text-destructive">{uploadErr}</p>}
      </CardContent></Card>

      {/* Preview Dialog */}
      {p.evidence && (
        <PreviewDialog
          open={evidencePreviewOpen}
          onOpenChange={setEvidencePreviewOpen}
          title={p.evidence.originalFileName}
          previewUrl={evidencePreviewUrl(p.id)}
          downloadUrl={evidenceDownloadUrl(p.id)}
          mimeType={p.evidence.mimeType}
        />
      )}

      {/* Receipt PDF Preview */}
      {p.receiptId && p.receiptNumber && (
        <DocumentPdfPreviewDialog
          open={receiptPreviewOpen}
          onOpenChange={setReceiptPreviewOpen}
          docType="Receipt"
          docNumber={p.receiptNumber}
          pdfUrl={receiptPdfUrl(p.receiptId)}
          downloadFileName={`Receipt_${p.receiptNumber}.pdf`}
        />
      )}
    </div>

    {/* Approve dialog */}
    <ConfirmDialog open={approving} onOpenChange={setApproving} title={`Approve ${p.paymentNumber}?`} description={`Allocate KES ${p.amount} to invoice ${eligibleInvoices[0]?.invoiceNumber ?? '(none)'}.`} confirmLabel="Approve" pending={approveMut.isPending} onConfirm={doApprove} />

    {/* Reverse dialog */}
    <ConfirmDialog open={reversing} onOpenChange={(o) => { if (!o) { setReversing(false); setReversalReason(''); setReasonErr(null); } }} title={`Reverse ${p.paymentNumber}?`} description="The receipt will be voided." confirmLabel="Reverse" destructive pending={reverseMut.isPending} onConfirm={doReverse}>
      <textarea className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" rows={3} placeholder="Reason (required)" value={reversalReason} onChange={(e) => { setReversalReason(e.target.value); if (reasonErr) setReasonErr(null); }} />
      {reasonErr && <p className="text-destructive text-sm">{reasonErr}</p>}
    </ConfirmDialog>
  </div>;
}
