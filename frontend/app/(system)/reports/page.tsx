'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BadgeDollarSign,
  BarChart3,
  Boxes,
  CheckCircle,
  ClipboardList,
  Clock,
  Factory,
  FileText,
  HandCoins,
  Layers,
  Lock,
  Receipt,
  Scale,
  Search,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ── Report definitions ──────────────────────────────────────────────

interface ReportDefinition {
  name: string;
  description: string;
  category: ReportCategory;
  icon: LucideIcon;
  available: boolean;
  href: string;
}

type ReportCategory =
  | 'Sales & Customers'
  | 'Operations'
  | 'Stock'
  | 'Purchasing'
  | 'Finance'
  | 'Administration';

const CATEGORIES: { key: ReportCategory; label: string; color: string; bg: string; text: string; border: string }[] = [
  { key: 'Sales & Customers', label: 'Sales & Customers', color: 'blue',    bg: 'bg-blue-50',     text: 'text-blue-700',     border: 'border-blue-200' },
  { key: 'Operations',       label: 'Operations',       color: 'amber',   bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200' },
  { key: 'Stock',            label: 'Stock',            color: 'emerald', bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200' },
  { key: 'Purchasing',       label: 'Purchasing',       color: 'violet',  bg: 'bg-violet-50',   text: 'text-violet-700',   border: 'border-violet-200' },
  { key: 'Finance',          label: 'Finance',          color: 'rose',    bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200' },
  { key: 'Administration',   label: 'Administration',   color: 'slate',   bg: 'bg-slate-100',   text: 'text-slate-700',    border: 'border-slate-200' },
];

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.key, c]));

const REPORTS: ReportDefinition[] = [
  // Sales & Customers (Phase 11C1 — available)
  { name: 'Orders Report',              description: 'All orders with status, customer, and value across any period.',               category: 'Sales & Customers', icon: ShoppingCart, available: true, href: '/reports/orders' },
  { name: 'Top Orders by Value',        description: 'Highest-value orders ranked by total amount in a selected period.',            category: 'Sales & Customers', icon: TrendingUp, available: true, href: '/reports/top-orders' },
  { name: 'Top Customers by Payments',  description: 'Customers ranked by approved payments received in a selected period.',         category: 'Sales & Customers', icon: Users, available: true, href: '/reports/top-customers' },
  { name: 'Customer Balances',          description: 'Outstanding balances for every active customer with credit status.',           category: 'Sales & Customers', icon: Scale, available: true, href: '/reports/customer-balances' },
  { name: 'Invoices Report',            description: 'Issued and voided invoices with full payment-status breakdown.',               category: 'Sales & Customers', icon: FileText, available: true, href: '/reports/invoices' },
  { name: 'Payments Report',            description: 'Customer payments with approval dates, methods, and reversal history.',        category: 'Sales & Customers', icon: Wallet, available: true, href: '/reports/payments' },
  { name: 'Receipts Report',            description: 'Official receipts issued from approved customer payments.',                    category: 'Sales & Customers', icon: Receipt, available: true, href: '/reports/receipts' },
  // Operations
  { name: 'Production Report',          description: 'Production batches with status, quantities, and raw-material usage.',          category: 'Operations',       icon: Factory, available: false, href: '' },
  { name: 'Curing Report',              description: 'Curing records with start dates, durations, and release status.',              category: 'Operations',       icon: Layers, available: false, href: '' },
  { name: 'Deliveries Report',          description: 'Delivery trips with dispatch status, driver, vehicle, and transport cost.',    category: 'Operations',       icon: Truck, available: false, href: '' },
  // Stock
  { name: 'Finished Stock Report',      description: 'Current finished-product stock quantities by product.',                        category: 'Stock',            icon: Boxes, available: false, href: '' },
  { name: 'Reserved Stock Report',      description: 'Stock currently reserved for planned deliveries not yet dispatched.',          category: 'Stock',            icon: Lock, available: false, href: '' },
  { name: 'Available Stock Report',     description: 'Stock available for new orders — physical minus reserved.',                    category: 'Stock',            icon: CheckCircle, available: false, href: '' },
  { name: 'Low Stock Report',           description: 'Products whose available quantity is at or below their reorder level.',        category: 'Stock',            icon: AlertTriangle, available: false, href: '' },
  { name: 'Stock Movement Report',      description: 'All stock-in and stock-out movements with reasons and reference documents.',   category: 'Stock',            icon: ArrowLeftRight, available: false, href: '' },
  // Purchasing
  { name: 'Purchases Report',           description: 'Supplier purchase records with raw-material receipts and costs.',              category: 'Purchasing',       icon: ClipboardList, available: false, href: '' },
  { name: 'Purchase Payments Report',   description: 'Payments made to suppliers with approval status and allocations.',             category: 'Purchasing',       icon: HandCoins, available: false, href: '' },
  { name: 'Supplier Report',            description: 'Supplier master data with current balances and purchase history.',             category: 'Purchasing',       icon: Warehouse, available: false, href: '' },
  // Finance
  { name: 'Expenses Report',            description: 'General business expenses by category with evidence where uploaded.',           category: 'Finance',          icon: BadgeDollarSign, available: false, href: '' },
  { name: 'Salaries Report',            description: 'Employee salary records with approval, correction, and reversal history.',     category: 'Finance',          icon: HandCoins, available: false, href: '' },
  { name: 'Outstanding Invoices Report',description: 'Invoices with unpaid or partially-paid balances past their due dates.',        category: 'Finance',          icon: Clock, available: false, href: '' },
  { name: 'Billing Summary',            description: 'Monthly aggregates — invoicing, payments received, expenses, and outstanding.',category: 'Finance',          icon: BarChart3, available: false, href: '' },
  // Administration
  { name: 'Audit Logs Report',          description: 'System audit trail — filtered by module, action, user, and date range.',      category: 'Administration',   icon: ShieldCheck, available: false, href: '' },
  { name: 'User Activity Report',       description: 'System usage summary by user, role, and action type.',                         category: 'Administration',   icon: Activity, available: false, href: '' },
];

