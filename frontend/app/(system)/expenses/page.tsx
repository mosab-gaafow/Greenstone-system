'use client';
import Link from 'next/link';
import { BadgeDollarSign, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/page-header';
import { ExpenseList } from '@/features/expenses/components/expense-list';

export default function ExpensesPage() {
  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      <PageHeader icon={BadgeDollarSign} title="Expenses" description="General business expenses." secondaryActions={<Button render={<Link href="/expenses/new" />} className="h-11"><Plus className="size-4" />Record expense</Button>} />
      <ExpenseList />
    </div>
  );
}
