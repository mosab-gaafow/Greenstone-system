import { Prisma, type CreditStatus, type OrderPaymentArrangement } from '../../generated/prisma/client.js';
import {
  cancelDelivery,
  correctDeliveryItems,
  findDeliveries,
  findDeliveryById,
  hasActiveDeliveriesForCustomer,
  getReservedStockProductIdsForCustomer,
  dispatchDelivery,
  insertDelivery,
  isCustomerActive,
  lockOrderItems,
  lockStockBalances,
  readLockedOrderItems,
  setCorrectionReason,
  sumCommittedQuantities,
  updateTransport,
  type DeliveryDetailRow,
  type DeliveryRow,
} from './deliveries.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { hasPermission } from '../../shared/auth/permission.middleware.js';
import type { GreenstoneRole } from '../../shared/auth/permissions.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import {
  BusinessRuleViolationError,
  CustomerCreditBlockedError,
  InsufficientFinishedStockError,
  InvalidDocumentStatusError,
  PermissionDeniedError,
  ResourceNotFoundError,
} from '../../shared/errors/app-error.js';
import * as ordersService from '../orders/orders.service.js';
import * as driversService from '../drivers/drivers.service.js';
import * as vehiclesService from '../vehicles/vehicles.service.js';
import * as vehicleOwnersService from '../vehicle-owners/vehicle-owners.service.js';
import * as finishedStockService from '../finished-stock/finished-stock.service.js';
import * as customerCreditService from '../customer-credit/customer-credit.service.js';
import * as brokenProductsService from '../broken-products/broken-products.service.js';
import { ensureBalance, insertMovement, lockBalance, setBalanceQuantities } from '../finished-stock/finished-stock.repository.js';
import { validateAddressForDelivery } from './deliveries.repository.js';
import type {
  CancelDeliveryInput,
  CancelDeliveryResult,
  CompleteDeliveryInput,
  CompleteDeliveryResult,
  CorrectDeliveryInput,
  CorrectDeliveryResult,
  CreateDeliveryInput,
  DeliveryDetail,
  DeliverySummary,
  DeliveryTransportDetail,
  DispatchResult,
  ListDeliveriesFilters,
  ListDeliveriesResult,
  SetTransportInput,
} from './deliveries.types.js';

/**
 * Delivery business logic (Phase 8A). See business-blueprint section 2.19
 * and docs/implementation-plan.md §12.
 *
 * Phase 8A implements PLANNED deliveries only — create, list, read.
 * Reservation happens atomically inside the creation transaction.
 * No FinishedStockMovement row is written (reservation is not a physical-
 * stock change).
 *
 * Cross-module dependency graph:
 *   deliveries → orders, drivers, vehicles, vehicle-owners,
 *                finished-stock, customer-credit
 *   customers → deliveries (for deactivation check — one-directional)
 *   No module both imports and is imported by deliveries.
 */

const AUDIT_MODULE = 'deliveries';
const CACHE_MODULE = 'deliveries';
const LIST_TTL_SECONDS = 300;

interface OverridePlan {
  previousCreditStatus: CreditStatus;
  reason: string;
}

export async function listDeliveries(filters: ListDeliveriesFilters): Promise<ListDeliveriesResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findDeliveries(filters);
    return { deliveries: rows.map(toSummary), totalRecords: total };
  });
}

export async function getDelivery(id: string): Promise<DeliveryDetail> {
  return toDetail(await requireDelivery(id));
}

