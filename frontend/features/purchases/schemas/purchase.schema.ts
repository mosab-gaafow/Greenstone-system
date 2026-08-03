import { z } from 'zod';
import { todayInNairobi } from '@/lib/format';

/**
 * Purchase form validation.
 *
 * Kept permissive here, the same "preview only, backend is final authority"
 * split `production.schema.ts` already uses for its own per-product rule
 * (confirmed pieces-per-pallet): which fields a Purchase Item actually
 * requires depends on whether the selected raw material is Pumice, and the
 * form only ever renders the fields that apply (see `purchase-form.tsx`), so
 * there is no need to duplicate that business rule here. The backend
 * re-validates and rejects a wrong shape regardless.
 *
 * `useFieldArray` keeps every item's full shape in form state even for
 * fields whose input is not currently rendered (Cement never renders the
 * Pumice length/width/height/loads/rate fields, and vice versa) — a plain
 * text input always produces `''`, never `undefined`, for an untouched
 * field. `z.string().optional()` only accepts a missing/`undefined` value,
 * not `''`, so without the `z.preprocess` below every one of these "not
 * applicable right now" fields failed its regex on every submission,
 * silently, since the corresponding error text is never rendered for a
 * field whose input is hidden. The preprocess step normalises `''` to
 * `undefined` first, so an inapplicable, untouched field is treated as
 * genuinely absent.
 */

function optionalDecimalString(message: string) {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().regex(/^\d+(\.\d+)?$/, message).optional(),
  );
}

const decimalString = optionalDecimalString('Enter a positive amount.');

export const purchaseItemFormSchema = z.object({
  rawMaterialId: z.string().min(1, 'Select a raw material.'),
  quantity: decimalString,
  unitCost: decimalString,
  lengthMetres: decimalString,
  widthMetres: decimalString,
  heightMetres: decimalString,
  numberOfLoads: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().regex(/^\d+$/, 'Enter a whole number.').optional(),
  ),
  ratePerCubicMetre: decimalString,
});

export const purchaseFormSchema = z.object({
  supplierId: z.string().min(1, 'Select a supplier.'),
  purchaseDate: z
    .string()
    .min(1, 'Select a date.')
    // Both are plain `YYYY-MM-DD` strings, so lexicographic comparison is
    // exact — mirrors the backend's `isNotFutureNairobiDate`.
    .refine((value) => value <= todayInNairobi(), { message: 'Purchase date cannot be in the future.' }),
  reference: z.string().trim().max(150, 'Reference must be 150 characters or fewer.').optional(),
  items: z.array(purchaseItemFormSchema).min(1, 'Add at least one item.'),
});

export type PurchaseItemFormValues = z.infer<typeof purchaseItemFormSchema>;
/** Before the `z.preprocess` normalisation runs — what `useForm` actually holds. */
export type PurchaseFormInput = z.input<typeof purchaseFormSchema>;
/** After normalisation — what `onSubmit` receives. */
export type PurchaseFormValues = z.output<typeof purchaseFormSchema>;
