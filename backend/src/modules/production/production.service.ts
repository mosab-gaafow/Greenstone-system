import { Prisma, type CuringDuration } from '../../generated/prisma/client.js';
import {
  findProductionBatchById,
  findProductionBatches,
  findProductionItemForRelease,
  insertCuringRecord,
  insertProductionBatch,
  insertProductionOrderAllocations,
  markBatchCompleted as markBatchCompletedRow,
  type ProductionBatchDetailRow,
  type ProductionBatchRow,
} from './production.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import * as productsService from '../products/products.service.js';
import * as ordersService from '../orders/orders.service.js';
import * as rawMaterialsService from '../raw-materials/raw-materials.service.js';
import * as brokenProductsService from '../broken-products/broken-products.service.js';
import type {
  CreateProductionInput,
  ListProductionFilters,
  ListProductionResult,
  ProductionDetail,
  ProductionItemForRelease,
  ProductionSummary,
} from './production.types.js';

/**
 * Production business logic. See business-blueprint section 2.7 and
 * docs/implementation-plan.md Phase 6B.
 *
 * Creation is one transaction: allocate the yearly number, create the batch
 * and its items, start curing for every item, credit the order (when this
 * batch is for one), record raw-material usage against the Phase 6A ledger,
 * and record any production-stage breakage — all or nothing.
 *
 * `allocatedQuantity`/`excessQuantity` computed here are the **planned**
 * split against the order. The split actually credited to finished stock is
 * computed at curing release (`curing.service.ts`), because further
 * breakage may occur during curing.
 */

const AUDIT_MODULE = 'production';
const CACHE_MODULE = 'production';
const LIST_TTL_SECONDS = 300;

const CURING_DURATION_DAYS: Record<CuringDuration, number> = {
  TWO_DAYS: 2,
  THREE_DAYS: 3,
};

export async function listProduction(
  filters: ListProductionFilters,
): Promise<ListProductionResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findProductionBatches(filters);
    return { batches: rows.map(toSummary), totalRecords: total };
  });
}

export async function getProduction(id: string): Promise<ProductionDetail> {
  return toDetail(await requireProductionBatch(id));
}

