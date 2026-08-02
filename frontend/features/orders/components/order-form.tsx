'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, Users, Package, MapPin, Wallet } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { TextareaField } from '@/components/forms/textarea-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { ItemRowList } from '@/components/forms/item-row-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { canOverrideCredit } from '@/lib/permissions';
import * as customersApi from '@/features/customers/api/customers.api';
import * as productsApi from '@/features/products/api/products.api';
import { useCreditStatus } from '@/features/customers/hooks/use-customer-credit';
import { creditStatusLabel } from '@/features/customers/types/customer-credit.types';
import type { QuotationDetail } from '@/features/quotations/types/quotation.types';
import {
  orderFormSchema,
  type OrderFormInput,
  type OrderFormValues,
} from '../schemas/order.schema';
import { ORDER_PAYMENT_TYPE_OPTIONS } from '../types/order.types';

interface OrderFormProps {
  /** Present when converting an accepted quotation — its items are copied,
   * never entered here. See business-blueprint section 2.6. */
  sourceQuotation?: QuotationDetail;
  onSubmit: (values: OrderFormValues) => Promise<unknown>;
  pending: boolean;
}

const EMPTY_ITEM = { productId: '', quantity: 1, agreedUnitPrice: '' };

/**
 * A full page, not a Dialog — same reasoning as the quotation form. Reuses
 * `ItemRowList`, written during Phase 5A for exactly this reuse.
 */
export function OrderForm({ sourceQuotation, onSubmit, pending }: OrderFormProps) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isConversion = Boolean(sourceQuotation);

  const customersQuery = useQuery({
    queryKey: ['orders', 'customer-options'],
    queryFn: () => customersApi.fetchCustomers({ page: 1, pageSize: 100, isActive: true }),
    enabled: !isConversion,
  });
  const productsQuery = useQuery({
    queryKey: ['orders', 'product-options'],
    queryFn: () => productsApi.fetchProducts({ page: 1, pageSize: 100, isActive: true }),
    enabled: !isConversion,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrderFormInput, unknown, OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: sourceQuotation?.customerId ?? '',
      sourceQuotationId: sourceQuotation?.id,
      customerAddressId: '',
      paymentType: 'CASH',
      items: isConversion ? undefined : [EMPTY_ITEM],
      creditOverrideReason: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items') ?? [];
  const watchedCustomerId = watch('customerId');
  const watchedPaymentType = watch('paymentType');

  const customerId = sourceQuotation?.customerId ?? watchedCustomerId;

  const customerDetailQuery = useQuery({
    queryKey: ['orders', 'customer-detail', customerId],
    queryFn: () => customersApi.fetchCustomer(customerId as string),
    enabled: Boolean(customerId),
  });

  const creditStatusQuery = useCreditStatus(
    watchedPaymentType === 'CREDIT' ? customerId : undefined,
  );

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
  const addressOptions = useMemo(
    () =>
      (customerDetailQuery.data?.addresses ?? [])
        .filter((address) => address.isActive)
        .map((address) => ({ value: address.id, label: address.label })),
    [customerDetailQuery.data],
  );

  const total = isConversion
    ? Number(sourceQuotation?.totalAmount ?? 0)
    : watchedItems.reduce((sum, item) => {
        const quantity = Number(item?.quantity) || 0;
        const price = Number(item?.agreedUnitPrice) || 0;
        return sum + quantity * price;
      }, 0);

  const itemsError =
    typeof errors.items?.message === 'string' ? errors.items.message : errors.items?.root?.message;

  const isBlocked = creditStatusQuery.data?.creditStatus === 'BLOCKED';
  const showOverrideField = watchedPaymentType === 'CREDIT' && isBlocked;

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
                : 'The order could not be saved. Please try again.',
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

      <FormSection title="Customer" icon={Users}>
        {isConversion ? (
          <TextField
            id="customerName"
            label="Customer"
            value={sourceQuotation?.customerName ?? ''}
            readOnly
            disabled
            hint={`Copied from ${sourceQuotation?.quotationNumber ?? 'the source quotation'}.`}
          />
        ) : (
          <Controller
            name="customerId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="customerId"
                label="Customer"
                required
                value={field.value ?? ''}
                onChange={field.onChange}
                options={customerOptions}
                placeholder={customersQuery.isPending ? 'Loading customers…' : 'Select a customer'}
                searchPlaceholder="Search customers"
                emptyMessage={
                  customersQuery.isError
                    ? 'Customers could not be loaded.'
                    : 'No active customers found.'
                }
                disabled={customersQuery.isPending}
                error={errors.customerId?.message}
              />
            )}
          />
        )}
      </FormSection>

      <FormSection title="Delivery address" icon={MapPin}>
        <Controller
          name="customerAddressId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="customerAddressId"
              label="Site"
              required
              value={field.value}
              onChange={field.onChange}
              options={addressOptions}
              placeholder={
                !customerId
                  ? 'Select a customer first'
                  : customerDetailQuery.isPending
                    ? 'Loading sites…'
                    : 'Select a site'
              }
              searchPlaceholder="Search sites"
              emptyMessage="No active sites found for this customer."
              disabled={!customerId || customerDetailQuery.isPending}
              error={errors.customerAddressId?.message}
            />
          )}
        />
      </FormSection>

      <FormSection title="Payment" icon={Wallet}>
        <div className="space-y-4">
          <Controller
            name="paymentType"
            control={control}
            render={({ field }) => (
              <SelectField
                id="paymentType"
                label="Payment type"
                required
                value={field.value}
                onChange={field.onChange}
                options={ORDER_PAYMENT_TYPE_OPTIONS}
                error={errors.paymentType?.message}
              />
            )}
          />

          {watchedPaymentType === 'CREDIT' && creditStatusQuery.data && (
            <Alert variant={isBlocked ? 'destructive' : 'default'} role="status">
              <AlertDescription>
                Customer credit status: {creditStatusLabel(creditStatusQuery.data.creditStatus)}.
                Outstanding balance KES {creditStatusQuery.data.outstandingBalance}.
                {isBlocked &&
                  (canOverrideCredit(user)
                    ? ' Provide a reason below to override the block.'
                    : ' This customer is blocked — only an Admin or Super Admin can override this.')}
              </AlertDescription>
            </Alert>
          )}

          {showOverrideField && canOverrideCredit(user) && (
            <TextareaField
              id="creditOverrideReason"
              label="Override reason"
              required
              placeholder="Why this order should proceed despite the block."
              error={errors.creditOverrideReason?.message}
              {...register('creditOverrideReason')}
            />
          )}
        </div>
      </FormSection>

      {isConversion ? (
        <FormSection title="Items" icon={Package}>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 text-right font-medium">Qty</th>
                  <th className="p-4 text-right font-medium">Unit price</th>
                  <th className="p-4 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {sourceQuotation?.items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-4">{item.productName}</td>
                    <td className="p-4 text-right tabular-nums">{item.quantity}</td>
                    <td className="p-4 text-right tabular-nums">{item.agreedUnitPrice}</td>
                    <td className="p-4 text-right tabular-nums">{item.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted-foreground mt-2 text-xs">
            Copied from the quotation. Prices are preserved exactly as agreed.
          </p>
        </FormSection>
      ) : (
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
      )}

      <div className="flex items-center justify-between rounded-lg border p-4">
        <span className="text-muted-foreground text-sm">
          Order total
          <span className="block text-xs">
            Preview only — the saved figure always comes from the backend.
          </span>
        </span>
        <span className="text-lg font-semibold tabular-nums">KES {total.toFixed(2)}</span>
      </div>

      <FormActions
        submitLabel="Save order"
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
