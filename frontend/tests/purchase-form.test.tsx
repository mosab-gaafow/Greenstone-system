import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PurchaseForm } from '@/features/purchases/components/purchase-form';
import { ApiError } from '@/lib/api-client';
import { todayInNairobi } from '@/lib/format';

/**
 * Regression test for the Phase 7C "Save purchase does nothing" bug.
 *
 * Root cause: `useFieldArray` keeps every Purchase Item's full shape in form
 * state even for fields whose input is not currently rendered — a Cement
 * item's untouched Pumice fields (length/width/height/loads/rate) hold `''`,
 * not `undefined`. `z.string().optional()` only accepts a missing/`undefined`
 * value, so every one of those "not applicable right now" fields failed its
 * regex on every submission, silently — the corresponding error text is
 * never rendered because the matching input is hidden for a non-Pumice
 * material. `handleSubmit`'s onValid callback was therefore never invoked
 * for *any* purchase, which is why the button looked active but nothing
 * happened. Fixed in purchase.schema.ts with a `z.preprocess` step that
 * normalises `''` to `undefined` before the regex runs.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

/**
 * `SearchableSelect` is a Base UI Popover + cmdk combobox that does not open
 * in jsdom (no real layout/pointer-capture support), unrelated to this bug.
 * Swapped for a plain, labelled `<select>` here so the test can drive the
 * real bug under test — the surrounding form and Zod validation — without
 * fighting that unrelated popover mechanics.
 */
vi.mock('@/components/forms/searchable-select', () => ({
  SearchableSelect: ({
    id,
    label,
    value,
    onChange,
    options,
    error,
  }: {
    id: string;
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    error?: string;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </div>
  ),
}));

vi.mock('@/features/suppliers/api/suppliers.api', () => ({
  fetchSuppliers: vi.fn().mockResolvedValue({
    suppliers: [
      {
        id: 'supplier-1',
        name: 'Mombasa Cement Ltd',
        phone: '0722000000',
        email: null,
        address: null,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    meta: { page: 1, pageSize: 100, totalRecords: 1, totalPages: 1 },
  }),
}));

vi.mock('@/features/raw-materials/api/raw-materials.api', () => ({
  fetchRawMaterials: vi.fn().mockResolvedValue({
    rawMaterials: [
      {
        id: 'material-1',
        name: 'Cement',
        measurementUnitId: 'unit-1',
        measurementUnitName: 'Sack',
        measurementUnitSymbol: null,
        reorderLevel: null,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    meta: { page: 1, pageSize: 100, totalRecords: 1, totalPages: 1 },
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Selects the mocked supplier and Cement raw material, then fills quantity/unit cost. */
async function fillCementPurchase() {
  // Wait for the mocked queries to resolve and populate each <select>'s options.
  await screen.findByText('Mombasa Cement Ltd');
  await screen.findByText('Cement');

  fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'supplier-1' } });
  fireEvent.change(screen.getByLabelText('Raw material'), { target: { value: 'material-1' } });

  // Required fields render a trailing "*" inside the <label>, so an exact
  // string match fails — the same reason the bug's silent errors were never
  // visible to the required-only Pumice fields either.
  fireEvent.change(screen.getByLabelText(/Quantity purchased/), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText(/Unit cost \(KES\)/), { target: { value: '850' } });
}

describe('PurchaseForm', () => {
  it('submits a Cement purchase with quantity 100 and unit cost 850', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<PurchaseForm onSubmit={onSubmit} pending={false} />);

    await fillCementPurchase();

    fireEvent.click(screen.getByRole('button', { name: /save purchase/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted).toMatchObject({
      supplierId: 'supplier-1',
      items: [{ rawMaterialId: 'material-1', quantity: '100', unitCost: '850' }],
    });
    // Reference stayed optional and empty — `purchases.api.ts` converts an
    // empty reference to `undefined` before it reaches the network request,
    // which is exercised in purchases.test.ts on the backend side.
    expect(submitted.reference).toBe('');
  });

  it('shows a backend error inline when the request is rejected', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'Enter the unit cost for "Cement".',
      }),
    );
    renderWithClient(<PurchaseForm onSubmit={onSubmit} pending={false} />);

    await fillCementPurchase();

    fireEvent.click(screen.getByRole('button', { name: /save purchase/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Enter the unit cost for "Cement".');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  describe('future date restriction', () => {
    it("caps the date picker at today's Nairobi date", () => {
      renderWithClient(<PurchaseForm onSubmit={vi.fn()} pending={false} />);

      expect(screen.getByLabelText(/Purchase date/)).toHaveAttribute('max', todayInNairobi());
    });

    it('rejects a future purchase date', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderWithClient(<PurchaseForm onSubmit={onSubmit} pending={false} />);

      await fillCementPurchase();
      fireEvent.change(screen.getByLabelText(/Purchase date/), { target: { value: '2999-01-01' } });

      fireEvent.click(screen.getByRole('button', { name: /save purchase/i }));

      await waitFor(() => {
        expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
