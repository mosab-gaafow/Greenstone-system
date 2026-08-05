'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Truck, MoreHorizontal, FileText, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { SelectField } from '@/components/forms/select-field';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { formatDate } from '@/lib/format';
import { useDeliveries } from '../hooks/use-deliveries';
import { DeliveryStatusBadge } from './delivery-status-badge';
import type { Delivery } from '../types/delivery.types';

const DEFAULTS = { page: '1', search: '', status: 'all' } as const;
const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All delivery statuses' },
  { value: 'PLANNED', label: 'Planned' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function syncSearchToUrl(search: string) {
  const params = new URLSearchParams(window.location.search);
  if (search) params.set('search', search); else params.delete('search');
  params.set('page', '1');
  window.history.replaceState(null, '', window.location.pathname + '?' + params.toString());
}

export function DeliveryList() {
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);
  const urlPage = Number.parseInt(values.page, 10) || 1;

  const [localSearch, setLocalSearch] = useState<string>(values.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(values.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectivePage = debouncedSearch ? 1 : urlPage;
  const isFiltered = localSearch !== '' || values.status !== 'all';

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
    }, 300);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = localSearch.trim();
    setDebouncedSearch(trimmed);
    syncSearchToUrl(trimmed);
  }

  function clearAll() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalSearch('');
    setDebouncedSearch('');
    setFilters({ search: '', status: 'all', page: '1' });
  }

  const query = useDeliveries({
    page: effectivePage, pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: values.status !== 'all' ? (values.status as 'PLANNED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED') : undefined,
  });

  const columns: ListColumn<Delivery>[] = [
    { key: 'deliveryNumber', header: 'Delivery', card: 'title', render: (delivery) => (<div className="min-w-0"><Link href={`/deliveries/${delivery.id}`} className="text-primary font-semibold hover:underline">{delivery.deliveryNumber}</Link><p className="text-muted-foreground text-xs">{delivery.customerName} — Added {formatDate(delivery.createdAt)}</p></div>), sortValue: (delivery) => delivery.deliveryNumber },
    { key: 'orderNumber', header: 'Order', card: 'subtitle', render: (delivery) => delivery.orderNumber },
    { key: 'driverName', header: 'Driver', card: 'meta', render: (delivery) => delivery.driverName },
    { key: 'vehicle', header: 'Vehicle', card: 'meta', render: (delivery) => delivery.vehicleRegistrationNumber },
    { key: 'deliveryDate', header: 'Date', card: 'meta', render: (delivery) => formatDate(delivery.deliveryDate), sortValue: (delivery) => delivery.deliveryDate },
    { key: 'items', header: 'Items', card: 'meta', align: 'right', className: 'tabular-nums', render: (delivery) => String(delivery.itemCount) },
    { key: 'status', header: 'Status', card: 'badge', render: (delivery) => <DeliveryStatusBadge status={delivery.status} /> },
    { key: 'actions', header: '', align: 'right', render: (delivery) => (<DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={`Actions for ${delivery.deliveryNumber}`}><MoreHorizontal className="size-4" aria-hidden /></Button>} /><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/deliveries/${delivery.id}`} />}><FileText className="size-4" aria-hidden />View</DropdownMenuItem></DropdownMenuContent></DropdownMenu>) },
  ];

  if (query.isPending && !query.isPlaceholderData) return <ListSkeleton />;
  if (query.isError) return <EmptyState icon={Truck} title="The deliveries could not be loaded" description="Check your connection and try again." action={<Button onClick={() => void query.refetch()}>Try again</Button>} />;

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-start rounded-lg border p-3 md:p-4">
        <Input className="w-full md:w-[320px] md:flex-none h-11" placeholder="Search by delivery, order or customer" value={localSearch} onChange={(e) => handleSearchChange(e.target.value)} onKeyDown={handleSearchKeyDown} />
        <SelectField id="deliveryStatus" label="" value={values.status} onChange={(v) => { setFilters({ status: v, page: '1' }); }} options={STATUS_OPTIONS} />
      </div>

      <ResponsiveList records={query.data.deliveries} columns={columns} getRowKey={(delivery) => delivery.id} caption="Deliveries" emptyState={<EmptyState icon={Truck} title={isFiltered ? 'No deliveries match those filters' : 'No deliveries yet'} description={isFiltered ? 'Try a different search or clear the filters.' : 'Plan a delivery to reserve stock for an order.'} action={isFiltered ? (<Button variant="outline" onClick={clearAll}>Clear filters</Button>) : (<Button render={<Link href="/deliveries/new" />}><Plus className="size-4" aria-hidden />Plan delivery</Button>)} />} />
      <Pagination page={query.data.meta.page} pageSize={query.data.meta.pageSize} totalRecords={query.data.meta.totalRecords} totalPages={query.data.meta.totalPages} onPageChange={setPage} />
    </div>
  );
}
