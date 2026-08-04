import type { Order, OrderItem, OrderStatus, Prisma, Product } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient, TransactionClient } from '../../shared/database/transaction.js';
import type { ListOrdersFilters, OrderItemInput } from './orders.types.js';

/**
 * Order database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type OrderRow = Order & { customer: { name: string }; _count: { items: number } };
export type OrderItemRow = OrderItem & { product: Product };
export type OrderDetailRow = Order & {
  customer: { name: string };
  items: OrderItemRow[];
};

function buildWhere(filters: ListOrdersFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search } },
      { customer: { name: { contains: filters.search } } },
    ];
  }

  if (filters.customerId !== undefined) {
    where.customerId = filters.customerId;
  }

  if (filters.paymentArrangement !== undefined) {
    where.paymentArrangement = filters.paymentArrangement;
  }

  if (filters.status !== undefined) {
    where.status = filters.status;
  }

  return where;
}

export async function findOrders(
  filters: ListOrdersFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: OrderRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.order.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
      include: { customer: { select: { name: true } }, _count: { select: { items: true } } },
    }),
    client.order.count({ where }),
  ]);

  return { rows, total };
}

export async function findOrderById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<OrderDetailRow | null> {
  return client.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

/** Used by `production.service.ts` when a batch allocates quantity to this item. */
export async function incrementOrderItemProducedQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  await tx.orderItem.update({
    where: { id: orderItemId },
    data: { producedQuantity: { increment: quantity } },
  });
}

/** Used by `curing.service.ts` when curing releases quantity earmarked for this item. */
export async function incrementOrderItemAllocatedQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  await tx.orderItem.update({
    where: { id: orderItemId },
    data: { allocatedQuantity: { increment: quantity } },
  });
}

export async function insertOrder(
  input: {
    orderNumber: string;
    customerId: string;
    customerAddressId: string;
    addressLabel: string;
    addressLine: string;
    addressDirections: string | null;
    paymentArrangement: Prisma.OrderCreateInput['paymentArrangement'];
    totalAmount: Prisma.Decimal;
    items: (OrderItemInput & { lineTotal: Prisma.Decimal })[];
  },
  client: DbClient = getPrisma(),
): Promise<OrderDetailRow> {
  return client.order.create({
    data: {
      orderNumber: input.orderNumber,
      customerId: input.customerId,
      customerAddressId: input.customerAddressId,
      addressLabel: input.addressLabel,
      addressLine: input.addressLine,
      addressDirections: input.addressDirections,
      paymentArrangement: input.paymentArrangement,
      totalAmount: input.totalAmount,
      items: {
        create: input.items.map((item, index) => ({
          productId: item.productId,
          quantity: item.quantity,
          agreedUnitPrice: item.agreedUnitPrice,
          lineTotal: item.lineTotal,
          remainingQuantity: item.quantity,
          sortOrder: index,
        })),
      },
    },
    include: {
      customer: { select: { name: true } },
      items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
    },
  });
}

/** Used only by the explicit cancellation action — no generic status setter. */
export async function setOrderCancelled(
  id: string,
  reason: string,
  client: DbClient = getPrisma(),
): Promise<Order> {
  return client.order.update({
    where: { id },
    data: { status: 'CANCELLED' satisfies OrderStatus, statusReason: reason },
  });
}

/** Increments deliveredQuantity and decrements remainingQuantity on an order item. Phase 8D. */
export async function incrementOrderItemDeliveredQuantity(
  tx: TransactionClient,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  await tx.orderItem.update({
    where: { id: orderItemId },
    data: {
      deliveredQuantity: { increment: quantity },
      remainingQuantity: { decrement: quantity },
    },
  });
}

/** Sets the Order status based on its items. Phase 8D. */
export async function updateOrderStatus(
  tx: TransactionClient,
  orderId: string,
  status: OrderStatus,
): Promise<void> {
  await tx.order.update({
    where: { id: orderId },
    data: { status },
  });
}

/** Checks whether every item on an order has remainingQuantity = 0. */
export async function isOrderFullyDelivered(
  tx: TransactionClient,
  orderId: string,
): Promise<boolean> {
  const pending = await tx.orderItem.count({
    where: { orderId, remainingQuantity: { gt: 0 } },
  });
  return pending === 0;
}
