import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { ApiError } from '@/lib/api-client';
import type { Vehicle } from '@/features/vehicles/types/vehicle.types';

/**
 * Registration-number duplicate detection is enforced by the backend and the
 * database (the source of truth). This covers the third, frontend layer: a
 * duplicate rejected by the backend must surface clearly on the form, not
 * fail silently. See vehicles.test.ts for the backend/database coverage.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/features/vehicle-owners/api/vehicle-owners.api', () => ({
  fetchVehicleOwners: vi.fn().mockResolvedValue({
    vehicleOwners: [{ id: 'owner-1', name: 'Kamau Transporters', isActive: true }],
    totalRecords: 1,
  }),
}));

const existingVehicle: Vehicle = {
  id: 'vehicle-1',
  registrationNumber: 'KDM 293E',
  vehicleType: 'Lorry',
  vehicleOwnerId: 'owner-1',
  vehicleOwnerName: 'Kamau Transporters',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('VehicleForm', () => {
  it('shows the backend duplicate-registration error inline', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        code: 'BUSINESS_RULE_VIOLATION',
        message: 'A vehicle with registration number KDM 293E already exists.',
      }),
    );

    renderWithClient(<VehicleForm vehicle={existingVehicle} onSubmit={onSubmit} pending={false} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('A vehicle with registration number KDM 293E already exists.');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
