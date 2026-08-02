import type { Order, OrderItem, Prisma, Product } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
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

  if (filters.paymentType !== undefined) {
    where.paymentType = filters.paymentType;
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

export async function findOrderBySourceQuotationId(
  quotationId: string,
  client: DbClient = getPrisma(),
): Promise<Order | null> {
  return client.order.findUnique({ where: { sourceQuotationId: quotationId } });
}

export async function insertOrder(
  input: {
    orderNumber: string;
    customerId: string;
    customerAddressId: string;
    addressLabel: string;
    addressLine: string;
    addressDirections: string | null;
    sourceQuotationId: string | null;
    paymentType: Prisma.OrderCreateInput['paymentType'];
    totalAmount: Prisma.Decimal;
    items: (OrderItemInput & {
      lineTotal: Prisma.Decimal;
      sourceQuotationItemId: string | null;
    })[];
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
      sourceQuotationId: input.sourceQuotationId,
      paymentType: input.paymentType,
      totalAmount: input.totalAmount,
      items: {
        create: input.items.map((item, index) => ({
          productId: item.productId,
          quantity: item.quantity,
          agreedUnitPrice: item.agreedUnitPrice,
          lineTotal: item.lineTotal,
          sourceQuotationItemId: item.sourceQuotationItemId,
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
