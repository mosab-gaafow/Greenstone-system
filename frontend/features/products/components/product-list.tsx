'use client';

import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResponsiveList, type ListColumn } from '@/components/data-display/responsive-list';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/data-display/empty-state';
import { ListSkeleton } from '@/components/data-display/list-skeleton';
import { Pagination } from '@/components/data-display/pagination';
import { SearchInput } from '@/components/shared/search-input';
import { FilterSelect } from '@/components/shared/filter-select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canManageUsers } from '@/lib/permissions';
import { useProducts } from '../hooks/use-products';
import { ProductActions } from './product-actions';
import { categoryLabel, type Product, type ProductCategory } from '../types/product.types';

const DEFAULTS = {
  page: '1',
  search: '',
  category: 'all',
  status: 'all',
} as const;

const CATEGORY_FILTER = [
  { value: 'all', label: 'All categories' },
  { value: 'HOLLOW_BLOCK', label: 'Hollow blocks' },
  { value: 'HOLLOW_POT', label: 'Hollow pots' },
];

const STATUS_FILTER = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const PAGE_SIZE = 25;

export function ProductList() {
  const { user } = useCurrentUser();
  const { values, setFilters, setPage } = useUrlFilters(DEFAULTS);

  // Products are master data. The approved matrix gives the Accountant read
  // access only, so the write actions are hidden from them — while the backend
  // refuses them regardless of what the interface shows.
  const canEdit = canManageUsers(user);

  const page = Number.parseInt(values.page, 10) || 1;

  const query = useProducts({
    page,
    pageSize: PAGE_SIZE,
    search: values.search || undefined,
    category: values.category === 'all' ? undefined : (values.category as ProductCategory),
    isActive: values.status === 'all' ? undefined : values.status === 'active',
  });

  const columns: ListColumn<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      card: 'title',
      render: (product) => (
        <Link href={`/products/${product.id}`} className="hover:underline">
          {product.name}
        </Link>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      card: 'subtitle',
      render: (product) => categoryLabel(product.category),
    },
    { key: 'size', header: 'Size', card: 'meta', render: (product) => product.size },
    {
      key: 'status',
      header: 'Status',
      card: 'badge',
      render: (product) => <StatusBadge isActive={product.isActive} />,
    },
    ...(canEdit
      ? [
          {
            key: 'actions',
            header: '',
            align: 'right' as const,
            render: (product: Product) => <ProductActions product={product} />,
          },
        ]
      : []),
  ];

  const isFiltered = values.search !== '' || values.category !== 'all' || values.status !== 'all';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={values.search}
          onChange={(search) => {
            setFilters({ search });
          }}
          placeholder="Search products"
        />
        <div className="flex gap-3">
          <FilterSelect
            label="Category"
            value={values.category}
            options={CATEGORY_FILTER}
            onChange={(category) => {
              setFilters({ category });
            }}
          />
          <FilterSelect
            label="Status"
            value={values.status}
            options={STATUS_FILTER}
            onChange={(status) => {
              setFilters({ status });
            }}
          />
        </div>
      </div>

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <EmptyState
          icon={Package}
          title="The products could not be loaded"
          description="Check your connection and try again."
          action={
            <Button
              onClick={() => {
                void query.refetch();
              }}
            >
              Try again
            </Button>
          }
        />
      ) : (
        <>
          <ResponsiveList
            records={query.data.products}
            columns={columns}
            getRowKey={(product) => product.id}
            caption="Products"
            emptyState={
              <EmptyState
                icon={Package}
                title={isFiltered ? 'No products match those filters' : 'No products yet'}
                description={
                  isFiltered
                    ? 'Try a different search or clear the filters.'
                    : 'Add the products Greenstone manufactures so they can be used on quotations and orders.'
                }
                action={
                  isFiltered ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFilters({ search: '', category: 'all', status: 'all' });
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : canEdit ? (
                    <Button render={<Link href="/products/new" />}>
                      <Plus className="size-4" aria-hidden />
                      Add product
                    </Button>
                  ) : undefined
                }
              />
            }
          />

          <Pagination
            page={query.data.meta.page}
            pageSize={query.data.meta.pageSize}
            totalRecords={query.data.meta.totalRecords}
            totalPages={query.data.meta.totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