export async function createDelivery(
  input: CreateDeliveryInput,
  context: RequestContext,
): Promise<DeliveryDetail> {
  // --- Pre-transaction validation (fast-fail, read-only) -------------------

  // 1. Load and validate the order
  const order = await ordersService.getOrder(input.orderId);
  if (order.status === 'CANCELLED') {
    throw new BusinessRuleViolationError('Cannot create a delivery for a cancelled order.');
  }

  // 1b. Validate the customer is active
  const customerActive = await isCustomerActive(order.customerId);
  if (!customerActive) {
    throw new BusinessRuleViolationError(
      `Customer "${order.customerName}" is inactive and cannot receive deliveries.`,
    );
  }

  // 2. Validate the customer address belongs to the order's customer and is active
  const address = await validateAddressForDelivery(
    input.customerAddressId,
    order.customerId,
  );
  if (!address) {
    throw new ResourceNotFoundError('That address was not found for this customer.');
  }
  if (!address.isActive) {
    throw new BusinessRuleViolationError('This address is inactive and cannot be used for a delivery.');
  }

  // 3. Validate driver exists and is active
  const driver = await driversService.getDriver(input.driverId);
  if (!driver.isActive) {
    throw new BusinessRuleViolationError(`Driver "${driver.name}" is inactive.`);
  }

  // 4. Validate vehicle exists and is active; resolve payee
  const vehicle = await vehiclesService.getVehicle(input.vehicleId);
  if (!vehicle.isActive) {
    throw new BusinessRuleViolationError(`Vehicle "${vehicle.registrationNumber}" is inactive.`);
  }

  const vehicleOwner = await vehicleOwnersService.getVehicleOwner(vehicle.vehicleOwnerId);
  const payeeName = vehicleOwner.name;
  const payeePhone = vehicleOwner.phone;
  const vehicleOwnerId = vehicle.vehicleOwnerId;

  // 5. Every orderItemId must belong to this order; no duplicates
  const orderItemIdsInRequest = input.items.map((item) => item.orderItemId);
  if (new Set(orderItemIdsInRequest).size !== orderItemIdsInRequest.length) {
    throw new BusinessRuleViolationError(
      'The same order item cannot appear more than once in a delivery.',
    );
  }

  const orderItemMap = new Map(order.items.map((oi) => [oi.id, oi]));
  for (const item of input.items) {
    const orderItem = orderItemMap.get(item.orderItemId);
    if (!orderItem) {
      throw new BusinessRuleViolationError(
        `Order item ${item.orderItemId} does not belong to this order.`,
      );
    }
    if (item.productId !== orderItem.productId) {
      throw new BusinessRuleViolationError(
        `Product mismatch for order item ${item.orderItemId}.`,
      );
    }
  }

  // 6. Fast-fail: compute committed quantities (read-only, outside tx)
  const preCheckCommitted = await sumCommittedQuantities(orderItemIdsInRequest);
  for (const item of input.items) {
    const oi = orderItemMap.get(item.orderItemId)!;
    const committed = preCheckCommitted.get(item.orderItemId) ?? 0;
    const available = oi.remainingQuantity - committed;

    if (item.plannedQuantity > oi.remainingQuantity) {
      throw new BusinessRuleViolationError(
        `Requested quantity ${item.plannedQuantity} exceeds remaining quantity ` +
          `${oi.remainingQuantity} for "${oi.productName}".`,
      );
    }

    if (item.plannedQuantity > available) {
      throw new BusinessRuleViolationError(
        `Requested quantity ${item.plannedQuantity} exceeds available quantity ` +
          `${available} for "${oi.productName}".` +
          `${committed > 0 ? ` (${committed} already committed to other active deliveries)` : ''}`,
      );
    }
  }

  // 7. Ensure finished-stock balance rows exist for all affected products
  const uniqueProductIds = [...new Set(input.items.map((item) => item.productId))];
  for (const productId of uniqueProductIds) {
    await ensureBalance(productId);
  }

  // 8. Credit check for CREDIT orders
  const overridePlan = await resolveCreditOverride(
    order.customerId,
    order.paymentArrangement,
    input.creditOverrideReason,
    context.user.role,
  );

  // --- Transaction ---------------------------------------------------------

  const created = await runInTransaction(async (tx: TransactionClient) => {
    // a. Allocate delivery number
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'DELIVERY' });

    // b-c. Lock OrderItem rows and FinishedStockBalance rows (deterministic order)
    await lockOrderItems(tx, orderItemIdsInRequest);
    await lockStockBalances(tx, uniqueProductIds);

    // d. Re-validate quantities against now-locked rows
    const lockedOrderItems = await readLockedOrderItems(tx, orderItemIdsInRequest);
    const committedInTx = await sumCommittedQuantities(orderItemIdsInRequest, tx);

    const totalReservedByProduct = new Map<string, number>();

    for (const item of input.items) {
      const locked = lockedOrderItems.get(item.orderItemId);
      if (!locked) {
        throw new Error(`Order item ${item.orderItemId} not found after locking.`);
      }

      const committed = committedInTx.get(item.orderItemId) ?? 0;
      const available = locked.remainingQuantity - committed;

      if (item.plannedQuantity > locked.remainingQuantity) {
        throw new BusinessRuleViolationError(
          `Requested quantity ${item.plannedQuantity} exceeds remaining quantity ${locked.remainingQuantity}.`,
        );
      }

      if (item.plannedQuantity > available) {
        throw new BusinessRuleViolationError(
          `Requested quantity ${item.plannedQuantity} exceeds available quantity ${available}.`,
        );
      }

      totalReservedByProduct.set(
        item.productId,
        (totalReservedByProduct.get(item.productId) ?? 0) + item.plannedQuantity,
      );
    }

    // Validate stock availability for each product after locking balances
    for (const productId of uniqueProductIds) {
      const balance = await lockBalance(tx, productId);
      const totalReserved = totalReservedByProduct.get(productId) ?? 0;

      if (balance.reservedQuantity + totalReserved > balance.physicalQuantity) {
        throw new InsufficientFinishedStockError(
          `Not enough available stock for product — ` +
            `${balance.availableQuantity} pieces available, ${totalReserved} requested.`,
        );
      }
    }

    // e. Insert Delivery + DeliveryItems
    const delivery = await insertDelivery(
      {
        deliveryNumber: documentNumber,
        orderId: input.orderId,
        customerId: order.customerId,
        customerAddressId: input.customerAddressId,
        addressLabel: address.label,
        addressLine: address.addressLine,
        addressDirections: address.directions,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        vehicleOwnerId,
        payeeName,
        payeePhone,
        deliveryDate: input.deliveryDate,
        items: input.items,
        createdByUserId: context.user.id,
      },
      tx,
    );

    // f. Reserve stock for each product
    for (const productId of uniqueProductIds) {
      const totalReserved = totalReservedByProduct.get(productId) ?? 0;
      if (totalReserved > 0) {
        await finishedStockService.reserveStockForDelivery(tx, productId, totalReserved);
      }
    }

    // g. Credit override if needed
    if (overridePlan) {
      await customerCreditService.recordCreditOverride(tx, {
        customerId: order.customerId,
        relatedOrderId: null,
        relatedDeliveryId: delivery.id,
        previousCreditStatus: overridePlan.previousCreditStatus,
        reason: overridePlan.reason,
        approvedByUserId: context.user.id,
      });

      await recordAudit(tx, {
        ...toAuditContext(context),
        action: 'OVERRIDE_CUSTOMER_CREDIT',
        module: 'customer-credit',
        entityType: 'CustomerCreditOverride',
        entityId: delivery.id,
        reason: overridePlan.reason,
        updatedData: {
          previousCreditStatus: overridePlan.previousCreditStatus,
          relatedDeliveryId: delivery.id,
        },
      });
    }

    // h. Audit log
    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_DELIVERY',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: delivery.id,
      documentNumber,
      updatedData: toAuditSnapshot(delivery),
    });

    return delivery;
  });

  // After commit
  await invalidateCache();

  return toDetail(await requireDelivery(created.id));
}

