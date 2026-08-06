'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, HandCoins, MoreHorizontal, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/forms/select-field';
import { StatusBadge, type StatusTone } from '@/components/data-display/status-badge';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { EmptyState } from '@/components/data-display/empty-state';
import { Pagination } from '@/components/data-display/pagination';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useSalaries, salaryKeys } from '@/features/salaries/hooks/use-salaries';
import { salaryStatusLabel, salaryTypeLabel, paymentMethodLabel, type Salary } from '@/features/salaries/types/salary.types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/format';

const DEFAULTS = { page: '1', search: '', status: 'all', salaryType: 'all', paymentMethod: 'all' } as const;
const TONES: Record<string, StatusTone> = { PENDING: 'neutral', APPROVED: 'success', REVERSED: 'danger' };

export function SalaryList() {
  const qc = useQueryClient();
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = (v: string) => { setLocalSearch(v); if (debounceRef.current) clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => { setDebouncedSearch(v); setFilters({ search: v || '', page: '1' }); }, 300); };
  const syncUrl = () => { if (debounceRef.current) clearTimeout(debounceRef.current); setDebouncedSearch(localSearch); if (localSearch !== values.search) { const p = new URLSearchParams(window.location.search); p.set('search', localSearch); p.set('page', '1'); window.history.replaceState(null, '', '?' + p.toString()); } };

  const query = useSalaries({ page: debouncedSearch ? 1 : Number(values.page), pageSize: 25, search: debouncedSearch || undefined, status: values.status !== 'all' ? values.status : undefined, salaryType: values.salaryType !== 'all' ? values.salaryType : undefined, paymentMethod: values.paymentMethod !== 'all' ? values.paymentMethod : undefined });
  const salaries = query.data?.salaries ?? [];
  const meta = query.data?.meta as { page: number; pageSize: number; totalRecords: number; totalPages: number } | undefined;

  const cols: ListColumn<Salary>[] = [
    { key: 'salaryNumber', header: 'Salary', card: 'title', render: (s) => <Link href={`/salaries/${s.id}`} className="text-primary font-semibold hover:underline">{s.salaryNumber}</Link> },
    { key: 'employeeName', header: 'Employee', card: 'subtitle', render: (s) => s.employeeName },
    { key: 'salaryType', header: 'Type', render: (s) => salaryTypeLabel(s.salaryType) },
    { key: 'period', header: 'Period', render: (s) => `${new Date(s.periodStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(s.periodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` },
    { key: 'amount', header: 'Amount', align: 'right', className: 'tabular-nums', render: (s) => `KES ${Number(s.amount).toLocaleString()}` },
    { key: 'paymentMethod', header: 'Method', render: (s) => paymentMethodLabel(s.paymentMethod) },
    { key: 'paymentDate', header: 'Date', render: (s) => formatDateTime(s.paymentDate) },
    { key: 'status', header: 'Status', card: 'badge', render: (s) => <StatusBadge tone={TONES[s.status]} label={salaryStatusLabel(s.status)} /> },
    { key: 'actions', header: '', align: 'right', render: (s) => <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/salaries/${s.id}`} />}><Eye className="size-4" />View</DropdownMenuItem>{s.status === 'PENDING' && <DropdownMenuItem render={<Link href={`/salaries/${s.id}/edit`} />}><Pencil className="size-4" />Edit</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu> },
  ];

  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton rows={8} />;
  if (query.isError) return <EmptyState icon={HandCoins} title="Could not load" />;

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3">
      <Input placeholder="Search by salary or employee…" value={localSearch} onChange={(e) => handleSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') syncUrl(); }} className="max-w-sm" />
      <SelectField id="status" label="" options={[{ value: 'all', label: 'All statuses' }, { value: 'PENDING', label: 'Pending' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REVERSED', label: 'Reversed' }]} value={values.status} onChange={(v) => setFilters({ status: v, page: '1' })} />
      <SelectField id="salaryType" label="" options={[{ value: 'all', label: 'All types' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} value={values.salaryType} onChange={(v) => setFilters({ salaryType: v, page: '1' })} />
      <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: salaryKeys.all })} title="Refresh"><RefreshCw className="size-4" /></Button>
    </div>
    {salaries.length === 0 ? <EmptyState icon={HandCoins} title="No salaries" description="Register an employee salary." /> : <><ResponsiveList records={salaries} columns={cols} getRowKey={(s) => s.id} emptyState={<EmptyState icon={HandCoins} title="No salaries" />} />{meta && <Pagination page={meta.page} pageSize={meta.pageSize} totalRecords={meta.totalRecords} totalPages={meta.totalPages} onPageChange={setPage} />}</>}
  </div>;
}
