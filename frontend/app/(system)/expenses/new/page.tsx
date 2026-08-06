'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BadgeDollarSign, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/forms/select-field';
import { PageHeader } from '@/components/layout/page-header';
import { useCreateExpense } from '@/features/expenses/hooks/use-expenses';
import { expenseCategoryLabel, paymentMethodLabel, type ExpenseCategory, type PaymentMethod } from '@/features/expenses/types/expense.types';

const CATEGORY_OPTIONS = (['ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER'] as ExpenseCategory[]).map(c => ({ value: c, label: expenseCategoryLabel(c) }));
const METHOD_OPTIONS = (['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map(m => ({ value: m, label: paymentMethodLabel(m) }));

export default function NewExpensePage() {
  const router = useRouter();
  const mut = useCreateExpense();
  const [category, setCategory] = useState<string>('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('');
  const [reference, setReference] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!category || !desc.trim() || !amount || !method || !date) { setErr('Fill in all required fields.'); return; }
    const fd = new FormData();
    fd.set('category', category); fd.set('description', desc.trim());
    fd.set('amount', amount); fd.set('paymentMethod', method);
    if (reference.trim()) fd.set('paymentReference', reference.trim());
    fd.set('expenseDate', new Date(date).toISOString());
    if (file) fd.set('evidenceFile', file);
    mut.mutate(fd, { onSuccess: (d) => router.push(`/expenses/${d.id}`), onError: (e) => setErr(e.message) });
  };

  return (
    <div className="w-full max-w-lg space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
      <PageHeader icon={BadgeDollarSign} title="Record expense" description="Record a general business expense." />
      <form onSubmit={submit} className="space-y-6">
        <Card><CardContent className="space-y-4">
          <div className="space-y-2"><Label>Category</Label><SelectField id="category" label="" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} /></div>
          <div className="space-y-2"><Label>Description</Label><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Electricity bill" maxLength={500} /></div>
          <div className="space-y-2"><Label>Amount (KES)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" /></div>
          <div className="space-y-2"><Label>Payment method</Label><SelectField id="method" label="" options={METHOD_OPTIONS} value={method} onChange={setMethod} /></div>
          {method && method !== 'CASH' && <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction reference" /></div>}
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Evidence (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit" disabled={mut.isPending} className="w-full">{mut.isPending && <LoaderCircle className="size-4 mr-1 animate-spin" />}Record expense</Button>
        </CardContent></Card>
      </form>
    </div>
  );
}
