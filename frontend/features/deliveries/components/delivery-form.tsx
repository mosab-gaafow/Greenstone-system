'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, User, Car, ShoppingCart, MapPin, Package, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SearchableSelect } from '@/components/forms/searchable-select';
import { FormSection } from '@/components/forms/form-section';
import { useCreateDelivery } from '../hooks/use-deliveries';
import { useOrders, useOrder, useOrderDeliveryAvailability } from '@/features/orders/hooks/use-orders';
import { useCustomer } from '@/features/customers/hooks/use-customers';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { useCreditStatus } from '@/features/customers/hooks/use-customer-credit';
import { canOverrideCredit } from '@/lib/permissions';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { deliveryFormSchema, type DeliveryFormInput } from '../schemas/delivery.schema';
import type { DeliveryAvailabilityItem } from '@/features/orders/api/orders.api';
import type { OrderDetail } from '@/features/orders/types/order.types';

export function DeliveryForm() {
  const router = useRouter();
  const createDelivery = useCreateDelivery();
  const { user } = useCurrentUser();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<DeliveryFormInput>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      orderId: '',
      customerAddressId: '',
      driverId: '',
      vehicleId: '',
      deliveryDate: new Date().toISOString().split('T')[0] as unknown as Date,
      items: [],
      creditOverrideReason: '',
    },
  });

  const orderId = useWatch({ control, name: 'orderId' });
  const items = useWatch({ control, name: 'items' });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  // Available orders
  const ordersQuery = useOrders({ page: 1, pageSize: 100 });
  const orderOptions = useMemo(
    () =>
      (ordersQuery.data?.orders ?? [])
        .filter((o) => o.status !== 'CANCELLED')
        .map((o) => ({ value: o.id, label: `${o.orderNumber} — ${o.customerName}` })),
    [ordersQuery.data],
  );

  // Selected order detail
  const orderQuery = useOrder(orderId || '');
  const selectedOrder: OrderDetail | undefined =
    orderId && orderQuery.data && 'items' in orderQuery.data
      ? (orderQuery.data as OrderDetail)
      : undefined;

  // Backend-authoritative delivery availability
  const availabilityQuery = useOrderDeliveryAvailability(orderId || '');
  const availabilityById = useMemo(() => {
    const map: Record<string, DeliveryAvailabilityItem | undefined> = {};
    for (const item of availabilityQuery.data?.items ?? []) {
      map[item.orderItemId] = item;
    }
    return map;
  }, [availabilityQuery.data]);

  // Customer info
  const customerId = selectedOrder?.customerId ?? '';
  const customerQuery = useCustomer(customerId);
  const addressOptions = useMemo(
    () =>
      (customerQuery.data?.addresses ?? [])
        .filter((a) => a.isActive)
        .map((a) => ({ value: a.id, label: a.label })),
    [customerQuery.data],
  );

  // Credit status
  const creditQuery = useCreditStatus(
    selectedOrder?.paymentArrangement === 'CREDIT' ? customerId : undefined,
  );
  const isBlocked = creditQuery.data?.creditStatus === 'BLOCKED';
  const showOverrideField = selectedOrder?.paymentArrangement === 'CREDIT' && isBlocked;

  // Drivers
  const driversQuery = useDrivers({ page: 1, pageSize: 100 });
  const driverOptions = useMemo(
    () =>
      (driversQuery.data?.drivers ?? [])
        .filter((d) => d.isActive)
        .map((d) => ({ value: d.id, label: d.name })),
    [driversQuery.data],
  );

  // Vehicles
  const vehiclesQuery = useVehicles({ page: 1, pageSize: 100 });
  const vehicleOptions = useMemo(
    () =>
      (vehiclesQuery.data?.vehicles ?? [])
        .filter((v) => v.isActive)
        .map((v) => ({
          value: v.id,
          label: `${v.registrationNumber} (${v.vehicleOwnerName})`,
        })),
    [vehiclesQuery.data],
  );

  // Available order items for the items picker
  const availableOrderItems = useMemo(() => {
    if (!selectedOrder?.items) return [];
    const usedIds = new Set(items.map((i) => i.orderItemId).filter(Boolean));
    return selectedOrder.items.filter((oi) => !usedIds.has(oi.id));
  }, [selectedOrder, items]);

  // Max plannable
  // Max plannable from backend authority
  function maxPlannable(item: { orderItemId: string }): {
    orderRemaining: number;
    committedQuantity: number;
    stockAvailable: number;
    maxPlannable: number;
  } | null {
    const info = availabilityById[item.orderItemId];
    if (!info) return null;
    return {
      orderRemaining: info.remainingQuantity,
      committedQuantity: info.committedQuantity,
      stockAvailable: info.stockAvailableQuantity,
      maxPlannable: info.maxPlannableQuantity,
    };
  }

  const canPlanAny = useMemo(() => {
    for (const item of availabilityQuery.data?.items ?? []) {
      if (item.maxPlannableQuantity > 0) return true;
    }
    return false;
  }, [availabilityQuery.data]);

  const stockIsLoading = !!orderId && availabilityQuery.isPending;

  const onSubmit = useCallback(
    (values: DeliveryFormInput) => {
      createDelivery.mutate(values as never, {
        onSuccess: (delivery) => {
          router.push(`/deliveries/${delivery.id}`);
        },
      });
    },
    [createDelivery, router],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-2xl space-y-8">
      <FormSection title="Order" icon={ShoppingCart}>
        <Controller
          name="orderId"
          control={control}
          render={({ field }) => (
            <SearchableSelect
              id="orderId"
              label="Order"
              required
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                setValue('customerAddressId', '');
                setValue('items', []);
                setValue('creditOverrideReason', '');
              }}
              options={orderOptions}
              placeholder={ordersQuery.isPending ? 'Loading orders…' : 'Select an order'}
              searchPlaceholder="Search orders"
              emptyMessage="No active orders found."
              disabled={ordersQuery.isPending}
              error={errors.orderId?.message}
            />
          )}
        />
      </FormSection>

      {selectedOrder && (
        <>
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
                  placeholder="Select a site"
                  searchPlaceholder="Search sites"
                  emptyMessage="No active sites for this customer."
                  disabled={customerQuery.isPending}
                  error={errors.customerAddressId?.message}
                />
              )}
            />
          </FormSection>

          <FormSection title="Driver" icon={User}>
            <Controller
              name="driverId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  id="driverId"
                  label="Driver"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  options={driverOptions}
                  placeholder={driversQuery.isPending ? 'Loading drivers…' : 'Select a driver'}
                  searchPlaceholder="Search drivers"
                  emptyMessage="No active drivers found."
                  disabled={driversQuery.isPending}
                  error={errors.driverId?.message}
                />
              )}
            />
          </FormSection>

          <FormSection title="Vehicle" icon={Car}>
            <Controller
              name="vehicleId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  id="vehicleId"
                  label="Vehicle"
                  required
                  value={field.value}
                  onChange={field.onChange}
                  options={vehicleOptions}
                  placeholder={vehiclesQuery.isPending ? 'Loading vehicles…' : 'Select a vehicle'}
                  searchPlaceholder="Search vehicles"
                  emptyMessage="No active vehicles found."
                  disabled={vehiclesQuery.isPending}
                  error={errors.vehicleId?.message}
                />
              )}
            />
          </FormSection>

          <FormSection title="Delivery date" icon={Calendar}>
            <div className="space-y-2">
              <Label
                htmlFor="deliveryDate"
                className="after:ml-0.5 after:text-destructive after:content-['*']"
              >
                Date
              </Label>
              <Input id="deliveryDate" type="date" {...register('deliveryDate')} />
              {errors.deliveryDate?.message && (
                <p className="text-destructive text-sm" role="alert">
                  {errors.deliveryDate.message}
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Delivery items" icon={Package}>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const itemId = items[index]?.orderItemId;
                const info = itemId ? maxPlannable({ orderItemId: itemId }) : null;

                return (
                  <div key={field.id} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 space-y-2">
                        <Label>Order item</Label>
                        <Controller
                          name={`items.${index}.orderItemId`}
                          control={control}
                          render={({ field: itemField }) => (
                            <select
                              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                              value={itemField.value}
                              onChange={(e) => {
                                const oi = selectedOrder.items.find(
                                  (i) => i.id === e.target.value,
                                );
                                itemField.onChange(e.target.value);
                                if (oi) {
                                  setValue(
                                    `items.${index}.productId` as never,
                                    oi.productId as never,
                                  );
                                }
                              }}
                            >
                              <option value="">Select an item…</option>
                              {availableOrderItems.map((oi) => (
                                <option key={oi.id} value={oi.id}>
                                  {oi.productName}
                                </option>
                              ))}
                              {itemId &&
                                !availableOrderItems.find((oi) => oi.id === itemId) &&
                                (() => {
                                  const cur = selectedOrder.items.find((oi) => oi.id === itemId);
                                  return cur ? (
                                    <option value={cur.id}>{cur.productName}</option>
                                  ) : null;
                                })()}
                            </select>
                          )}
                        />
                      </div>
                      <div className="w-24 space-y-2">
                        <Label>Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          max={info?.maxPlannable && info.maxPlannable > 0 ? info.maxPlannable : undefined}
                          {...register(`items.${index}.plannedQuantity`)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => remove(index)}
                        aria-label="Remove item"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {info && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          Remaining:{' '}
                          <span className="font-medium tabular-nums">{info.orderRemaining}</span>
                        </span>
                        <span>
                          Planned:{' '}
                          <span className="font-medium tabular-nums">{info.committedQuantity}</span>
                        </span>
                        <span>
                          Stock:{' '}
                          <span
                            className={`font-medium tabular-nums ${info.stockAvailable === 0 ? 'text-destructive' : ''}`}
                          >
                            {info.stockAvailable}
                          </span>
                        </span>
                        <span>
                          Max:{' '}
                          <span
                            className={`font-semibold tabular-nums ${info.maxPlannable === 0 ? 'text-destructive' : ''}`}
                          >
                            {info.maxPlannable}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {fields.length === 0 && (
                <p className="text-muted-foreground text-sm">No items added yet.</p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    orderItemId: '',
                    productId: '',
                    plannedQuantity: 0 as unknown as number,
                  })
                }
              >
                <Plus className="size-4" aria-hidden />
                Add item
              </Button>
            </div>
            {errors.items?.message && (
              <p className="text-destructive text-sm mt-2" role="alert">
                {errors.items.message}
              </p>
            )}
          </FormSection>

          {showOverrideField && (
            <FormSection title="Credit" icon={ShoppingCart}>
              {canOverrideCredit(user) ? (
                <div className="space-y-3">
                  <Alert variant="destructive" role="status">
                    <AlertDescription>
                      This customer is credit-blocked. Provide a reason below to override.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label
                      htmlFor="creditOverrideReason"
                      className="after:ml-0.5 after:text-destructive after:content-['*']"
                    >
                      Override reason
                    </Label>
                    <textarea
                      id="creditOverrideReason"
                      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                      rows={3}
                      placeholder="Why this delivery should proceed despite the block."
                      {...register('creditOverrideReason')}
                    />
                    {errors.creditOverrideReason?.message && (
                      <p className="text-destructive text-sm" role="alert">
                        {errors.creditOverrideReason.message}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <Alert variant="destructive" role="status">
                  <AlertDescription>
                    This customer is credit-blocked. Only Admin/Super Admin can override.
                  </AlertDescription>
                </Alert>
              )}
            </FormSection>
          )}
        </>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={
            createDelivery.isPending ||
            !selectedOrder ||
            stockIsLoading ||
            (selectedOrder && !canPlanAny)
          }
          className="h-11"
        >
          {createDelivery.isPending
            ? 'Saving…'
            : !selectedOrder
              ? 'Select an order'
              : stockIsLoading
                ? 'Loading stock…'
                : !canPlanAny
                  ? 'No plannable quantity — check remaining and stock'
                  : 'Plan delivery'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={createDelivery.isPending}
          className="h-11"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
