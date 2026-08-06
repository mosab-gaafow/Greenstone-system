'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { BadgeDollarSign, Eye, MoreHorizontal, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/forms/select-field';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { EmptyState } from '@/components/data-display/empty-state';
import { Pagination } from '@/components/data-display/pagination';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useExpenses, expenseKeys } from '@/features/expenses/hooks/use-expenses';
import { expenseCategoryLabel, paymentMethodLabel, type Expense, type ExpenseCategory, type PaymentMethod } from '@/features/expenses/types/expense.types';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useQueryClient } from '@tanstack/react-query';
import { formatDateTime } from '@/lib/format';

const DEFAULTS = { page: '1', search: '', category: 'all', paymentMethod: 'all' } as const;
const PAGE_SIZE = 25;

const CATEGORY_OPTIONS = [{ value: 'all', label: 'All categories' }, ...(['ELECTRICITY', 'WATER', 'RENT', 'TRANSPORT', 'MAINTENANCE', 'SUPPLIES', 'COMMUNICATION', 'INSURANCE', 'LICENSES', 'OTHER'] as ExpenseCategory[]).map(c => ({ value: c, label: expenseCategoryLabel(c) }))];
const METHOD_OPTIONS = [{ value: 'all', label: 'All methods' }, ...(['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE'] as PaymentMethod[]).map(m => ({ value: m, label: paymentMethodLabel(m) }))];

export function ExpenseList() {
  const qc = useQueryClient();
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearchChange = (v: string) => {
    setLocalSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setDebouncedSearch(v); setFilters({ search: v || '', page: '1' }); }, 300);
  };

  const syncSearchToUrl = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setDebouncedSearch(localSearch);
    if (localSearch !== values.search) { const p = new URLSearchParams(window.location.search); p.set('search', localSearch); p.set('page', '1'); window.history.replaceState(null, '', '?' + p.toString()); }
  };

  const query = useExpenses({
    page: debouncedSearch ? 1 : Number(values.page), pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    category: values.category !== 'all' ? values.category : undefined,
    paymentMethod: values.paymentMethod !== 'all' ? values.paymentMethod : undefined,
  });

  const expenses = query.data?.expenses ?? [];
  const meta = query.data?.meta as { page: number; pageSize: number; totalRecords: number; totalPages: number } | undefined;

  const cols: ListColumn<Expense>[] = [
    { key: 'expenseNumber', header: 'Expense', card: 'title', render: (e) => <Link href={`/expenses/${e.id}`} className="text-primary font-semibold hover:underline">{e.expenseNumber}</Link> },
    { key: 'category', header: 'Category', card: 'subtitle', render: (e) => expenseCategoryLabel(e.category) },
    { key: 'description', header: 'Description', card: 'meta', render: (e) => e.description },
    { key: 'amount', header: 'Amount', align: 'right', className: 'tabular-nums', render: (e) => `KES ${Number(e.amount).toLocaleString()}` },
    { key: 'paymentMethod', header: 'Method', render: (e) => paymentMethodLabel(e.paymentMethod) },
    { key: 'expenseDate', header: 'Date', render: (e) => formatDateTime(e.expenseDate) },
    { key: 'actions', header: '', align: 'right', render: (e) => (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Actions"><MoreHorizontal className="size-4" /></Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/expenses/${e.id}`} />}><Eye className="size-4" />View</DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/expenses/${e.id}/edit`} />}><Pencil className="size-4" />Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) },
  ];

  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton rows={8} />;
  if (query.isError) return <EmptyState icon={BadgeDollarSign} title="Could not load expenses" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search expenses…" value={localSearch} onChange={(e) => handleSearchChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') syncSearchToUrl(); }} className="max-w-sm" />
        <SelectField id="category" label="" options={CATEGORY_OPTIONS} value={values.category} onChange={(v) => setFilters({ category: v, page: '1' })} />
        <SelectField id="paymentMethod" label="" options={METHOD_OPTIONS} value={values.paymentMethod} onChange={(v) => setFilters({ paymentMethod: v, page: '1' })} />
        <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: expenseKeys.all })} title="Refresh"><RefreshCw className="size-4" /></Button>
      </div>
      {expenses.length === 0 ? <EmptyState icon={BadgeDollarSign} title="No expenses" description="Record a general business expense." /> : (
        <>
          <ResponsiveList records={expenses} columns={cols} getRowKey={(e) => e.id} emptyState={<EmptyState icon={BadgeDollarSign} title="No expenses" />} />
          {meta && <Pagination page={meta.page} pageSize={meta.pageSize} totalRecords={meta.totalRecords} totalPages={meta.totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
}
