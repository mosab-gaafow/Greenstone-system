'use client';
import { Suspense, useCallback, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Wallet, Plus, Trash2 } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { FormSection } from '@/components/forms/form-section';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { useCreatePayment } from '@/features/customer-payments/hooks/use-payments';
import { useCustomers } from '@/features/customers/hooks/use-customers';
import { useInvoices } from '@/features/invoices/hooks/use-invoices';
import { fetchInvoice } from '@/features/invoices/api/invoices.api';
import type { InvoiceDetail } from '@/features/invoices/types/invoice.types';
import { PAYMENT_METHODS } from '@/features/customer-payments/types/payment.types';

const METHOD_LABELS: Record<string, string> = { CASH: 'Cash', MPESA: 'M-Pesa', BANK_TRANSFER: 'Bank transfer', CHEQUE: 'Cheque' };

const schema = z.object({
  customerId: z.string().min(1, 'Select a customer.'),
  paymentMethod: z.enum(PAYMENT_METHODS, { message: 'Select a method.' }),
  paymentReference: z.string().trim().max(200).optional(),
  paymentDate: z.coerce.date(),
});

type Allocation = { invoiceId: string; amount: string };

function PaymentForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preCustomer = params.get('customerId') ?? '';
  const preInvoice = params.get('invoiceId') ?? '';
  const createPayment = useCreatePayment();

  const { register, control, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { customerId: preCustomer, paymentMethod: 'CASH' as const, paymentReference: '', paymentDate: new Date().toISOString().split('T')[0] as unknown as Date },
  });

  const customerId = watch('customerId');
  const method = watch('paymentMethod');

  const [allocations, setAllocations] = useState<Allocation[]>(
    preInvoice && preCustomer ? [{ invoiceId: preInvoice, amount: '' }] : [],
  );
  const [allocError, setAllocError] = useState<string | null>(null);

  const custQuery = useCustomers({ page: 1, pageSize: 100 });
  const custOptions = useMemo(() => {
    const customers = custQuery.data?.customers ?? [];
    return customers.filter(c => c.isActive).map(c => ({ value: c.id, label: c.name }));
  }, [custQuery.data]);

  const invoicesQuery = useInvoices(customerId ? { page: 1, pageSize: 100, customerId } : { page: 1, pageSize: 0 });
  const eligibleInvoiceIds = useMemo(
    () => (invoicesQuery.data?.invoices ?? []).filter(inv => inv.status === 'ISSUED').map(inv => inv.id),
    [invoicesQuery.data],
  );

  // Fetch finance details for each eligible invoice to get outstanding amounts
  const financeQueries = useQueries({
    queries: eligibleInvoiceIds.map(id => ({
      queryKey: ['invoices', 'detail', id] as const,
      queryFn: () => fetchInvoice(id),
      enabled: eligibleInvoiceIds.length > 0,
    })),
  });

  const financeByInvoiceId = useMemo(() => {
    const map: Record<string, InvoiceDetail> = {};
    for (let i = 0; i < eligibleInvoiceIds.length; i++) {
      const data = financeQueries[i]?.data;
      if (data) map[eligibleInvoiceIds[i]!] = data;
    }
    return map;
  }, [eligibleInvoiceIds, financeQueries]);

  const totalAllocated = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const usedInvoiceIds = new Set(allocations.map(a => a.invoiceId));

  function addRow() { setAllocations([...allocations, { invoiceId: '', amount: '' }]); setAllocError(null); }
  function removeRow(i: number) { setAllocations(allocations.filter((_, idx) => idx !== i)); setAllocError(null); }
  function updateRow(i: number, field: keyof Allocation, value: string) {
    setAllocations(allocations.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
    setAllocError(null);
  }

  function outstandingFor(invoiceId: string): string {
    return financeByInvoiceId[invoiceId]?.finance?.outstandingAmount ?? '0.00';
  }

  const onSubmit = useCallback(() => {
    const validAllocs = allocations.filter(a => a.invoiceId && Number(a.amount) > 0);
    if (validAllocs.length === 0) { setAllocError('Add at least one invoice allocation.'); return; }
    const total = validAllocs.reduce((s, a) => s + Number(a.amount), 0);
    createPayment.mutate(
      { customerId, amount: total.toFixed(2), paymentMethod: method, paymentReference: undefined, paymentDate: new Date(), allocations: validAllocs },
      { onSuccess: (p) => router.push(`/payments/${p.id}`) },
    );
  }, [allocations, createPayment, router, customerId, method]);

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <Button variant="ghost" size="sm" render={<Link href="/payments" />} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
      <PageHeader icon={Wallet} title="Record payment" />

      <div className="max-w-xl space-y-6">
        <FormSection title="Customer" icon={Wallet}>
          <Controller name="customerId" control={control} render={({ field }) => (
            <SearchableSelect id="customerId" label="Customer" required value={field.value} onChange={(v: string) => { field.onChange(v); setAllocations([]); setAllocError(null); }} options={custOptions} placeholder="Select a customer" searchPlaceholder="Search" emptyMessage="No active customers" error={errors.customerId?.message} />
          )} />
        </FormSection>

        {customerId && eligibleInvoiceIds.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Invoice allocations</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="size-3" />Add invoice</Button>
            </div>
            {allocations.map((a, i) => {
              const maxAmt = a.invoiceId ? outstandingFor(a.invoiceId) : undefined;
              return (
                <div key={i} className="flex items-end gap-2 rounded-lg border p-3">
                  <div className="flex-1 space-y-2">
                    <select className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" value={a.invoiceId} onChange={e => updateRow(i, 'invoiceId', e.target.value)}>
                      <option value="">Select invoice</option>
                      {eligibleInvoiceIds.filter(id => id === a.invoiceId || !usedInvoiceIds.has(id)).map(id => {
                        const det = financeByInvoiceId[id];
                        const outstanding = det?.finance?.outstandingAmount ?? '—';
                        return <option key={id} value={id}>{det?.invoiceNumber ?? id} — KES {det?.totalAmount ?? '—'} (outstanding KES {outstanding})</option>;
                      })}
                    </select>
                    {a.invoiceId && maxAmt && (
                      <p className="text-xs text-muted-foreground">Outstanding: KES {maxAmt}</p>
                    )}
                  </div>
                  <div className="w-32 space-y-2">
                    <Input type="text" inputMode="decimal" placeholder="Amount" value={a.amount} onChange={e => updateRow(i, 'amount', e.target.value)} />
                    {maxAmt && Number(a.amount) > Number(maxAmt) && (
                      <p className="text-xs text-destructive">Exceeds KES {maxAmt}</p>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)}><Trash2 className="size-4" /></Button>
                </div>
              );
            })}
            {allocations.length === 0 && <p className="text-muted-foreground text-sm">No invoices added yet. Click &quot;Add invoice&quot; to allocate this payment.</p>}
            {allocations.length > 0 && totalAllocated > 0 && (
              <p className="text-sm">Payment total: <span className="font-semibold tabular-nums">KES {totalAllocated.toFixed(2)}</span></p>
            )}
            {allocError && <p className="text-destructive text-sm">{allocError}</p>}
          </div>
        )}

        {customerId && eligibleInvoiceIds.length === 0 && !invoicesQuery.isPending && (
          <p className="text-muted-foreground text-sm">This customer has no ISSUED invoices. Create an invoice first.</p>
        )}

        <div className="space-y-2"><Label htmlFor="method">Payment method</Label>
          <Controller name="paymentMethod" control={control} render={({ field }) => (
            <select className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" value={field.value} onChange={field.onChange}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m] ?? m}</option>)}
            </select>
          )} />
        </div>
        {method !== 'CASH' && <div className="space-y-2"><Label htmlFor="ref">Reference (required)</Label><Input id="ref" type="text" placeholder="M-Pesa code, bank ref, or cheque number" {...register('paymentReference')} />{errors.paymentReference?.message && <p className="text-destructive text-sm">{errors.paymentReference.message}</p>}</div>}
        <div className="space-y-2"><Label htmlFor="date">Payment date</Label><Input id="date" type="date" {...register('paymentDate')} />{errors.paymentDate?.message && <p className="text-destructive text-sm">{errors.paymentDate.message}</p>}</div>

        <div className="flex gap-3">
          <Button type="button" onClick={onSubmit} disabled={createPayment.isPending || totalAllocated === 0} className="h-11">
            {createPayment.isPending ? 'Saving…' : totalAllocated === 0 ? 'Add invoice allocations' : `Record payment — KES ${totalAllocated.toFixed(2)}`}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={createPayment.isPending} className="h-11">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

export default function NewPaymentPage() {
  return <Suspense><PaymentForm /></Suspense>;
}