/**
 * Sets transport rate and trip count on a PLANNED delivery (Phase 8B).
 *
 * Single-product deliveries auto-calculate trips from the product's
 * `maxPiecesPerTruck`. Mixed-product deliveries require a manual trip count.
 * `totalTransportCost = numberOfTrips × transportRate`, always backend-
 * calculated using Prisma.Decimal.
 *
 * The product's `maxPiecesPerTruck` is snapshotted so a later change never
 * recalculates an already-recorded delivery.
 */
export async function setTransport(
  id: string,
  input: SetTransportInput,
  context: RequestContext,
): Promise<DeliveryTransportDetail> {
  const delivery = await requireDelivery(id);

  if (delivery.status !== 'PLANNED') {
    throw new InvalidDocumentStatusError(
      `Transport can only be set on PLANNED deliveries. This delivery is ${delivery.status}.`,
    );
  }

  const transportRate = new Prisma.Decimal(input.transportRate);

  if (!transportRate.isPositive()) {
    throw new BusinessRuleViolationError('Transport rate must be greater than zero.');
  }

  const productIds = new Set(delivery.items.map((item) => item.productId));
  const uniqueProductCount = productIds.size;

  let numberOfTrips: number;
  let maxPiecesPerTruckSnapshot: number | null = null;
  let autoCalculated = false;

  if (uniqueProductCount === 1) {
    // Single-product: auto-calculate
    const totalPlanned = delivery.items.reduce((sum, item) => sum + item.plannedQuantity, 0);
    const product = delivery.items[0]!.product;

    if (!product.maxPiecesPerTruck) {
      throw new BusinessRuleViolationError(
        `"${product.name}" has no confirmed truck capacity. ` +
          'Enter the number of trips manually, or configure the maximum pieces per truck for this product.',
      );
    }

    numberOfTrips = Math.ceil(totalPlanned / product.maxPiecesPerTruck);
    maxPiecesPerTruckSnapshot = product.maxPiecesPerTruck;
    autoCalculated = true;
  } else {
    // Mixed-product: manual entry required
    if (!input.numberOfTrips) {
      throw new BusinessRuleViolationError(
        'Enter the number of trips for a mixed-product delivery.',
      );
    }

    numberOfTrips = input.numberOfTrips;
  }

  if (numberOfTrips < 1) {
    throw new BusinessRuleViolationError('Number of trips must be at least 1.');
  }

  const totalTransportCost = transportRate.mul(numberOfTrips);

  await runInTransaction(async (tx: TransactionClient) => {
    await updateTransport(tx, id, {
      transportRate,
      numberOfTrips,
      totalTransportCost,
      maxPiecesPerTruckSnapshot,
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'SET_DELIVERY_TRANSPORT',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: id,
      documentNumber: delivery.deliveryNumber,
      previousData: {
        transportRate: delivery.transportRate?.toFixed(2) ?? null,
        numberOfTrips: delivery.numberOfTrips,
        totalTransportCost: delivery.totalTransportCost?.toFixed(2) ?? null,
      },
      updatedData: {
        transportRate: transportRate.toFixed(2),
        numberOfTrips,
        totalTransportCost: totalTransportCost.toFixed(2),
        maxPiecesPerTruckSnapshot,
        autoCalculated,
      },
    });
  });

  return {
    transportRate: transportRate.toFixed(2),
    numberOfTrips,
    totalTransportCost: totalTransportCost.toFixed(2),
    maxPiecesPerTruckSnapshot,
    autoCalculated,
  };
}