// ── Page component ───────────────────────────────────────────────────

export default function ReportsPage() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const availableCount = useMemo(() => REPORTS.filter((r) => r.available).length, []);

  const filtered = useMemo(() => {
    let list = REPORTS;
    if (activeCategory !== 'all') {
      list = list.filter((r) => r.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
    }
    return list;
  }, [search, activeCategory]);

  const countsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of REPORTS) {
      map.set(r.category, (map.get(r.category) ?? 0) + 1);
    }
    return map;
  }, []);

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center size-12 rounded-xl bg-blue-50 text-blue-600 shrink-0">
              <BarChart3 className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports Center</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Management reports across sales, operations, stock, purchasing, finance, and administration.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mt-5 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{REPORTS.length}</strong> planned reports
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-foreground">{CATEGORIES.length}</strong> categories
            </span>
            <span aria-hidden="true">·</span>
            <span>
              <strong className="text-foreground">{availableCount}</strong> available now
            </span>
          </div>
        </div>
        {/* subtle bottom gradient bar */}
        <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-rose-500" />
      </div>

      {/* ── Search + Category filters ───────────────────────────── */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reports by name or description…"
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
              activeCategory === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
            }`}
          >
            All reports
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${activeCategory === 'all' ? 'bg-background/20' : 'bg-muted'}`}>
              {REPORTS.length}
            </span>
          </button>
          {CATEGORIES.map((c) => {
            const count = countsByCategory.get(c.key) ?? 0;
            const isActive = activeCategory === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCategory(c.key)}
                className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors border ${
                  isActive
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                }`}
              >
                {c.label}
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${isActive ? 'bg-black/10' : 'bg-muted'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Report cards grid ───────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const cat = CATEGORY_MAP.get(r.category)!;
            const cardContent = (
              <>
                {/* Icon + title row */}
                <div className="flex items-start gap-3">
                  <div className={`flex items-center justify-center size-10 rounded-lg shrink-0 ${cat.bg} ${cat.text}`}>
                    <r.icon className="size-5" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h3 className="text-sm font-semibold leading-snug">{r.name}</h3>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                  {r.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1">
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${cat.text}`}>
                    {r.category}
                  </span>
                  {r.available ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-green-600">
                      <span className="size-1.5 rounded-full bg-green-500" />
                      Available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock className="size-3" />
                      Next phase
                    </span>
                  )}
                </div>
              </>
            );

            if (r.available) {
              return (
                <Link
                  key={r.name}
                  href={r.href}
                  className={`group relative rounded-xl border bg-card p-5 flex flex-col gap-3 transition-all hover:shadow-md hover:border-primary/30 ${cat.border}`}
                  style={{ borderLeftWidth: '3px' }}
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={r.name}
                className={`group relative rounded-xl border bg-card p-5 flex flex-col gap-3 opacity-60 ${cat.border}`}
                style={{ borderLeftWidth: '3px' }}
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No reports match your search.</p>
          <button
            type="button"
            className="text-xs text-primary hover:underline mt-1"
            onClick={() => { setSearch(''); setActiveCategory('all'); }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
