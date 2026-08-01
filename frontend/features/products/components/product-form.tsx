'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TextField } from '@/components/forms/text-field';
import { TextareaField } from '@/components/forms/textarea-field';
import { SelectField } from '@/components/forms/select-field';
import { FormSection } from '@/components/forms/form-section';
import { FormActions } from '@/components/forms/form-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api-client';
import { productFormSchema, type ProductFormValues } from '../schemas/product.schema';
import { CATEGORY_OPTIONS, type Product } from '../types/product.types';

interface ProductFormProps {
  product?: Product;
  onSubmit: (values: ProductFormValues) => Promise<unknown>;
  pending: boolean;
}

/**
 * Create and edit form for a product.
 *
 * There is no price field, by design. Prices are agreed per transaction and
 * captured on the quotation, order or invoice.
 */
export function ProductForm({ product, onSubmit, pending }: ProductFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name ?? '',
      category: product?.category ?? 'HOLLOW_BLOCK',
      size: product?.size ?? '',
      description: product?.description ?? '',
    },
  });

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          setSubmitError(null);

          try {
            await onSubmit(values);
          } catch (error) {
            // A rejected duplicate arrives as a business-rule error with a
            // message naming the record it clashes with. Shown on the form
            // rather than only as a toast, which disappears before it can be
            // read and acted on.
            setSubmitError(
              error instanceof ApiError
                ? error.message
                : 'The details could not be saved. Please try again.',
            );
          }
        })(event);
      }}
      className="max-w-xl space-y-8"
      noValidate
    >
      {submitError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      <FormSection
        title="Product details"
        description="Products have no fixed price. The price is agreed on each quotation and order."
      >
        <TextField
          id="name"
          label="Product name"
          required
          placeholder="Hollow Blocks 6 × 9"
          error={errors.name?.message}
          {...register('name')}
        />

        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <SelectField
              id="category"
              label="Category"
              required
              value={field.value}
              onChange={field.onChange}
              options={CATEGORY_OPTIONS}
              error={errors.category?.message}
            />
          )}
        />

        <TextField
          id="size"
          label="Size"
          required
          placeholder="6 × 9"
          hint="As written on quotations and delivery notes."
          error={errors.size?.message}
          {...register('size')}
        />

        <TextareaField
          id="description"
          label="Description"
          placeholder="Optional notes about this product."
          error={errors.description?.message}
          {...register('description')}
        />
      </FormSection>

      <FormActions
        submitLabel={product ? 'Save changes' : 'Add product'}
        pending={pending}
        onCancel={() => {
          router.back();
        }}
      />
    </form>
  );
}
