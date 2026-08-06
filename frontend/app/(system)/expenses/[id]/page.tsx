'use client';
import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, Download, FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { DetailRow } from '@/components/data-display/detail-row';
import { EmptyState } from '@/components/data-display/empty-state';
import { PreviewDialog } from '@/components/shared/preview-dialog';
import { useExpense } from '@/features/expenses/hooks/use-expenses';
import { evidenceDownloadUrl } from '@/features/expenses/api/expenses.api';
import { expenseCategoryLabel, paymentMethodLabel } from '@/features/expenses/types/expense.types';
import { formatDateTime } from '@/lib/format';

export default function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const q = useExpense(id);

  if (q.isPending) return <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-40 w-full" /></div>;
  if (q.isError) return <div className="w-full p-4 sm:p-6 lg:p-8"><EmptyState icon={BadgeDollarSign} title="Expense not found" action={<Button variant="outline" render={<Link href="/expenses" />}><ArrowLeft className="size-4" />Back</Button>} /></div>;

  const e = q.data;

  return <div className="w-full max-w-2xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="flex items-center justify-between">
      <Button variant="ghost" size="sm" render={<Link href="/expenses" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back to expenses</Button>
      <Button variant="outline" size="sm" render={<Link href={`/expenses/${e.id}/edit`} />}><Pencil className="size-3.5" />Edit</Button>
    </div>
    <PageHeader icon={BadgeDollarSign} title={e.expenseNumber} description={`${expenseCategoryLabel(e.category)} — KES ${Number(e.amount).toLocaleString()}`} />

    <Card><CardContent className="space-y-4">
      <DetailRow label="Category">{expenseCategoryLabel(e.category)}</DetailRow>
      <DetailRow label="Description">{e.description}</DetailRow>
      <DetailRow label="Amount">KES {Number(e.amount).toLocaleString()}</DetailRow>
      <DetailRow label="Payment method">{paymentMethodLabel(e.paymentMethod)}</DetailRow>
      {e.paymentReference && <DetailRow label="Reference">{e.paymentReference}</DetailRow>}
      <DetailRow label="Date">{formatDateTime(e.expenseDate)}</DetailRow>
    </CardContent></Card>

    {e.evidence ? (
      <Card><CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm"><FileText className="size-4 text-muted-foreground" /><span>{e.evidence.originalFileName} ({(e.evidence.sizeBytes / 1024).toFixed(1)} KB)</span></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" render={<a href={evidenceDownloadUrl(e.id)} download />}><Download className="size-3.5" />Download</Button>
        </div>
      </CardContent></Card>
    ) : (
      <p className="text-sm text-muted-foreground">No evidence uploaded.</p>
    )}
  </div>;
}
