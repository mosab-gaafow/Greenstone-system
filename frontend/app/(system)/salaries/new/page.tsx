'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HandCoins, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/layout/page-header';
import { SelectField } from '@/components/forms/select-field';
import { useCreateSalary } from '@/features/salaries/hooks/use-salaries';
import { paymentMethodLabel, type PaymentMethod } from '@/features/salaries/types/salary.types';
import { API_BASE_URL } from '@/lib/config';

const METHOD_OPTIONS = (['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map(m => ({ value: m, label: paymentMethodLabel(m) }));
const TYPE_OPTIONS = [{ value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }];

interface EmployeeOption { id: string; name: string; salaryFrequency: string; salaryAmount: string }

export default function NewSalaryPage() {
  const router = useRouter();
  const mut = useCreateSalary();
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [empId, setEmpId] = useState('');
  const [type, setType] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [reference, setReference] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]!);
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/employees?page=1&pageSize=100&isActive=true`, { credentials: 'include' })
      .then(r => r.json()).then(d => { if (d.data) setEmployees(d.data as EmployeeOption[]); }).catch(() => {});
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    if (!empId || !type || !periodStart || !periodEnd || !amount || !method || !payDate) { setErr('All required fields must be filled.'); return; }
    const fd = new FormData();
    fd.set('employeeId', empId); fd.set('salaryType', type);
    fd.set('periodStart', new Date(periodStart).toISOString());
    if (periodEnd) fd.set('periodEnd', new Date(periodEnd).toISOString());
    fd.set('amount', amount); fd.set('paymentMethod', method);
    if (reference.trim()) fd.set('paymentReference', reference.trim());
    fd.set('paymentDate', new Date(payDate).toISOString());
    if (notes.trim()) fd.set('notes', notes.trim());
    if (file) fd.set('evidenceFile', file);
    mut.mutate(fd, { onSuccess: (d) => router.push(`/salaries/${d.id}`), onError: (e) => setErr(e.message) });
  };

  return <div className="w-full max-w-lg space-y-6 p-4 sm:p-6 lg:p-8">
    <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-muted-foreground -ml-2 h-9"><ArrowLeft className="size-4" />Back</Button>
    <PageHeader icon={HandCoins} title="Register salary" description="Record an employee salary payment." />
    <form onSubmit={submit} className="space-y-6">
      <Card><CardContent className="space-y-4">
        <div className="space-y-2"><Label>Employee</Label><SelectField id="employee" label="" options={employees.map(e => ({ value: e.id, label: e.name }))} value={empId} onChange={(v) => { setEmpId(v); const emp = employees.find(e => e.id === v); if (emp) { setType(emp.salaryFrequency); setAmount(emp.salaryAmount); } }} /></div>
        <div className="space-y-2"><Label>Type</Label><SelectField id="type" label="" options={TYPE_OPTIONS} value={type} onChange={setType} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Period start</Label><Input type="date" value={periodStart} onChange={(e) => { setPeriodStart(e.target.value); if (type === 'WEEKLY') { const d = new Date(e.target.value); d.setDate(d.getDate() + 6); setPeriodEnd(d.toISOString().split('T')[0]!); } }} /></div>
          <div className="space-y-2"><Label>Period end</Label><Input type="date" value={type === 'WEEKLY' ? periodEnd : periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} readOnly={type === 'WEEKLY'} className={type === 'WEEKLY' ? 'bg-muted' : ''} /></div>
        </div>
        <div className="space-y-2"><Label>Amount (KES)</Label><Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" inputMode="decimal" /></div>
        <div className="space-y-2"><Label>Payment method</Label><SelectField id="method" label="" options={METHOD_OPTIONS} value={method} onChange={setMethod} /></div>
        {method && method !== 'CASH' && <div className="space-y-2"><Label>Reference</Label><Input value={reference} onChange={(e) => setReference(e.target.value)} /></div>}
        <div className="space-y-2"><Label>Payment date</Label><Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Notes (optional)</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <div className="space-y-2"><Label>Evidence (optional)</Label><Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" disabled={mut.isPending} className="w-full">{mut.isPending && <LoaderCircle className="size-4 mr-1 animate-spin" />}Register salary</Button>
      </CardContent></Card>
    </form>
  </div>;
}
