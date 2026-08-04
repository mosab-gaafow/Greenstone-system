import type {
  Delivery,
  DeliveryItem,
  Driver,
  Prisma,
  Product,
  Vehicle,
  VehicleOwner,
} from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import { lockRowsForUpdate, type DbClient, type TransactionClient } from '../../shared/database/transaction.js';
import type { DeliveryItemInput, ListDeliveriesFilters } from './deliveries.types.js';

/**
 * Delivery database access (Phase 8A).
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type DeliveryRow = Delivery & {
  order: { orderNumber: string };
  customer: { name: string };
  driver: { name: string };
  vehicle: { registrationNumber: string };
  _count: { items: number };
};

export type DeliveryDetailRow = Delivery & {
  order: { orderNumber: string };
  customer: { name: string };
  driver: Driver;
  vehicle: Vehicle & { vehicleOwner: VehicleOwner };
  items: (DeliveryItem & { product: Product })[];
};

function buildWhere(filters: ListDeliveriesFilters): Prisma.DeliveryWhereInput {
  const where: Prisma.DeliveryWhereInput = {};

  if (filters.search) {
    where.OR = [
      { deliveryNumber: { contains: filters.search } },
      { customer: { name: { contains: filters.search } } },
      { order: { orderNumber: { contains: filters.search } } },
      { driver: { name: { contains: filters.search } } },
    ];
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  if (filters.customerId !== undefined) {
    where.customerId = filters.customerId;
  }

  if (filters.orderId !== undefined) {
    where.orderId = filters.orderId;
  }

  return where;
}

export async function findDeliveries(
  filters: ListDeliveriesFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: DeliveryRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.delivery.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: {
        order: { select: { orderNumber: true } },
        customer: { select: { name: true } },
        driver: { select: { name: true } },
        vehicle: { select: { registrationNumber: true } },
        _count: { select: { items: true } },
      },
    }),
    client.delivery.count({ where }),
  ]);

  return { rows, total };
}

export async function findDeliveryById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<DeliveryDetailRow | null> {
  return client.delivery.findUnique({
    where: { id },
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
      driver: true,
      vehicle: { include: { vehicleOwner: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

export async function insertDelivery(
  input: {
    deliveryNumber: string;
    orderId: string;
    customerId: string;
    customerAddressId: string;
    addressLabel: string;
    addressLine: string;
    addressDirections: string | null;
    driverId: string;
    vehicleId: string;
    vehicleOwnerId: string;
    payeeName: string;
    payeePhone: string;
    deliveryDate: Date;
    items: DeliveryItemInput[];
    createdByUserId: string | null;
  },
  tx: TransactionClient,
): Promise<DeliveryDetailRow> {
  return tx.delivery.create({
    data: {
      deliveryNumber: input.deliveryNumber,
      orderId: input.orderId,
      customerId: input.customerId,
      customerAddressId: input.customerAddressId,
      addressLabel: input.addressLabel,
      addressLine: input.addressLine,
      addressDirections: input.addressDirections,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      vehicleOwnerId: input.vehicleOwnerId,
      payeeName: input.payeeName,
      payeePhone: input.payeePhone,
      deliveryDate: input.deliveryDate,
      createdByUserId: input.createdByUserId,
      items: {
        create: input.items.map((item, index) => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          plannedQuantity: item.plannedQuantity,
          reservedQuantity: item.plannedQuantity,
          sortOrder: index,
        })),
      },
    },
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
      driver: true,
      vehicle: { include: { vehicleOwner: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

/**
 * Sum of delivery-item quantities already committed to active (PLANNED or
 * DISPATCHED) deliveries for a set of order items. Used inside the creation
 * transaction after OrderItem locks are acquired.
 *
 * PLANNED deliveries contribute `DeliveryItem.plannedQuantity` (reserved
 * stock, OrderItem unchanged). DISPATCHED deliveries contribute
 * `DeliveryItem.dispatchedQuantity` (stock left the yard, but
 * `OrderItem.deliveredQuantity` is still 0 until DELIVERED). DELIVERED is
 * already captured in `OrderItem.deliveredQuantity` — no separate term
 * needed. CANCELLED contributes 0.
 *
 * Accepts either a TransactionClient (inside a tx) or defaults to the
 * standard Prisma client (for fast-fail pre-checks outside a transaction).
 */