/**
 * Dispatches a PLANNED delivery (Phase 8C).
 *
 * Reduces physicalQuantity and reservedQuantity atomically, writes one
 * DELIVERY_DISPATCH movement per item, and records dispatchedByUserId/
 * dispatchedAt. PREPAID orders are blocked until Phase 9 — until then,
 * the dispatch is rejected with a clear business-rule error.
 *
 * Does NOT touch OrderItem.deliveredQuantity or Order.status — that is
 * Phase 8D (DELIVERED).
 */
export async function dispatch(
  id: string,
  context: RequestContext,
): Promise<DispatchResult> {
  const delivery = await requireDelivery(id);

  if (delivery.status !== 'PLANNED') {
    throw new InvalidDocumentStatusError(
      `Only PLANNED deliveries can be dispatched. This delivery is ${delivery.status}.`,
    );
  }

  const now = new Date();

  const updated = await runInTransaction(async (tx: TransactionClient) => {
    // PREPAID payment gate (Phase 9E): require fully-paid invoice
    if (delivery.order.paymentArrangement === 'PREPAID') {
      const invoice = await tx.invoice.findUnique({
        where: { orderId: delivery.orderId },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true },
      });

      if (!invoice) {
        throw new BusinessRuleViolationError(
          'This PREPAID order has no invoice. Create an invoice before dispatching.',
        );
      }

      if (invoice.status !== 'ISSUED') {
        throw new BusinessRuleViolationError(
          `Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot be used for PREPAID dispatch.`,
        );
      }

      const approvedAgg = await tx.customerPaymentAllocation.aggregate({
        where: { invoiceId: invoice.id, payment: { status: 'APPROVED' } },
        _sum: { amount: true },
      });

      const approvedAmount = approvedAgg._sum.amount ?? new Prisma.Decimal(0);

      if (approvedAmount.lessThan(invoice.totalAmount)) {
        const shortfall = invoice.totalAmount.sub(approvedAmount).toFixed(2);
        throw new BusinessRuleViolationError(
          `PREPAID dispatch requires full payment. ` +
          `Invoice ${invoice.invoiceNumber}: KES ${invoice.totalAmount.toFixed(2)} total, ` +
          `only KES ${approvedAmount.toFixed(2)} approved. Shortfall: KES ${shortfall}.`,
        );
      }
    }
    // Lock all affected stock balances
    const productIds = [...new Set(delivery.items.map((item) => item.productId))];
    for (const productId of productIds.sort()) {
      await lockBalance(tx, productId);
    }

    // Reduce physicalQuantity and reservedQuantity, write movement per item
    for (const item of delivery.items) {
      const balance = await tx.finishedStockBalance.findUnique({
        where: { productId: item.productId },
      });
      if (!balance) {
        throw new Error(`No stock balance for product ${item.productId}.`);
      }

      const newPhysical = balance.physicalQuantity - item.plannedQuantity;
      const newReserved = balance.reservedQuantity - item.plannedQuantity;
      const newAvailable = newPhysical - newReserved;

      await setBalanceQuantities(tx, item.productId, newPhysical, newAvailable);

      await tx.finishedStockBalance.update({
        where: { productId: item.productId },
        data: { reservedQuantity: newReserved, version: { increment: 1 } },
      });

      // Set dispatchedQuantity on the delivery item for Phase 8D validation
      await tx.deliveryItem.update({
        where: { id: item.id },
        data: { dispatchedQuantity: item.plannedQuantity },
      });

      await insertMovement(tx, {
        productId: item.productId,
        movementType: 'DELIVERY_DISPATCH',
        quantity: -item.plannedQuantity,
        balanceAfter: newPhysical,
        relatedEntityId: id,
        createdByUserId: context.user.id,
      });
    }

    // Mark delivery as DISPATCHED
    const result = await dispatchDelivery(tx, id, {
      dispatchedByUserId: context.user.id,
      dispatchedAt: now,
    });

    if (!result) {
      throw new InvalidDocumentStatusError(
        'Delivery could not be dispatched — it may no longer be PLANNED.',
      );
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'DISPATCH_DELIVERY',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: id,
      documentNumber: delivery.deliveryNumber,
      updatedData: {
        status: 'DISPATCHED',
        dispatchedAt: now.toISOString(),
        itemCount: delivery.items.length,
        totalDispatched: delivery.items.reduce((s, i) => s + i.plannedQuantity, 0),
      },
    });

    return result;
  });

  await invalidateCache();

  return {
    id: updated.id,
    deliveryNumber: updated.deliveryNumber,
    status: 'DISPATCHED',
    dispatchedAt: now.toISOString(),
  };
}

