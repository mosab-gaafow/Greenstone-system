'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HandCoins, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/forms/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useSalary, useUpdateSalary } from '@/features/salaries/hooks/use-salaries';
import { paymentMethodLabel, type PaymentMethod } from '@/features/salaries/types/salary.types';
import { API_BASE_URL } from '@/lib/config';

const METHOD_OPTIONS = (['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map(m => ({ value: m, label: paymentMethodLabel(m) }));
const TYPE_OPTIONS = [{ value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }];

export default function EditSalaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const q = useSalary(id);
  const mut = useUpdateSalary(id);
  const d = q.data;
  const [type, setType] = useState<string>(d?.salaryType ?? '');
  const [periodStart, setPeriodStart] = useState<string>(d?.periodStart?.split('T')[0] ?? '');
  const [periodEnd, setPeriodEnd] = useState<string>(d?.periodEnd?.split('T')[0] ?? '');
  const [amount, setAmount] = useState<string>(d?.amount ?? '');
  const [method, setMethod] = useState<string>(d?.paymentMethod ?? '');
  const [reference, setReference] = useState<string>(d?.paymentReference ?? '');
  const [payDate, setPayDate] = useState<string>(d?.paymentDate?.split('T')[0] ?? '');
  const [notes, setNotes] = useState<string>(d?.notes ?? '');
  const [err, setErr] = useState<string | null>(null);

  if (q.isPending) return <div className="w-full max-w-lg p-4"><Skeleton className="h-40 w-full" /></div>;
  if (!d || d.status !== 'PENDING') return <div className="w-full max-w-lg p-4"><p className="text-sm text-destructive">This salary cannot be edited (status is not PENDING).</p></div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const body: Record<string, unknown> = {};
    if (type !== d.salaryType) body.salaryType = type;
    if (periodStart !== d.periodStart.split('T')[0]!) body.periodStart = new Date(periodStart).toISOString();
    if (periodEnd !== d.periodEnd.split('T')[0]!) body.periodEnd = new Date(periodEnd).toISOString();
    if (amount !== d.amount) body.amount = amount;
    if (method !== d.paymentMethod) body.paymentMethod = method;
    if (reference !== (d.paymentReference ?? '')) body.paymentReference = reference.trim() || null;
    if (payDate !== d.paymentDate.split('T')[0]!) body.paymentDate = new Date(payDate).toISOString();
    if (notes !== (d.notes ?? '')) body.notes = notes.trim() || null;
    if (Object.keys(body).length === 0) { setErr('No changes to save.'); return; }
    mut.mutate(body, { onSuccess: () => router.push(`/salaries/${id}`) });
  };

  return <div className="w-full max-w-lg space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
    <h2 className="text-lg font-semibold flex items-center gap-2"><HandCoins className="size-5" />Edit {d.salaryNumber}</h2>
    <form onSubmit={submit} className="space-y-6">
      <Card><CardContent className="space-y-4">
        <div className="space-y-2"><Label>Type</Label><SelectField id="type" label="" options={TYPE_OPTIONS} value={type} onChange={setType} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Period start</Label><Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); if (type === 'WEEKLY') { const ed = new Date(e.target.value); ed.setDate(ed.getDate() + 6); setPeriodEnd(ed.toISOString().split('T')[0]!); } }} /></div>
          <div className="space-y-2"><Label>Period end</Label><Input type="date" value={type === 'WEEKLY' ? periodEnd : periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} readOnly={type === 'WEEKLY'} className={type === 'WEEKLY' ? 'bg-muted' : ''} /></div>
        </div>
        <div className="space-y-2"><Label>Amount (KES)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
        <div className="space-y-2"><Label>Payment method</Label><SelectField id="method" label="" options={METHOD_OPTIONS} value={method} onChange={setMethod} /></div>
        {method && method !== 'CASH' && <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>}
        <div className="space-y-2"><Label>Payment date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <div className="flex gap-2">
          <Button type="submit" disabled={mut.isPending}>{mut.isPending && <LoaderCircle className="size-4 mr-1 animate-spin" />}Save changes</Button>
          <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
        </div>
      </CardContent></Card>
    </form>
  </div>;
}