export async function sumCommittedQuantities(
  orderItemIds: string[],
  client: DbClient = getPrisma(),
): Promise<Map<string, number>> {
  if (orderItemIds.length === 0) {
    return new Map();
  }

  const rows = await client.deliveryItem.groupBy({
    by: ['orderItemId'],
    where: {
      orderItemId: { in: orderItemIds },
      delivery: { status: { in: ['PLANNED', 'DISPATCHED'] } },
    },
    _sum: {
      plannedQuantity: true,
      dispatchedQuantity: true,
    },
  });

  const result = new Map<string, number>();
  for (const row of rows) {
    const planned = row._sum.plannedQuantity ?? 0;
    const dispatched = row._sum.dispatchedQuantity ?? 0;
    result.set(row.orderItemId, planned + dispatched);
  }
  return result;
}

/**
 * Returns true when the customer has at least one PLANNED or DISPATCHED
 * delivery. Used by the customer deactivation check.
 */
export async function hasActiveDeliveriesForCustomer(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<boolean> {
  const count = await client.delivery.count({
    where: { customerId, status: { in: ['PLANNED', 'DISPATCHED'] } },
  });
  return count > 0;
}

/**
 * Returns distinct product IDs with reserved stock from PLANNED deliveries
 * for this customer. Used by the customer deactivation check.
 */
export async function getReservedStockProductIdsForCustomer(
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<string[]> {
  const rows = await client.deliveryItem.findMany({
    where: {
      delivery: { customerId, status: 'PLANNED' },
      reservedQuantity: { gt: 0 },
    },
    select: { productId: true },
    distinct: ['productId'],
  });
  return rows.map((r) => r.productId);
}

/**
 * Locks a set of OrderItem rows inside a transaction in deterministic
 * order (sorted by id ASC) to prevent deadlocks when two concurrent
 * deliveries touch overlapping items.
 */
export async function lockOrderItems(
  tx: TransactionClient,
  orderItemIds: string[],
): Promise<void> {
  const sorted = [...orderItemIds].sort();
  for (const id of sorted) {
    await lockRowsForUpdate(tx, 'order_items', 'id', id);
  }
}

/**
 * Locks a set of FinishedStockBalance rows inside a transaction in
 * deterministic order (sorted by productId ASC) to prevent deadlocks.
 */
export async function lockStockBalances(
  tx: TransactionClient,
  productIds: string[],
): Promise<void> {
  const sorted = [...productIds].sort();
  for (const productId of sorted) {
    await lockRowsForUpdate(tx, 'finished_stock_balances', 'productId', productId);
  }
}

/**
 * Validates the customer address belongs to the given customer and is
 * active. Plain query against customer_addresses — same direct-read pattern
 * customer-credit.repository.ts uses for orders, avoiding a circular
 * dependency with customers.service.
 */
export async function validateAddressForDelivery(
  addressId: string,
  customerId: string,
  client: DbClient = getPrisma(),
): Promise<{ id: string; label: string; addressLine: string; directions: string | null; isActive: boolean } | null> {
  const row = await client.customerAddress.findUnique({
    where: { id: addressId, customerId },
    select: { id: true, label: true, addressLine: true, directions: true, isActive: true },
  });
  return row;
}

/**
 * Reads locked OrderItem rows after lockOrderItems() has been called.
 */
export async function readLockedOrderItems(
  tx: TransactionClient,
  orderItemIds: string[],
): Promise<Map<string, { remainingQuantity: number; allocatedQuantity: number; deliveredQuantity: number }>> {
  const rows = await tx.orderItem.findMany({
    where: { id: { in: orderItemIds } },
    select: { id: true, remainingQuantity: true, allocatedQuantity: true, deliveredQuantity: true },
  });

  const result = new Map<string, { remainingQuantity: number; allocatedQuantity: number; deliveredQuantity: number }>();
  for (const row of rows) {
    result.set(row.id, {
      remainingQuantity: row.remainingQuantity,
      allocatedQuantity: row.allocatedQuantity,
      deliveredQuantity: row.deliveredQuantity,
    });
  }
  return result;
}
