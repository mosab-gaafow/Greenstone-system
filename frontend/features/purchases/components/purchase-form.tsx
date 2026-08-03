'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Save, ClipboardList, Package } from 'lucide-react';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { TextField } from '@/components/forms/text-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { ItemRowList } from '@/components/forms/item-row-list';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import * as suppliersApi from '@/features/suppliers/api/suppliers.api';
import * as rawMaterialsApi from '@/features/raw-materials/api/raw-materials.api';
import {
  purchaseFormSchema,
  type PurchaseFormInput,
  type PurchaseFormValues,
} from '../schemas/purchase.schema';
import { isPumiceMaterial } from '../types/purchase.types';

interface PurchaseFormProps {
  onSubmit: (values: PurchaseFormValues) => Promise<unknown>;
  pending: boolean;
}

const EMPTY_ITEM = {
  rawMaterialId: '',
  quantity: '',
  unitCost: '',
  lengthMetres: '',
  widthMetres: '',
  heightMetres: '',
  numberOfLoads: '',
  ratePerCubicMetre: '',
};

/** A full page, not a Dialog — same reasoning as Orders and Production. */
export function PurchaseForm({ onSubmit, pending }: PurchaseFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['purchases', 'supplier-options'],
    queryFn: () => suppliersApi.fetchSuppliers({ page: 1, pageSize: 100, isActive: true }),
  });
  const rawMaterialsQuery = useQuery({
    queryKey: ['purchases', 'raw-material-options'],
    queryFn: () => rawMaterialsApi.fetchRawMaterials({ page: 1, pageSize: 100, isActive: true }),
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data?.suppliers ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliersQuery.data],
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
  const rawMaterialsById = useMemo(
    () => new Map((rawMaterialsQuery.data?.rawMaterials ?? []).map((material) => [material.id, material])),
    [rawMaterialsQuery.data],
  );

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PurchaseFormInput, unknown, PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      supplierId: '',
      purchaseDate: new Date().toISOString().slice(0, 10),
      reference: '',
      items: [EMPTY_ITEM],
    },
  });

  const itemsArray = useFieldArray({ control, name: 'items' });
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
              error instanceof ApiError ? error.message : 'The purchase could not be saved. Please try again.',
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

      <FormSection title="Details" icon={ClipboardList}>
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
                onChange={field.onChange}
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
            id="purchaseDate"
            label="Purchase date"
            required
            type="date"
            error={errors.purchaseDate?.message}
            {...register('purchaseDate')}
          />
        </div>

        <div className="mt-3">
          <TextField
            id="reference"
            label="Reference"
            placeholder="e.g. supplier delivery note or invoice number"
            hint="Optional."
            error={errors.reference?.message}
            {...register('reference')}
          />
        </div>
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
            const selectedMaterial = item?.rawMaterialId
              ? rawMaterialsById.get(item.rawMaterialId)
              : undefined;
            const isPumice = isPumiceMaterial(selectedMaterial?.name);

            const length = Number(item?.lengthMetres) || 0;
            const width = Number(item?.widthMetres) || 0;
            const height = Number(item?.heightMetres) || 0;
            const loads = Number(item?.numberOfLoads) || 0;
            const rate = Number(item?.ratePerCubicMetre) || 0;
            const volumePerLoad = length * width * height;
            const totalVolume = volumePerLoad * loads;
            const totalCost = totalVolume * rate;

            return (
              <div className="space-y-3">
                <Controller
                  name={`items.${index}.rawMaterialId`}
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      id={`items.${String(index)}.rawMaterialId`}
                      label="Raw material"
                      required
                      value={field.value}
                      onChange={field.onChange}
                      options={rawMaterialOptions}
                      placeholder={
                        rawMaterialsQuery.isPending ? 'Loading raw materials…' : 'Select a raw material'
                      }
                      searchPlaceholder="Search raw materials"
                      emptyMessage={
                        rawMaterialsQuery.isError
                          ? 'Raw materials could not be loaded.'
                          : 'No active raw materials found.'
                      }
                      disabled={rawMaterialsQuery.isPending}
                      error={errors.items?.[index]?.rawMaterialId?.message}
                    />
                  )}
                />

                {isPumice ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <TextField
                        id={`items.${String(index)}.lengthMetres`}
                        label="Truck length (m)"
                        required
                        type="text"
                        inputMode="decimal"
                        error={errors.items?.[index]?.lengthMetres?.message}
                        {...register(`items.${index}.lengthMetres`)}
                      />
                      <TextField
                        id={`items.${String(index)}.widthMetres`}
                        label="Truck width (m)"
                        required
                        type="text"
                        inputMode="decimal"
                        error={errors.items?.[index]?.widthMetres?.message}
                        {...register(`items.${index}.widthMetres`)}
                      />
                      <TextField
                        id={`items.${String(index)}.heightMetres`}
                        label="Truck height (m)"
                        required
                        type="text"
                        inputMode="decimal"
                        error={errors.items?.[index]?.heightMetres?.message}
                        {...register(`items.${index}.heightMetres`)}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <TextField
                        id={`items.${String(index)}.numberOfLoads`}
                        label="Number of loads"
                        required
                        type="text"
                        inputMode="numeric"
                        error={errors.items?.[index]?.numberOfLoads?.message}
                        {...register(`items.${index}.numberOfLoads`)}
                      />
                      <TextField
                        id={`items.${String(index)}.ratePerCubicMetre`}
                        label="Rate per cubic metre (KES)"
                        required
                        type="text"
                        inputMode="decimal"
                        placeholder="e.g. 1100.00"
                        hint="Reference: KES 1,100/m³ — enter the agreed rate."
                        error={errors.items?.[index]?.ratePerCubicMetre?.message}
                        {...register(`items.${index}.ratePerCubicMetre`)}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      Volume per load {volumePerLoad.toFixed(3)} m³ · total volume{' '}
                      {totalVolume.toFixed(3)} m³ · total cost KES {totalCost.toFixed(2)}. Calculated —
                      the saved figures come from the backend.
                    </p>
                  </>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField
                      id={`items.${String(index)}.quantity`}
                      label="Quantity purchased"
                      required
                      type="text"
                      inputMode="decimal"
                      hint={
                        selectedMaterial?.measurementUnitName
                          ? `In ${selectedMaterial.measurementUnitName}.`
                          : undefined
                      }
                      error={errors.items?.[index]?.quantity?.message}
                      {...register(`items.${index}.quantity`)}
                    />
                    <TextField
                      id={`items.${String(index)}.unitCost`}
                      label="Unit cost (KES)"
                      required
                      type="text"
                      inputMode="decimal"
                      hint="Reference information only — enter the agreed cost."
                      error={errors.items?.[index]?.unitCost?.message}
                      {...register(`items.${index}.unitCost`)}
                    />
                  </div>
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

      <FormActions
        submitLabel="Save purchase"
        submitIcon={Save}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