export async function createProduction(
  input: CreateProductionInput,
  context: RequestContext,
): Promise<ProductionDetail> {
  if (input.purpose === 'ORDER' && !input.orderId) {
    throw new BusinessRuleViolationError('Select the order this production is for.');
  }
  if (input.purpose === 'GENERAL_STOCK' && input.orderId) {
    throw new BusinessRuleViolationError('General-stock production must not reference an order.');
  }
  if (input.items.length === 0) {
    throw new BusinessRuleViolationError('A production run must contain at least one item.');
  }

  const order = input.orderId ? await ordersService.getOrder(input.orderId) : undefined;

  if (order && (order.status === 'CANCELLED' || order.status === 'COMPLETED')) {
    throw new BusinessRuleViolationError(
      `Order ${order.orderNumber} is ${order.status.toLowerCase()} and cannot receive new production.`,
    );
  }

  const resolvedItems = await Promise.all(input.items.map((item) => resolveItem(item, order)));
  const resolvedUsages = await Promise.all(input.rawMaterialUsages.map(resolveUsage));

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'PRODUCTION' });

    const batch = await insertProductionBatch(
      {
        productionNumber: documentNumber,
        productionDate: input.productionDate,
        purpose: input.purpose,
        orderId: input.orderId ?? null,
        createdByUserId: context.user.id,
        items: resolvedItems.map((resolved) => ({
          productId: resolved.input.productId,
          pallets: resolved.input.pallets,
          producedQuantity: resolved.producedQuantity,
          brokenQuantity: resolved.input.brokenQuantity,
          usableQuantity: resolved.usableQuantity,
          allocatedQuantity: resolved.allocatedQuantity,
          excessQuantity: resolved.excessQuantity,
        })),
        rawMaterialUsages: resolvedUsages.map((resolved) => ({
          rawMaterialId: resolved.rawMaterial.id,
          measurementUnitId: resolved.rawMaterial.measurementUnitId,
          quantity: resolved.quantity,
        })),
      },
      tx,
    );

    const allocations: { productionItemId: string; orderItemId: string; quantity: number }[] = [];

    // `batch.items` and `resolvedItems` were both built from `input.items`,
    // in the same order.
    for (const [index, batchItem] of batch.items.entries()) {
      const resolved = resolvedItems[index];
      if (!resolved) {
        continue;
      }

      const startedAt = new Date();
      const plannedCompletion = addDays(
        startedAt,
        CURING_DURATION_DAYS[resolved.input.curingDuration],
      );

      await insertCuringRecord(tx, {
        productionItemId: batchItem.id,
        productionBatchId: batch.id,
        quantityEntering: resolved.usableQuantity,
        duration: resolved.input.curingDuration,
        startedAt,
        plannedCompletion,
        createdByUserId: context.user.id,
      });

      if (resolved.orderItemId && resolved.allocatedQuantity > 0) {
        allocations.push({
          productionItemId: batchItem.id,
          orderItemId: resolved.orderItemId,
          quantity: resolved.allocatedQuantity,
        });
        await ordersService.incrementProducedQuantity(
          tx,
          resolved.orderItemId,
          resolved.allocatedQuantity,
        );
      }

      if (resolved.input.brokenQuantity > 0) {
        await brokenProductsService.recordBrokenProductInTransaction(
          tx,
          {
            productId: resolved.input.productId,
            quantity: resolved.input.brokenQuantity,
            stage: 'PRODUCTION',
            relatedEntityId: batchItem.id,
          },
          context.user.id,
        );
      }
    }

    await insertProductionOrderAllocations(tx, allocations);

    for (const resolved of resolvedUsages) {
      await rawMaterialsService.recordProductionUsage(
        tx,
        resolved.rawMaterial.id,
        resolved.quantity,
        batch.id,
        context,
      );
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_PRODUCTION_BATCH',
      module: AUDIT_MODULE,
      entityType: 'ProductionBatch',
      entityId: batch.id,
      documentNumber,
      updatedData: toAuditSnapshot(batch),
    });

    return batch;
  });

  await invalidateCache();

  return toDetail(await requireProductionBatch(created.id));
}

/**
 * What `curing.service.ts` needs to determine the order/excess split at
 * release time.
 */
export async function getProductionItemForRelease(
  productionItemId: string,
): Promise<ProductionItemForRelease> {
  const item = await findProductionItemForRelease(productionItemId);

  if (!item) {
    throw new ResourceNotFoundError('That production item was not found.');
  }

  return {
    id: item.id,
    productId: item.productId,
    productionBatchId: item.productionBatchId,
    allocatedQuantity: item.allocatedQuantity,
    allocations: item.allocations.map((allocation) => ({
      id: allocation.id,
      orderItemId: allocation.orderItemId,
      quantity: allocation.quantity,
    })),
  };
}

/**
 * Used by `curing.service.ts` once every item's curing has been released.
 */
export async function markBatchCompleted(
  tx: TransactionClient,
  productionBatchId: string,
): Promise<void> {
  await markBatchCompletedRow(tx, productionBatchId);
}

// --- Helpers ----------------------------------------------------------------

