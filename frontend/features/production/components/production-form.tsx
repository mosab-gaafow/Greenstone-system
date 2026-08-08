'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, Factory, Package, FlaskConical } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { ItemRowList } from '@/components/forms/item-row-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import * as productsApi from '@/features/products/api/products.api';
import * as rawMaterialsApi from '@/features/raw-materials/api/raw-materials.api';
import * as ordersApi from '@/features/orders/api/orders.api';
import { isOrderCancellable } from '@/features/orders/types/order.types';
import {
  productionFormSchema,
  type ProductionFormInput,
  type ProductionFormValues,
} from '../schemas/production.schema';
import { CURING_DURATION_OPTIONS, PRODUCTION_PURPOSES, productionPurposeLabel } from '../types/production.types';

interface ProductionFormProps {
  onSubmit: (values: ProductionFormValues) => Promise<unknown>;
  pending: boolean;
}

const EMPTY_ITEM = { productId: '', pallets: 1, brokenQuantity: 0, curingDuration: 'TWO_DAYS' as const };
const EMPTY_USAGE = { rawMaterialId: '', quantity: '' };

const PURPOSE_OPTIONS = PRODUCTION_PURPOSES.map((value) => ({
  value,
  label: productionPurposeLabel(value),
}));

/** A full page, not a Dialog — same reasoning as orders. */
export function ProductionForm({ onSubmit, pending }: ProductionFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['production', 'product-options'],
    queryFn: () => productsApi.fetchProducts({ page: 1, pageSize: 100, isActive: true }),
  });
  const rawMaterialsQuery = useQuery({
    queryKey: ['production', 'raw-material-options'],
    queryFn: () => rawMaterialsApi.fetchRawMaterials({ page: 1, pageSize: 100, isActive: true }),
  });
  const ordersQuery = useQuery({
    queryKey: ['production', 'order-options'],
    queryFn: () => ordersApi.fetchOrders({ page: 1, pageSize: 100 }),
  });

  const productOptions = useMemo(
    () =>
      (productsQuery.data?.products ?? []).map((product) => ({
        value: product.id,
        label: `${product.name} (${product.size})`,
      })),
    [productsQuery.data],
  );
  const productsById = useMemo(
    () => new Map((productsQuery.data?.products ?? []).map((product) => [product.id, product])),
    [productsQuery.data],
  );
  const rawMaterialOptions = useMemo(
    () =>
      (rawMaterialsQuery.data?.rawMaterials ?? []).map((material) => ({
        value: material.id,
        label: material.measurementUnitSymbol
          ? `${material.name} (${material.measurementUnitSymbol})`
          : material.name,
      })),
    [rawMaterialsQuery.data],
  );
  const orderOptions = useMemo(
    () =>
      (ordersQuery.data?.orders ?? [])
        .filter((order) => isOrderCancellable(order.status))
        .map((order) => ({
          value: order.id,
          label: `${order.orderNumber} — ${order.customerName}`,
        })),
    [ordersQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProductionFormInput, unknown, ProductionFormValues>({
    resolver: zodResolver(productionFormSchema),
    defaultValues: {
      productionDate: new Date().toISOString().slice(0, 10),
      purpose: 'GENERAL_STOCK',
      orderId: '',
      items: [EMPTY_ITEM],
      rawMaterialUsages: [],
    },
  });

  const itemsArray = useFieldArray({ control, name: 'items' });
  const usagesArray = useFieldArray({ control, name: 'rawMaterialUsages' });
  const watchedPurpose = watch('purpose');
  const watchedItems = watch('items') ?? [];

  const itemsError =
    typeof errors.items?.message === 'string' ? errors.items.message : errors.items?.root?.message;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          setSubmitError(null);

          try {
            await onSubmit(values);
          } catch (error) {
            setSubmitError(
              error instanceof ApiError
                ? error.message
                : 'The production run could not be saved. Please try again.',
            );
          }
        })(event);
      }}
      className="space-y-6"
      noValidate
    >
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <FormSection title="Details" icon={Factory}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="productionDate"
            label="Production date"
            required
            type="date"
            error={errors.productionDate?.message}
            {...register('productionDate')}
          />

          <Controller
            name="purpose"
            control={control}
            render={({ field }) => (
              <SelectField
                id="purpose"
                label="Purpose"
                required
                value={field.value}
                onChange={field.onChange}
                options={PURPOSE_OPTIONS}
                error={errors.purpose?.message}
              />
            )}
          />
        </div>

        {watchedPurpose === 'ORDER' && (
          <div className="mt-3">
            <Controller
              name="orderId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  id="orderId"
                  label="Order"
                  required
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  options={orderOptions}
                  placeholder={ordersQuery.isPending ? 'Loading orders…' : 'Select an order'}
                  searchPlaceholder="Search orders"
                  emptyMessage={ordersQuery.isError ? 'Orders could not be loaded.' : 'No orders found.'}
                  disabled={ordersQuery.isPending}
                  error={errors.orderId?.message}
                />
              )}
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Items" icon={Package}>
        <ItemRowList
          rows={itemsArray.fields}
          addLabel="Add item"
          onAdd={() => {
            itemsArray.append({ ...EMPTY_ITEM });
          }}
          onRemove={itemsArray.remove}
          renderRow={(index) => {
            const item = watchedItems[index];
            const pallets = Number(item?.pallets) || 0;
            const broken = Number(item?.brokenQuantity) || 0;
            const selectedProduct = item?.productId ? productsById.get(item.productId) : undefined;
            const piecesPerPallet = selectedProduct?.piecesPerPallet ?? null;
            const produced = piecesPerPallet !== null ? pallets * piecesPerPallet : 0;
            const usable = Math.max(0, produced - broken);

            return (
              <div className="space-y-3">
                <Controller
                  name={`items.${index}.productId`}
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      id={`items.${String(index)}.productId`}
                      label="Product"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={productOptions}
                      placeholder={productsQuery.isPending ? 'Loading products…' : 'Select a product'}
                      searchPlaceholder="Search products"
                      emptyMessage={
                        productsQuery.isError ? 'Products could not be loaded.' : 'No active products found.'
                      }
                      disabled={productsQuery.isPending}
                      error={errors.items?.[index]?.productId?.message}
                    />
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    id={`items.${String(index)}.pallets`}
                    label="Pallets"
                    required
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    hint={
                      piecesPerPallet !== null
                        ? `${String(piecesPerPallet)} pieces per pallet.`
                        : selectedProduct
                          ? 'This product has no confirmed pieces-per-pallet value yet.'
                          : 'Select a product to see pieces per pallet.'
                    }
                    error={errors.items?.[index]?.pallets?.message}
                    {...register(`items.${index}.pallets`)}
                  />

                  <TextField
                    id={`items.${String(index)}.brokenQuantity`}
                    label="Broken (before curing)"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    error={errors.items?.[index]?.brokenQuantity?.message}
                    {...register(`items.${index}.brokenQuantity`)}
                  />

                  <Controller
                    name={`items.${index}.curingDuration`}
                    control={control}
                    render={({ field }) => (
                      <SelectField
                        id={`items.${String(index)}.curingDuration`}
                        label="Curing duration"
                        required
                        value={field.value}
                        onChange={field.onChange}
                        options={CURING_DURATION_OPTIONS}
                        error={errors.items?.[index]?.curingDuration?.message}
                      />
                    )}
                  />
                </div>

                {selectedProduct && piecesPerPallet === null ? (
                  <p className="text-destructive text-xs" role="alert">
                    &ldquo;{selectedProduct.name}&rdquo; has no confirmed pieces-per-pallet value
                    and cannot be produced yet.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-xs">
                    Produced {produced} · usable {usable}. Calculated — the saved figures come from
                    the backend.
                  </p>
                )}
              </div>
            );
          }}
        />

        {itemsError && (
          <p className="text-destructive text-sm" role="alert">
            {itemsError}
          </p>
        )}
      </FormSection>

      <FormSection title="Raw materials used" icon={FlaskConical}>
        <ItemRowList
          rows={usagesArray.fields}
          addLabel="Add raw material"
          minRows={0}
          onAdd={() => {
            usagesArray.append({ ...EMPTY_USAGE });
          }}
          onRemove={usagesArray.remove}
          renderRow={(index) => (
            <div className="space-y-3">
              <Controller
                name={`rawMaterialUsages.${index}.rawMaterialId`}
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id={`rawMaterialUsages.${String(index)}.rawMaterialId`}
                    label="Raw material"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    options={rawMaterialOptions}
                    placeholder={rawMaterialsQuery.isPending ? 'Loading raw materials…' : 'Select a raw material'}
                    searchPlaceholder="Search raw materials"
                    emptyMessage={
                      rawMaterialsQuery.isError
                        ? 'Raw materials could not be loaded.'
                        : 'No active raw materials found.'
                    }
                    disabled={rawMaterialsQuery.isPending}
                    error={errors.rawMaterialUsages?.[index]?.rawMaterialId?.message}
                  />
                )}
              />

              <TextField
                id={`rawMaterialUsages.${String(index)}.quantity`}
                label="Quantity used"
                required
                type="text"
                inputMode="decimal"
                placeholder="e.g. 50.000"
                hint="Actual quantity used — never a fixed formula."
                error={errors.rawMaterialUsages?.[index]?.quantity?.message}
                {...register(`rawMaterialUsages.${index}.quantity`)}
              />
            </div>
          )}
        />
      </FormSection>

      <FormActions
        submitLabel="Save production"
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
