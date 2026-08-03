import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PurchasePaymentForm } from '@/features/purchase-payments/components/purchase-payment-form';
import { ApiError } from '@/lib/api-client';
import { todayInNairobi } from '@/lib/format';

/**
 * Covers the Phase 7D form's two confirmed requirements that are easiest to
 * regress silently: the payment-reference field's label changing with the
 * selected payment method, and a successful submit actually reaching
 * `onSubmit` with the right shape (the same class of bug Phase 7C's
 * Purchase form had — see purchase-form.test.tsx).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

/** Base UI's Popover/Select do not open in jsdom — see purchase-form.test.tsx. */
vi.mock('@/components/forms/searchable-select', () => ({
  SearchableSelect: ({
    id,
    label,
    value,
    onChange,
    options,
  }: {
    id: string;
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
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
    </div>
  ),
}));

vi.mock('@/components/forms/select-field', () => ({
  SelectField: ({
    id,
    label,
    value,
    onChange,
    options,
  }: {
    id: string;
    label: string;
    value: string | undefined;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/features/suppliers/api/suppliers.api', () => ({
  fetchSuppliers: vi.fn().mockResolvedValue({
    suppliers: [
      {
        id: 'supplier-1',
        name: 'Rift Valley Cement',
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

vi.mock('@/features/purchases/api/purchases.api', () => ({
  fetchPurchases: vi.fn().mockResolvedValue({
    purchases: [],
    meta: { page: 1, pageSize: 100, totalRecords: 0, totalPages: 0 },
  }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function fillBasePayment() {
  await screen.findByText('Rift Valley Cement');
  fireEvent.change(screen.getByLabelText('Supplier'), { target: { value: 'supplier-1' } });
  fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '50000.00' } });
  fireEvent.change(screen.getByLabelText(/Payment date/), { target: { value: '2026-08-03' } });
}

describe('PurchasePaymentForm', () => {
  it("changes the reference field's label per selected payment method", async () => {
    renderWithClient(<PurchasePaymentForm onSubmit={vi.fn()} pending={false} />);

    expect(screen.getByLabelText(/M-Pesa transaction code/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'CHEQUE' } });
    expect(screen.getByLabelText(/Cheque number or details/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'BANK_TRANSFER' } });
    expect(screen.getByLabelText(/Bank transfer reference/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Payment method'), { target: { value: 'CASH' } });
    expect(screen.getByLabelText(/Cash voucher or receipt reference/)).toBeInTheDocument();
  });

  it('submits a payment with the entered amount, method, and reference', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<PurchasePaymentForm onSubmit={onSubmit} pending={false} />);

    await fillBasePayment();
    fireEvent.change(screen.getByLabelText(/M-Pesa transaction code/), {
      target: { value: 'QGH7XJ2K9L' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save payment/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    const [submittedValues, submittedFile] = onSubmit.mock.calls[0] as [
      { supplierId: string; amount: string; paymentMethod: string; paymentReference: string },
      File | null,
    ];
    expect(submittedValues).toMatchObject({
      supplierId: 'supplier-1',
      amount: '50000.00',
      paymentMethod: 'MPESA',
      paymentReference: 'QGH7XJ2K9L',
    });
    expect(submittedFile).toBeNull();
  });

  it('rejects a submission with no payment reference', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithClient(<PurchasePaymentForm onSubmit={onSubmit} pending={false} />);

    await fillBasePayment();

    fireEvent.click(screen.getByRole('button', { name: /save payment/i }));

    await waitFor(() => {
      expect(screen.getByText(/Enter the payment reference or details/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows a backend error inline when the request is rejected', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        code: 'BUSINESS_RULE_VIOLATION',
        message: "Payment amount (KES 50000.00) exceeds Rift Valley Cement's outstanding balance (KES 10000.00).",
      }),
    );
    renderWithClient(<PurchasePaymentForm onSubmit={onSubmit} pending={false} />);

    await fillBasePayment();
    fireEvent.change(screen.getByLabelText(/M-Pesa transaction code/), {
      target: { value: 'QGH7XJ2K9L' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save payment/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/exceeds Rift Valley Cement's outstanding balance/);
  });

  describe('future date restriction', () => {
    it("caps the date picker at today's Nairobi date", () => {
      renderWithClient(<PurchasePaymentForm onSubmit={vi.fn()} pending={false} />);

      expect(screen.getByLabelText(/Payment date/)).toHaveAttribute('max', todayInNairobi());
    });

    it('rejects a future payment date', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      renderWithClient(<PurchasePaymentForm onSubmit={onSubmit} pending={false} />);

      await fillBasePayment();
      fireEvent.change(screen.getByLabelText(/M-Pesa transaction code/), {
        target: { value: 'QGH7XJ2K9L' },
      });
      fireEvent.change(screen.getByLabelText(/Payment date/), { target: { value: '2999-01-01' } });

      fireEvent.click(screen.getByRole('button', { name: /save payment/i }));

      await waitFor(() => {
        expect(screen.getByText(/cannot be in the future/i)).toBeInTheDocument();
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
