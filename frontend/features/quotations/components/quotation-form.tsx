'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, FileText, Package } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { ItemRowList } from '@/components/forms/item-row-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import * as customersApi from '@/features/customers/api/customers.api';
import * as productsApi from '@/features/products/api/products.api';
import {
  quotationFormSchema,
  type QuotationFormInput,
  type QuotationFormValues,
} from '../schemas/quotation.schema';
import type { QuotationDetail } from '../types/quotation.types';

interface QuotationFormProps {
  quotation?: QuotationDetail;
  onSubmit: (values: QuotationFormValues) => Promise<unknown>;
  pending: boolean;
}

const EMPTY_ITEM = { productId: '', quantity: 1, agreedUnitPrice: '' };

/**
 * A full page, not a Dialog — a multi-item quotation needs more room than
 * the master-data Dialog/Sheet pattern gives it, on a phone especially.
 */
export function QuotationForm({ quotation, onSubmit, pending }: QuotationFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 100 is the backend's maximum pageSize (products.validators.ts /
  // customers.validators.ts) — SearchableSelect filters client-side over
  // whatever list it's given, so this is "as many as the API allows in one
  // page", not a deliberately chosen limit.
  const customersQuery = useQuery({
    queryKey: ['quotations', 'customer-options'],
    queryFn: () => customersApi.fetchCustomers({ page: 1, pageSize: 100, isActive: true }),
  });
  const productsQuery = useQuery({
    queryKey: ['quotations', 'product-options'],
    queryFn: () => productsApi.fetchProducts({ page: 1, pageSize: 100, isActive: true }),
  });

  const customerOptions = useMemo(
    () =>
      (customersQuery.data?.customers ?? []).map((customer) => ({
        value: customer.id,
        label: customer.name,
      })),
    [customersQuery.data],
  );
  const productOptions = useMemo(
    () =>
      (productsQuery.data?.products ?? []).map((product) => ({
        value: product.id,
        label: `${product.name} (${product.size})`,
      })),
    [productsQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<QuotationFormInput, unknown, QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: quotation?.customerId ?? '',
      items: quotation
        ? quotation.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            agreedUnitPrice: item.agreedUnitPrice,
          }))
        : [EMPTY_ITEM],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const total = watchedItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const price = Number(item.agreedUnitPrice) || 0;
    return sum + quantity * price;
  }, 0);

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
                : 'The quotation could not be saved. Please try again.',
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

      {(customersQuery.isError || productsQuery.isError) && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {customersQuery.isError && productsQuery.isError
                ? 'Customers and products could not be loaded.'
                : customersQuery.isError
                  ? 'Customers could not be loaded.'
                  : 'Products could not be loaded.'}
            </span>
            <button
              type="button"
              className="underline"
              onClick={() => {
                if (customersQuery.isError) void customersQuery.refetch();
                if (productsQuery.isError) void productsQuery.refetch();
              }}
            >
              Try again
            </button>
          </AlertDescription>
        </Alert>
      )}

      <FormSection title="Customer" icon={FileText}>
        <Controller
          name="customerId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="customerId"
              label="Customer"
              required
              value={field.value}
              onChange={field.onChange}
              options={customerOptions}
              placeholder={customersQuery.isPending ? 'Loading customers…' : 'Select a customer'}
              searchPlaceholder="Search customers"
              emptyMessage={
                customersQuery.isError ? 'Customers could not be loaded.' : 'No active customers found.'
              }
              disabled={customersQuery.isPending}
              error={errors.customerId?.message}
            />
          )}
        />
      </FormSection>

      <FormSection title="Items" icon={Package}>
        <ItemRowList
          rows={fields}
          addLabel="Add item"
          onAdd={() => {
            append({ ...EMPTY_ITEM });
          }}
          onRemove={remove}
          renderRow={(index) => {
            const item = watchedItems[index];
            const lineTotal = (Number(item?.quantity) || 0) * (Number(item?.agreedUnitPrice) || 0);

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
                      placeholder={
                        productsQuery.isPending ? 'Loading products…' : 'Select a product'
                      }
                      searchPlaceholder="Search products"
                      emptyMessage={
                        productsQuery.isError
                          ? 'Products could not be loaded.'
                          : 'No active products found.'
                      }
                      disabled={productsQuery.isPending}
                      error={errors.items?.[index]?.productId?.message}
                    />
                  )}
                />

                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    id={`items.${String(index)}.quantity`}
                    label="Quantity"
                    required
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    error={errors.items?.[index]?.quantity?.message}
                    {...register(`items.${index}.quantity`)}
                  />

                  <TextField
                    id={`items.${String(index)}.agreedUnitPrice`}
                    label="Unit price"
                    required
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 150.00"
                    hint="KES, up to two decimal places."
                    error={errors.items?.[index]?.agreedUnitPrice?.message}
                    {...register(`items.${index}.agreedUnitPrice`)}
                  />

                  <TextField
                    id={`items.${String(index)}.lineTotal`}
                    label="Line total"
                    readOnly
                    disabled
                    value={lineTotal > 0 ? lineTotal.toFixed(2) : '—'}
                    hint="Calculated. The saved figure comes from the backend."
                  />
                </div>
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

      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-muted-foreground text-sm">
          Quotation total
          <span className="block text-xs">
            Preview only — the saved figure always comes from the backend.
          </span>
        </span>
        <span className="text-lg font-semibold tabular-nums">KES {total.toFixed(2)}</span>
      </div>

      <FormActions
        submitLabel={quotation ? 'Save changes' : 'Save quotation'}
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