async function resolveItem(
  item: CreateProductionInput['items'][number],
  order: Awaited<ReturnType<typeof ordersService.getOrder>> | undefined,
): Promise<{
  input: CreateProductionInput['items'][number];
  producedQuantity: number;
  usableQuantity: number;
  allocatedQuantity: number;
  excessQuantity: number;
  orderItemId: string | undefined;
}> {
  const product = await productsService.getProduct(item.productId);

  if (!product.isActive) {
    throw new BusinessRuleViolationError(`"${product.name}" is inactive and cannot be produced.`);
  }
  if (item.pallets <= 0) {
    throw new BusinessRuleViolationError('Pallets must be greater than zero.');
  }
  if (item.brokenQuantity < 0) {
    throw new BusinessRuleViolationError('Broken quantity cannot be negative.');
  }
  if (product.piecesPerPallet === null) {
    throw new BusinessRuleViolationError(
      `"${product.name}" has no confirmed pieces-per-pallet value and cannot be produced yet.`,
    );
  }

  const producedQuantity = item.pallets * product.piecesPerPallet;

  if (item.brokenQuantity > producedQuantity) {
    throw new BusinessRuleViolationError('Broken quantity cannot exceed produced quantity.');
  }

  const usableQuantity = producedQuantity - item.brokenQuantity;

  let allocatedQuantity = 0;
  let orderItemId: string | undefined;

  if (order) {
    const orderItem = order.items.find((candidate) => candidate.productId === item.productId);

    if (!orderItem) {
      throw new BusinessRuleViolationError(
        `"${product.name}" is not on order ${order.orderNumber}.`,
      );
    }

    const stillNeeded = Math.max(0, orderItem.quantity - orderItem.producedQuantity);
    allocatedQuantity = Math.min(usableQuantity, stillNeeded);
    orderItemId = orderItem.id;
  }

  const excessQuantity = usableQuantity - allocatedQuantity;

  return { input: item, producedQuantity, usableQuantity, allocatedQuantity, excessQuantity, orderItemId };
}

async function resolveUsage(
  usage: CreateProductionInput['rawMaterialUsages'][number],
): Promise<{ rawMaterial: Awaited<ReturnType<typeof rawMaterialsService.getRawMaterial>>; quantity: Prisma.Decimal }> {
  const rawMaterial = await rawMaterialsService.getRawMaterial(usage.rawMaterialId);

  if (!rawMaterial.isActive) {
    throw new BusinessRuleViolationError(`"${rawMaterial.name}" is inactive and cannot be used.`);
  }

  const quantity = new Prisma.Decimal(usage.quantity);

  if (!quantity.isPositive()) {
    throw new BusinessRuleViolationError('Enter a raw-material quantity greater than zero.');
  }

  return { rawMaterial, quantity };
}

async function requireProductionBatch(id: string): Promise<ProductionBatchDetailRow> {
  const batch = await findProductionBatchById(id);

  if (!batch) {
    throw new ResourceNotFoundError('That production batch was not found.');
  }

  return batch;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListProductionFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `pu=${filters.purpose ?? ''}`,
    `o=${filters.orderId ?? ''}`,
    `st=${filters.status ?? ''}`,
    `so=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: ProductionBatchRow): ProductionSummary {
  return {
    id: row.id,
    productionNumber: row.productionNumber,
    productionDate: row.productionDate.toISOString(),
    purpose: row.purpose,
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? null,
    status: row.status,
    itemCount: row._count.items,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: ProductionBatchDetailRow): ProductionDetail {
  return {
    id: row.id,
    productionNumber: row.productionNumber,
    productionDate: row.productionDate.toISOString(),
    purpose: row.purpose,
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? null,
    status: row.status,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product.name,
      pallets: item.pallets,
      producedQuantity: item.producedQuantity,
      brokenQuantity: item.brokenQuantity,
      usableQuantity: item.usableQuantity,
      allocatedQuantity: item.allocatedQuantity,
      excessQuantity: item.excessQuantity,
      curingRecordId: item.curingRecord?.id ?? null,
    })),
    rawMaterialUsages: row.rawMaterialUsages.map((usage) => ({
      id: usage.id,
      rawMaterialId: usage.rawMaterialId,
      rawMaterialName: usage.rawMaterial.name,
      measurementUnitSymbol: usage.rawMaterial.measurementUnit.symbol,
      quantity: usage.quantity.toFixed(3),
    })),
  };
}

function toAuditSnapshot(row: ProductionBatchDetailRow): Record<string, unknown> {
  return {
    productionNumber: row.productionNumber,
    purpose: row.purpose,
    orderId: row.orderId,
    itemCount: row.items.length,
  };
}
