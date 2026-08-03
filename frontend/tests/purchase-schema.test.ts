import { describe, expect, it } from 'vitest';
import { purchaseFormSchema } from '@/features/purchases/schemas/purchase.schema';

/**
 * Isolates the Phase 7C "Save purchase does nothing" root cause at the
 * schema level, independent of any component rendering: `useFieldArray`
 * keeps every Purchase Item's full shape in form state, so a Cement item's
 * untouched Pumice fields arrive as `''`, not `undefined`. Before the fix,
 * `z.string().optional()` rejected that empty string (only a missing/
 * `undefined` value satisfies `.optional()`), so this exact input failed
 * validation on every submission.
 */
describe('purchaseFormSchema', () => {
  it('accepts a Cement item whose unused Pumice fields are untouched empty strings', () => {
    const result = purchaseFormSchema.safeParse({
      supplierId: 'supplier-1',
      purchaseDate: '2026-08-03',
      reference: '',
      items: [
        {
          rawMaterialId: 'material-1',
          quantity: '100',
          unitCost: '850',
          lengthMetres: '',
          widthMetres: '',
          heightMetres: '',
          numberOfLoads: '',
          ratePerCubicMetre: '',
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]).toMatchObject({ quantity: '100', unitCost: '850' });
      expect(result.data.items[0]?.lengthMetres).toBeUndefined();
      expect(result.data.items[0]?.ratePerCubicMetre).toBeUndefined();
    }
  });

  it('accepts a Pumice item whose unused generic fields are untouched empty strings', () => {
    const result = purchaseFormSchema.safeParse({
      supplierId: 'supplier-1',
      purchaseDate: '2026-08-03',
      items: [
        {
          rawMaterialId: 'material-2',
          quantity: '',
          unitCost: '',
          lengthMetres: '3',
          widthMetres: '2',
          heightMetres: '1.5',
          numberOfLoads: '4',
          ratePerCubicMetre: '1100.00',
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.quantity).toBeUndefined();
      expect(result.data.items[0]).toMatchObject({
        lengthMetres: '3',
        widthMetres: '2',
        heightMetres: '1.5',
        numberOfLoads: '4',
        ratePerCubicMetre: '1100.00',
      });
    }
  });

  it('still rejects a genuinely invalid value', () => {
    const result = purchaseFormSchema.safeParse({
      supplierId: 'supplier-1',
      purchaseDate: '2026-08-03',
      items: [{ rawMaterialId: 'material-1', quantity: 'not-a-number', unitCost: '850' }],
    });

    expect(result.success).toBe(false);
  });
});