/**
 * Cancels a PLANNED delivery (Phase 8E).
 *
 * Releases all reserved stock: decrements FinishedStockBalance.reservedQuantity,
 * increments availableQuantity, zeroes DeliveryItem.reservedQuantity.
 * physicalQuantity is NOT changed. Only from PLANNED.
 */
export async function cancel(
  id: string,
  input: CancelDeliveryInput,
  context: RequestContext,
): Promise<CancelDeliveryResult> {
  const delivery = await requireDelivery(id);

  if (delivery.status !== 'PLANNED') {
    throw new InvalidDocumentStatusError(
      `Only PLANNED deliveries can be cancelled. This delivery is ${delivery.status}.`,
    );
  }

  const now = new Date();
  const reason = input.reason.trim();

  await runInTransaction(async (tx: TransactionClient) => {
    // Release reserved stock per item
    const productIds = [...new Set(delivery.items.map((i) => i.productId))];
    for (const productId of productIds.sort()) {
      await lockBalance(tx, productId);

      const totalReserved = delivery.items
        .filter((i) => i.productId === productId)
        .reduce((s, i) => s + i.plannedQuantity, 0);

      if (totalReserved > 0) {
        await tx.finishedStockBalance.update({
          where: { productId },
          data: {
            reservedQuantity: { decrement: totalReserved },
            availableQuantity: { increment: totalReserved },
            version: { increment: 1 },
          },
        });
      }
    }

    const result = await cancelDelivery(tx, id, {
      cancelledReason: reason,
      cancelledByUserId: context.user.id,
      cancelledAt: now,
    });

    if (!result) {
      throw new InvalidDocumentStatusError(
        'Delivery could not be cancelled — it may no longer be PLANNED.',
      );
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CANCEL_DELIVERY',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: id,
      documentNumber: delivery.deliveryNumber,
      reason,
      previousData: { status: 'PLANNED' },
      updatedData: {
        status: 'CANCELLED',
        cancelledReason: reason,
        cancelledAt: now.toISOString(),
        releasedQuantity: delivery.items.reduce((s, i) => s + i.plannedQuantity, 0),
        itemCount: delivery.items.length,
      },
    });
  });

  await invalidateCache();

  return {
    id: delivery.id,
    deliveryNumber: delivery.deliveryNumber,
    status: 'CANCELLED',
    cancelledAt: now.toISOString(),
    reason,
  };
}

