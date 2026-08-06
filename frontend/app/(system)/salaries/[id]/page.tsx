'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Ban, Check, Download, FileText, HandCoins, Pencil } from 'lucide-react';
import { useUpdateSalary } from '@/features/salaries/hooks/use-salaries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useSalary, useApproveSalary, useReverseSalary } from '@/features/salaries/hooks/use-salaries';
import { evidenceDownloadUrl } from '@/features/salaries/api/salaries.api';
import { salaryStatusLabel, salaryTypeLabel, paymentMethodLabel } from '@/features/salaries/types/salary.types';
import { formatDateTime } from '@/lib/format';

const TONES: Record<string, StatusTone> = { PENDING: 'neutral', APPROVED: 'success', REVERSED: 'danger' };

export default function SalaryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useSalary(id);
  const approveMut = useApproveSalary(id);
  const reverseMut = useReverseSalary(id);
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState('');

  if (q.isPending) return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>;
  if (q.isError) return <div className="w-full p-4 sm:p-6 lg:p-8"><EmptyState icon={HandCoins} title="Not found" action={<Button variant="outline" render={<Link href="/salaries" />}><ArrowLeft className="size-4" />Back</Button>} /></div>;

  const s = q.data;
  const canApprove = s.status === 'PENDING';
  const canReverse = s.status === 'APPROVED';

  return <div className="w-full max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" render={<Link href="/salaries" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
    <PageHeader icon={HandCoins} title={s.salaryNumber} badge={<StatusBadge tone={TONES[s.status]} label={salaryStatusLabel(s.status)} />} description={`${s.employeeName} — KES ${Number(s.amount).toLocaleString()}`} />
    <div className="flex flex-wrap gap-2">
      {s.status === 'PENDING' && <Button variant="outline" render={<Link href={`/salaries/${s.id}/edit`} />}><Pencil className="size-4" />Edit</Button>}
      {canApprove && <Button variant="outline" onClick={() => approveMut.mutate()} disabled={approveMut.isPending}><Check className="size-4" />Approve</Button>}
      {canReverse && <Button variant="outline" onClick={() => { setReversing(true); setReason(''); }}><Ban className="size-4" />Reverse</Button>}
    </div>
    <Card><CardContent className="space-y-4">
      <DetailRow label="Employee">{s.employeeName}</DetailRow>
      <DetailRow label="Type">{salaryTypeLabel(s.salaryType)}</DetailRow>
      <DetailRow label="Period">{formatDateTime(s.periodStart)} — {formatDateTime(s.periodEnd)}</DetailRow>
      <DetailRow label="Amount">KES {Number(s.amount).toLocaleString()}</DetailRow>
      <DetailRow label="Method">{paymentMethodLabel(s.paymentMethod)}</DetailRow>
      {s.paymentReference && <DetailRow label="Reference">{s.paymentReference}</DetailRow>}
      <DetailRow label="Payment date">{formatDateTime(s.paymentDate)}</DetailRow>
      {s.notes && <DetailRow label="Notes">{s.notes}</DetailRow>}
      {s.approvedAt && <DetailRow label="Approved">{formatDateTime(s.approvedAt)}</DetailRow>}
      {s.reversalReason && <DetailRow label="Reversal reason">{s.reversalReason}</DetailRow>}
      {s.correctionReason && <DetailRow label="Correction reason">{s.correctionReason}</DetailRow>}
    </CardContent></Card>
    {s.evidence ? (
      <Card><CardContent className="space-y-3"><div className="flex items-center gap-2 text-sm"><FileText className="size-4 text-muted-foreground" /><span>{s.evidence.originalFileName} ({(s.evidence.sizeBytes / 1024).toFixed(1)} KB)</span></div><Button variant="outline" size="sm" render={<a href={evidenceDownloadUrl(s.id)} download />}><Download className="size-3.5" />Download</Button></CardContent></Card>
    ) : <p className="text-sm text-muted-foreground">No evidence.</p>}

    <ConfirmDialog open={reversing} onOpenChange={(o) => { if (!o) setReversing(false); }} title={`Reverse ${s.salaryNumber}?`} description="This cannot be undone." confirmLabel="Reverse" destructive pending={reverseMut.isPending} onConfirm={() => { const t = reason.trim(); if (!t) return; reverseMut.mutate(t, { onSuccess: () => setReversing(false) }); }}>
      <Input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
    </ConfirmDialog>
  </div>;
}
