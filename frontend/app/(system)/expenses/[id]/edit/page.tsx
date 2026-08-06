'use client';
import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeDollarSign, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/forms/select-field';
import { Skeleton } from '@/components/ui/skeleton';
import { useExpense, useUpdateExpense } from '@/features/expenses/hooks/use-expenses';
import { expenseCategoryLabel, paymentMethodLabel, type ExpenseCategory, type PaymentMethod } from '@/features/expenses/types/expense.types';

const CATEGORY_OPTIONS = (['ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER'] as ExpenseCategory[]).map(c => ({ value: c, label: expenseCategoryLabel(c) }));
const METHOD_OPTIONS = (['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map(m => ({ value: m, label: paymentMethodLabel(m) }));

export default function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const q = useExpense(id);
  const mut = useUpdateExpense(id);

  const d = q.data;
  const [category, setCategory] = useState<string>(d?.category ?? '');
  const [desc, setDesc] = useState<string>(d?.description ?? '');
  const [amount, setAmount] = useState<string>(d?.amount ?? '');
  const [method, setMethod] = useState<string>(d?.paymentMethod ?? '');
  const [reference, setReference] = useState<string>(d?.paymentReference ?? '');
  const [date, setDate] = useState<string>(d?.expenseDate?.split('T')[0] ?? '');
  const [err, setErr] = useState<string | null>(null);

  if (q.isPending) return <div className="w-full max-w-lg space-y-6 p-4 sm:p-6 lg:p-8"><Skeleton className="h-40 w-full" /></div>;
  if (q.isError || !d) return <div className="w-full max-w-lg p-4"><p className="text-sm text-destructive">Could not load expense.</p></div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!desc.trim()) { setErr('A description is required.'); return; }
    if (!amount || Number(amount) <= 0) { setErr('Enter a valid amount.'); return; }
    const body: Record<string, unknown> = {};
    if (category !== d.category) body.category = category;
    if (desc.trim() !== d.description) body.description = desc.trim();
    if (amount !== d.amount) body.amount = amount;
    if (method !== d.paymentMethod) body.paymentMethod = method;
    if (reference.trim() !== (d.paymentReference ?? '')) body.paymentReference = reference.trim() || null;
    if (date !== d.expenseDate.split('T')[0]!) body.expenseDate = new Date(date).toISOString();
    if (Object.keys(body).length === 0) { setErr('No changes to save.'); return; }
    mut.mutate(body, { onSuccess: () => router.push(`/expenses/${id}`) });
  };

  return (
    <div className="w-full max-w-lg space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
      <h2 className="text-lg font-semibold flex items-center gap-2"><BadgeDollarSign className="size-5" />Edit {d.expenseNumber}</h2>
      <form onSubmit={submit} className="space-y-6">
        <Card><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Category</Label><SelectField id="category" label="" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={500} /></div>
          <div className="space-y-2"><Label>Amount (KES)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" /></div>
          <div className="space-y-2"><Label>Payment method</Label><SelectField id="method" label="" options={METHOD_OPTIONS} value={method} onChange={setMethod} /></div>
          {method && method !== 'CASH' && <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>}
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={mut.isPending}>{mut.isPending && <LoaderCircle className="size-4 mr-1 animate-spin" />}Save changes</Button>
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
          </div>
        </CardContent></Card>
      </form>
    </div>
  );
}