/**
 * Corrects dispatch quantities on a DISPATCHED delivery (Phase 8F).
 *
 * Adjusts physical stock and writes CORRECTION movements for any delta.
 * Never used for ordinary delivery breakage (that is Phase 8D).
 */
export async function correct(
  id: string,
  input: CorrectDeliveryInput,
  context: RequestContext,
): Promise<CorrectDeliveryResult> {
  const delivery = await requireDelivery(id);

  if (delivery.status !== 'DISPATCHED') {
    throw new InvalidDocumentStatusError(
      `Only DISPATCHED deliveries can be corrected. This delivery is ${delivery.status}.`,
    );
  }

  const reason = input.reason.trim();
  const itemMap = new Map(delivery.items.map((di) => [di.orderItemId, di]));
  const corrections: { orderItemId: string; previousDispatched: number; newDispatched: number }[] = [];

  // Validate all items belong to this delivery
  for (const inputItem of input.items) {
    const di = itemMap.get(inputItem.orderItemId);
    if (!di) {
      throw new BusinessRuleViolationError(
        `Order item ${inputItem.orderItemId} is not part of this delivery.`,
      );
    }
    corrections.push({
      orderItemId: inputItem.orderItemId,
      previousDispatched: di.dispatchedQuantity,
      newDispatched: inputItem.dispatchedQuantity,
    });
  }

  await runInTransaction(async (tx: TransactionClient) => {
    // Lock affected stock balances
    const productIds = [...new Set(delivery.items.map((i) => i.productId))];
    for (const pid of productIds.sort()) {
      await lockBalance(tx, pid);
    }

    for (const corr of corrections) {
      const di = itemMap.get(corr.orderItemId)!;
      const delta = corr.previousDispatched - corr.newDispatched; // positive = returning stock

      if (delta !== 0) {
        const balance = await tx.finishedStockBalance.findUnique({
          where: { productId: di.productId },
        });
        if (!balance) throw new Error(`No stock balance for product ${di.productId}.`);

        const newPhysical = balance.physicalQuantity + delta;
        if (newPhysical < 0) {
          throw new InsufficientFinishedStockError(
            `Correction would make stock negative for this product.`,
          );
        }
        const newAvailable = newPhysical - balance.reservedQuantity;

        await setBalanceQuantities(tx, di.productId, newPhysical, newAvailable);

        await insertMovement(tx, {
          productId: di.productId,
          movementType: 'CORRECTION',
          quantity: delta,
          balanceAfter: newPhysical,
          relatedEntityId: id,
          reason,
          createdByUserId: context.user.id,
        });
      }
    }

    await correctDeliveryItems(
      tx,
      id,
      corrections.map((c) => ({ orderItemId: c.orderItemId, dispatchedQuantity: c.newDispatched })),
    );

    await setCorrectionReason(tx, id, reason);

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CORRECT_DELIVERY',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: id,
      documentNumber: delivery.deliveryNumber,
      reason,
      previousData: { items: corrections.map((c) => ({ orderItemId: c.orderItemId, dispatchedQuantity: c.previousDispatched })) },
      updatedData: { items: corrections.map((c) => ({ orderItemId: c.orderItemId, dispatchedQuantity: c.newDispatched })) },
    });
  });

  await invalidateCache();

  return {
    id: delivery.id,
    deliveryNumber: delivery.deliveryNumber,
    status: 'DISPATCHED',
    correctedAt: new Date().toISOString(),
    reason,
    items: corrections,
  };
}

