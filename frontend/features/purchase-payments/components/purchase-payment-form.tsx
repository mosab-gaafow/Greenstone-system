'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, Wallet, Link2 } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { SelectField } from '@/components/forms/select-field';
import { TextField } from '@/components/forms/text-field';
import { FileField } from '@/components/forms/file-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { ItemRowList } from '@/components/forms/item-row-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { todayInNairobi } from '@/lib/format';
import * as suppliersApi from '@/features/suppliers/api/suppliers.api';
import * as purchasesApi from '@/features/purchases/api/purchases.api';
import {
  purchasePaymentFormSchema,
  type PurchasePaymentFormValues,
} from '../schemas/purchase-payment.schema';
import { PAYMENT_METHOD_OPTIONS, paymentReferenceLabel } from '../types/purchase-payment.types';

interface PurchasePaymentFormProps {
  onSubmit: (values: PurchasePaymentFormValues, evidenceFile: File | null) => Promise<unknown>;
  pending: boolean;
}

const EMPTY_ALLOCATION = { purchaseId: '', allocatedAmount: '' };

/** A full page, not a Dialog — same reasoning as Purchases and Production. */
export function PurchasePaymentForm({ onSubmit, pending }: PurchasePaymentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['purchase-payments', 'supplier-options'],
    queryFn: () => suppliersApi.fetchSuppliers({ page: 1, pageSize: 100, isActive: true }),
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data?.suppliers ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliersQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchasePaymentFormValues>({
    resolver: zodResolver(purchasePaymentFormSchema),
    defaultValues: {
      supplierId: '',
      amount: '',
      paymentMethod: 'MPESA',
      paymentReference: '',
      paymentDate: todayInNairobi(),
      allocations: [],
    },
  });

  const allocationsArray = useFieldArray({ control, name: 'allocations' });
  const watchedSupplierId = watch('supplierId');
  const watchedAmount = watch('amount');
  const watchedMethod = watch('paymentMethod');
  const watchedAllocations = watch('allocations') ?? [];

  const purchasesQuery = useQuery({
    queryKey: ['purchase-payments', 'purchase-options', watchedSupplierId],
    queryFn: () => purchasesApi.fetchPurchases({ page: 1, pageSize: 100, supplierId: watchedSupplierId }),
    enabled: Boolean(watchedSupplierId),
  });

  const purchaseOptions = useMemo(
    () =>
      (purchasesQuery.data?.purchases ?? []).map((purchase) => ({
        value: purchase.id,
        label: `${purchase.purchaseNumber} — KES ${purchase.totalCost}`,
      })),
    [purchasesQuery.data],
  );

  const totalAllocated = watchedAllocations.reduce((sum, allocation) => {
    const value = Number(allocation?.allocatedAmount);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const paymentAmount = Number(watchedAmount) || 0;
  const unallocated = paymentAmount - totalAllocated;

  const allocationsError =
    typeof errors.allocations?.message === 'string'
      ? errors.allocations.message
      : errors.allocations?.root?.message;

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          setSubmitError(null);

          try {
            await onSubmit(values, evidenceFile);
          } catch (error) {
            setSubmitError(
              error instanceof ApiError
                ? error.message
                : 'The purchase payment could not be saved. Please try again.',
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

      <FormSection title="Payment details" icon={Wallet}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                id="supplierId"
                label="Supplier"
                required
                value={field.value}
                onChange={(value) => {
                  field.onChange(value);
                  allocationsArray.replace([]);
                }}
                options={supplierOptions}
                placeholder={suppliersQuery.isPending ? 'Loading suppliers…' : 'Select a supplier'}
                searchPlaceholder="Search suppliers"
                emptyMessage={
                  suppliersQuery.isError ? 'Suppliers could not be loaded.' : 'No active suppliers found.'
                }
                disabled={suppliersQuery.isPending}
                error={errors.supplierId?.message}
              />
            )}
          />

          <TextField
            id="amount"
            label="Amount"
            required
            type="text"
            inputMode="decimal"
            placeholder="e.g. 50000.00"
            hint="KES. Must not exceed the supplier's current outstanding balance."
            error={errors.amount?.message}
            {...register('amount')}
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Controller
            name="paymentMethod"
            control={control}
            render={({ field }) => (
              <SelectField
                id="paymentMethod"
                label="Payment method"
                required
                value={field.value}
                onChange={field.onChange}
                options={PAYMENT_METHOD_OPTIONS}
                error={errors.paymentMethod?.message}
              />
            )}
          />

          <TextField
            id="paymentDate"
            label="Payment date"
            required
            type="date"
            max={todayInNairobi()}
            hint="Cannot be in the future."
            error={errors.paymentDate?.message}
            {...register('paymentDate')}
          />
        </div>

        <div className="mt-3">
          <TextField
            id="paymentReference"
            label={paymentReferenceLabel(watchedMethod)}
            required
            type="text"
            placeholder="e.g. QGH7XJ2K9L"
            hint="Always required — proof of the payment itself, regardless of method."
            error={errors.paymentReference?.message}
            {...register('paymentReference')}
          />
        </div>

        <div className="mt-3">
          <FileField
            id="evidenceFile"
            label="Uploaded evidence"
            value={evidenceFile}
            onChange={setEvidenceFile}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            hint="Optional additional proof (JPEG, PNG, or PDF). Never a substitute for the reference above."
          />
        </div>
      </FormSection>

      <FormSection title="Purchase allocations" icon={Link2}>
        <p className="text-muted-foreground text-sm">
          Optional — for traceability only. The supplier balance always uses the full payment amount
          above, regardless of how (or whether) it is allocated.
        </p>

        <ItemRowList
          rows={allocationsArray.fields}
          addLabel="Add allocation"
          minRows={0}
          onAdd={() => {
            allocationsArray.append({ ...EMPTY_ALLOCATION });
          }}
          onRemove={allocationsArray.remove}
          renderRow={(index) => (
            <div className="space-y-3">
              <Controller
                name={`allocations.${index}.purchaseId`}
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id={`allocations.${String(index)}.purchaseId`}
                    label="Purchase"
                    required
                    value={field.value}
                    onChange={field.onChange}
                    options={purchaseOptions}
                    placeholder={
                      !watchedSupplierId
                        ? 'Select a supplier first'
                        : purchasesQuery.isPending
                          ? 'Loading purchases…'
                          : 'Select a purchase'
                    }
                    searchPlaceholder="Search purchases"
                    emptyMessage={
                      purchasesQuery.isError
                        ? 'Purchases could not be loaded.'
                        : 'No purchases found for this supplier.'
                    }
                    disabled={!watchedSupplierId || purchasesQuery.isPending}
                    error={errors.allocations?.[index]?.purchaseId?.message}
                  />
                )}
              />

              <TextField
                id={`allocations.${String(index)}.allocatedAmount`}
                label="Allocated amount"
                required
                type="text"
                inputMode="decimal"
                hint="Must not exceed this purchase's remaining unpaid amount."
                error={errors.allocations?.[index]?.allocatedAmount?.message}
                {...register(`allocations.${index}.allocatedAmount`)}
              />
            </div>
          )}
        />

        {allocationsError && (
          <p className="text-destructive text-sm" role="alert">
            {allocationsError}
          </p>
        )}

        <div className="bg-muted/50 grid grid-cols-3 gap-3 rounded-lg p-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Payment amount</p>
            <p className="font-semibold tabular-nums">KES {paymentAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total allocated</p>
            <p className="font-semibold tabular-nums">KES {totalAllocated.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Unallocated</p>
            <p
              className={`font-semibold tabular-nums ${unallocated < 0 ? 'text-destructive' : ''}`}
            >
              KES {unallocated.toFixed(2)}
            </p>
          </div>
        </div>
      </FormSection>

      <FormActions
        submitLabel="Save payment"
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
