'use client';

import { useState } from 'react';
import { BarChart3, Clock, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ReportItem { name: string; description: string; category: string; available: boolean }

const REPORTS: ReportItem[] = [
  // Sales & Customers
  { name: 'Orders Report', description: 'All orders with status, customer, and value.', category: 'Sales & Customers', available: false },
  { name: 'Top Orders by Value', description: 'Highest-value orders in a selected period.', category: 'Sales & Customers', available: false },
  { name: 'Top Customers by Payments', description: 'Customers ranked by approved payments received.', category: 'Sales & Customers', available: false },
  { name: 'Customer Balances', description: 'Outstanding balances for all active customers.', category: 'Sales & Customers', available: false },
  { name: 'Invoices Report', description: 'Issued and voided invoices with payment status.', category: 'Sales & Customers', available: false },
  { name: 'Payments Report', description: 'Customer payments with approval and reversal history.', category: 'Sales & Customers', available: false },
  { name: 'Receipts Report', description: 'Receipts issued from approved payments.', category: 'Sales & Customers', available: false },
  // Operations
  { name: 'Production Report', description: 'Production batches with status and quantities.', category: 'Operations', available: false },
  { name: 'Curing Report', description: 'Curing records with completion status.', category: 'Operations', available: false },
  { name: 'Deliveries Report', description: 'Delivery records with dispatch status.', category: 'Operations', available: false },
  // Stock
  { name: 'Finished Stock Report', description: 'Current finished-product stock quantities.', category: 'Stock', available: false },
  { name: 'Reserved Stock Report', description: 'Stock reserved for orders awaiting dispatch.', category: 'Stock', available: false },
  { name: 'Available Stock Report', description: 'Stock available for new orders.', category: 'Stock', available: false },
  { name: 'Low Stock Report', description: 'Products below their reorder level.', category: 'Stock', available: false },
  { name: 'Stock Movement Report', description: 'Stock-in and stock-out movements with reasons.', category: 'Stock', available: false },
  // Purchasing
  { name: 'Purchases Report', description: 'Supplier purchase records.', category: 'Purchasing', available: false },
  { name: 'Purchase Payments Report', description: 'Payments made to suppliers.', category: 'Purchasing', available: false },
  { name: 'Supplier Report', description: 'Supplier balances and purchase history.', category: 'Purchasing', available: false },
  // Finance
  { name: 'Expenses Report', description: 'General business expenses.', category: 'Finance', available: false },
  { name: 'Salaries Report', description: 'Employee salary records.', category: 'Finance', available: false },
  { name: 'Outstanding Invoices Report', description: 'Invoices with unpaid balances.', category: 'Finance', available: false },
  { name: 'Billing Summary', description: 'Monthly invoicing, payments, and outstanding totals.', category: 'Finance', available: false },
  // Administration
  { name: 'Audit Logs Report', description: 'System audit trail — sensitive actions only.', category: 'Administration', available: false },
  { name: 'User Activity Report', description: 'System usage by user role and action.', category: 'Administration', available: false },
];

const CATEGORIES = ['Sales & Customers', 'Operations', 'Stock', 'Purchasing', 'Finance', 'Administration'] as const;
const CAT_ICONS: Record<string, string> = {
  'Sales & Customers': 'bg-blue-50 text-blue-600',
  'Operations': 'bg-amber-50 text-amber-600',
  'Stock': 'bg-emerald-50 text-emerald-600',
  'Purchasing': 'bg-purple-50 text-purple-600',
  'Finance': 'bg-rose-50 text-rose-600',
  'Administration': 'bg-slate-100 text-slate-600',
};

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<string>('all');

  const filtered = REPORTS.filter((r) => {
    if (cat !== 'all' && r.category !== cat) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const available = REPORTS.filter((r) => r.available).length;

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Hero */}
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center size-10 rounded-xl bg-blue-50 text-blue-600"><BarChart3 className="size-5" /></div>
          <h1 className="text-2xl font-bold">Reports Center</h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl">Management reports across sales, operations, stock, purchasing, finances, and administration.</p>
        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{REPORTS.length}</strong> reports planned</span>
          <span><strong className="text-foreground">{CATEGORIES.length}</strong> categories</span>
          <span><strong className="text-foreground">{available}</strong> available now</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search reports…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={cat === 'all' ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCat('all')}>All</Badge>
          {CATEGORIES.map((c) => (
            <Badge key={c} variant={cat === c ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setCat(c)}>{c}</Badge>
          ))}
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r) => (
          <div key={r.name} className={`rounded-xl border p-4 flex flex-col gap-2 transition-colors ${r.available ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-60'}`}>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center size-8 rounded-lg shrink-0 ${CAT_ICONS[r.category] ?? 'bg-gray-50 text-gray-500'}`}><FileText className="size-4" /></div>
              <span className="text-sm font-medium">{r.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">{r.description}</p>
            <div className="flex items-center gap-2 mt-auto pt-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{r.category}</span>
              {!r.available && <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1"><Clock className="size-3" />Next phase</span>}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reports match your search.</p>}
    </div>
  );
}