/**
 * Completes a DISPATCHED delivery (Phase 8D).
 *
 * Records actual delivered and broken quantities per item. Broken quantity
 * feeds a BrokenProductRecord (stage: DELIVERY). Updates OrderItem
 * deliveredQuantity/remainingQuantity and recalculates Order status.
 *
 * Finished stock is unchanged — it was already reduced at dispatch.
 * Single transaction for all changes.
 */
export async function complete(
  id: string,
  input: CompleteDeliveryInput,
  context: RequestContext,
): Promise<CompleteDeliveryResult> {
  const delivery = await requireDelivery(id);

  if (delivery.status !== 'DISPATCHED') {
    throw new InvalidDocumentStatusError(
      `Only DISPATCHED deliveries can be completed. This delivery is ${delivery.status}.`,
    );
  }

  // Build a map of delivery items by orderItemId for validation
  const itemMap = new Map(delivery.items.map((di) => [di.orderItemId, di]));

  // Validate every input item belongs to this delivery
  for (const inputItem of input.items) {
    const deliveryItem = itemMap.get(inputItem.orderItemId);
    if (!deliveryItem) {
      throw new BusinessRuleViolationError(
        `Order item ${inputItem.orderItemId} is not part of this delivery.`,
      );
    }

    const total = inputItem.deliveredQuantity + inputItem.brokenQuantity;
    if (total !== deliveryItem.dispatchedQuantity) {
      throw new BusinessRuleViolationError(
        `Delivered (${inputItem.deliveredQuantity}) + broken (${inputItem.brokenQuantity}) ` +
          `must equal dispatched quantity (${deliveryItem.dispatchedQuantity}).`,
      );
    }
  }

  const now = new Date();

  const result = await runInTransaction(async (tx: TransactionClient) => {
    // Update each delivery item
    for (const inputItem of input.items) {
      const deliveryItem = itemMap.get(inputItem.orderItemId)!;

      await tx.deliveryItem.update({
        where: { id: deliveryItem.id },
        data: {
          deliveredQuantity: inputItem.deliveredQuantity,
          brokenQuantity: inputItem.brokenQuantity,
        },
      });

      // Credit the actually-delivered quantity to the order item
      if (inputItem.deliveredQuantity > 0) {
        await ordersService.incrementDeliveredQuantity(
          tx,
          inputItem.orderItemId,
          inputItem.deliveredQuantity,
        );
      }

      // Record broken products (stage: DELIVERY)
      if (inputItem.brokenQuantity > 0) {
        await brokenProductsService.recordBrokenProductInTransaction(
          tx,
          {
            productId: deliveryItem.productId,
            quantity: inputItem.brokenQuantity,
            stage: 'DELIVERY',
            relatedEntityId: id,
          },
          context.user.id,
        );
      }
    }

    // Mark delivery as DELIVERED
    const updated = await tx.delivery.update({
      where: { id, status: 'DISPATCHED' },
      data: { status: 'DELIVERED', completedAt: now },
    });

    if (!updated) {
      throw new InvalidDocumentStatusError(
        'Delivery could not be completed — it may no longer be DISPATCHED.',
      );
    }

    // Recalculate Order status
    await ordersService.recalculateOrderStatus(tx, delivery.orderId);

    // Read the new order status for the response
    const order = await tx.order.findUnique({
      where: { id: delivery.orderId },
      select: { status: true },
    });

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'COMPLETE_DELIVERY',
      module: AUDIT_MODULE,
      entityType: 'Delivery',
      entityId: id,
      documentNumber: delivery.deliveryNumber,
      updatedData: {
        status: 'DELIVERED',
        completedAt: now.toISOString(),
        items: input.items.map((i) => ({
          orderItemId: i.orderItemId,
          deliveredQuantity: i.deliveredQuantity,
          brokenQuantity: i.brokenQuantity,
        })),
      },
    });

    return { updated, orderStatus: order!.status };
  });

  await invalidateCache();

  return {
    id: result.updated.id,
    deliveryNumber: result.updated.deliveryNumber,
    status: 'DELIVERED',
    completedAt: now.toISOString(),
    orderStatus: result.orderStatus,
  };
}

// --- Customer deactivation helpers (called by customers.service) ------------

export { hasActiveDeliveriesForCustomer, getReservedStockProductIdsForCustomer };

// --- Helpers ----------------------------------------------------------------

async function requireDelivery(id: string): Promise<DeliveryDetailRow> {
  const delivery = await findDeliveryById(id);

  if (!delivery) {
    throw new ResourceNotFoundError('That delivery was not found.');
  }

  return delivery;
}

/**
 * Credit check for CREDIT orders using `computeCreditStatus` (current
 * balance only), not `computeProjectedExposure` — the order was already
 * checked at its own creation.
 */
async function resolveCreditOverride(
  customerId: string,
  paymentArrangement: OrderPaymentArrangement,
  creditOverrideReason: string | undefined,
  role: GreenstoneRole,
): Promise<OverridePlan | null> {
  if (paymentArrangement !== 'CREDIT') {
    return null;
  }

  const creditStatus = await customerCreditService.computeCreditStatus(customerId);

  if (creditStatus.creditStatus !== 'BLOCKED') {
    return null;
  }

  if (!creditOverrideReason) {
    throw new CustomerCreditBlockedError();
  }

  const allowed = await hasPermission(role, 'customer-credit', 'override');

  if (!allowed) {
    throw new PermissionDeniedError();
  }

  return { previousCreditStatus: creditStatus.creditStatus, reason: creditOverrideReason };
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListDeliveriesFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `st=${filters.status ?? ''}`,
    `c=${filters.customerId ?? ''}`,
    `o=${filters.orderId ?? ''}`,
    `sb=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: DeliveryRow): DeliverySummary {
  return {
    id: row.id,
    deliveryNumber: row.deliveryNumber,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    addressLabel: row.addressLabel,
    driverId: row.driverId,
    driverName: row.driver.name,
    vehicleId: row.vehicleId,
    vehicleRegistrationNumber: row.vehicle.registrationNumber,
    vehicleOwnerId: row.vehicleOwnerId,
    payeeName: row.payeeName,
    deliveryDate: row.deliveryDate.toISOString(),
    status: row.status,
    itemCount: row._count.items,
    totalPlannedQuantity: 0, // computed from items in detail query, not needed in list
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: DeliveryDetailRow): DeliveryDetail {
  return {
    id: row.id,
    deliveryNumber: row.deliveryNumber,
    orderId: row.orderId,
    orderNumber: row.order.orderNumber,
    customerId: row.customerId,
    customerName: row.customer.name,
    customerAddressId: row.customerAddressId,
    addressLabel: row.addressLabel,
    addressLine: row.addressLine,
    addressDirections: row.addressDirections,
    driverId: row.driverId,
    driverName: row.driver.name,
    vehicleId: row.vehicleId,
    vehicleRegistrationNumber: row.vehicle.registrationNumber,
    vehicleOwnerId: row.vehicleOwnerId,
    payeeName: row.payeeName,
    payeePhone: row.payeePhone,
    deliveryDate: row.deliveryDate.toISOString(),
    status: row.status,
    transportRate: row.transportRate ? row.transportRate.toFixed(2) : null,
    numberOfTrips: row.numberOfTrips,
    totalTransportCost: row.totalTransportCost ? row.totalTransportCost.toFixed(2) : null,
    maxPiecesPerTruckSnapshot: row.maxPiecesPerTruckSnapshot,
    cancelledReason: row.cancelledReason,
    dispatchedByUserId: row.dispatchedByUserId,
    dispatchedAt: row.dispatchedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    correctionReason: row.correctionReason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      orderItemId: item.orderItemId,
      productId: item.productId,
      productName: item.product.name,
      plannedQuantity: item.plannedQuantity,
      reservedQuantity: item.reservedQuantity,
      dispatchedQuantity: item.dispatchedQuantity,
      deliveredQuantity: item.deliveredQuantity,
      brokenQuantity: item.brokenQuantity,
    })),
  };
}

function toAuditSnapshot(row: DeliveryDetailRow): Record<string, unknown> {
  return {
    deliveryNumber: row.deliveryNumber,
    orderId: row.orderId,
    customerId: row.customerId,
    driverId: row.driverId,
    vehicleId: row.vehicleId,
    vehicleOwnerId: row.vehicleOwnerId,
    deliveryDate: row.deliveryDate.toISOString(),
    status: row.status,
    itemCount: row.items.length,
    totalPlannedQuantity: row.items.reduce((sum, i) => sum + i.plannedQuantity, 0),
  };
}
