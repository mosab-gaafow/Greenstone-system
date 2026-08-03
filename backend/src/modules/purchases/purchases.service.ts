import { Prisma } from '../../generated/prisma/client.js';
import {
  findPurchaseById,
  findPurchases,
  insertPurchase,
  type PurchaseDetailRow,
  type PurchaseItemRow,
  type PurchaseRow,
} from './purchases.repository.js';
import { recordAudit } from '../../shared/audit/audit.service.js';
import { runInTransaction, type TransactionClient } from '../../shared/database/transaction.js';
import { cache } from '../../shared/cache/cache.service.js';
import { buildCacheKey, buildCacheKeyPrefix } from '../../shared/cache/cache-keys.js';
import { allocateNumberInTransaction } from '../../shared/numbering/numbering.service.js';
import { toAuditContext, type RequestContext } from '../../shared/auth/auth-context.js';
import { BusinessRuleViolationError, ResourceNotFoundError } from '../../shared/errors/app-error.js';
import { normalizeForComparison } from '../../shared/utils/normalize.js';
import * as suppliersService from '../suppliers/suppliers.service.js';
import * as rawMaterialsService from '../raw-materials/raw-materials.service.js';
import type {
  CreatePurchaseInput,
  ListPurchasesFilters,
  ListPurchasesResult,
  PurchaseDetail,
  PurchaseItemInput,
  PurchaseItemSummary,
  PurchaseSummary,
} from './purchases.types.js';

/**
 * Purchase business logic. See business-blueprint section 2.16 and
 * docs/implementation-plan.md Phase 7C.
 *
 * Creating a purchase is receiving it — one transaction: allocate the
 * yearly `PUR-YYYY-####` number, create the purchase and its items, credit
 * the Phase 6A raw-material ledger with a `PURCHASE_RECEIPT` movement per
 * item, and write the audit log. There is no separate "mark as received"
 * step — the approved `purchase` permission (create, read only) has no
 * action for one. **No update or delete route**: a purchase, once recorded,
 * is never edited, the same shape `ProductionBatch` already established.
 */

const AUDIT_MODULE = 'purchases';
const CACHE_MODULE = 'purchases';
const LIST_TTL_SECONDS = 300;

/** Pumice is identified by name, the same way `production.service.ts` special-cases a product. */
const PUMICE_NAME_NORMALIZED = normalizeForComparison('Pumice');

export async function listPurchases(filters: ListPurchasesFilters): Promise<ListPurchasesResult> {
  const key = buildCacheKey({
    module: CACHE_MODULE,
    resource: 'list',
    identifier: buildListIdentifier(filters),
  });

  return cache.getOrSet(key, LIST_TTL_SECONDS, async () => {
    const { rows, total } = await findPurchases(filters);
    return { purchases: rows.map(toSummary), totalRecords: total };
  });
}

export async function getPurchase(id: string): Promise<PurchaseDetail> {
  return toDetail(await requirePurchase(id));
}

export async function createPurchase(
  input: CreatePurchaseInput,
  context: RequestContext,
): Promise<PurchaseDetail> {
  if (input.items.length === 0) {
    throw new BusinessRuleViolationError('A purchase must contain at least one item.');
  }

  const supplier = await suppliersService.getSupplier(input.supplierId);
  if (!supplier.isActive) {
    throw new BusinessRuleViolationError(
      `"${supplier.name}" is inactive and cannot receive a purchase.`,
    );
  }

  const resolvedItems = await Promise.all(input.items.map((item) => resolveItem(item)));

  const created = await runInTransaction(async (tx: TransactionClient) => {
    const { documentNumber } = await allocateNumberInTransaction(tx, { documentType: 'PURCHASE' });

    const totalCost = resolvedItems.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const purchase = await insertPurchase(
      {
        purchaseNumber: documentNumber,
        supplierId: input.supplierId,
        purchaseDate: input.purchaseDate,
        reference: input.reference ?? null,
        totalCost,
        createdByUserId: context.user.id,
        items: resolvedItems.map((item) => ({
          rawMaterialId: item.rawMaterialId,
          measurementUnitId: item.measurementUnitId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          lineTotal: item.lineTotal,
          lengthMetres: item.lengthMetres ?? null,
          widthMetres: item.widthMetres ?? null,
          heightMetres: item.heightMetres ?? null,
          numberOfLoads: item.numberOfLoads ?? null,
        })),
      },
      tx,
    );

    for (const item of resolvedItems) {
      await rawMaterialsService.recordPurchaseReceipt(
        tx,
        item.rawMaterialId,
        item.quantity,
        purchase.id,
        context,
      );
    }

    await recordAudit(tx, {
      ...toAuditContext(context),
      action: 'CREATE_PURCHASE',
      module: AUDIT_MODULE,
      entityType: 'Purchase',
      entityId: purchase.id,
      documentNumber,
      updatedData: toAuditSnapshot(purchase),
    });

    return purchase;
  });

  await invalidateCache();

  return toDetail(await requirePurchase(created.id));
}

// --- Helpers ----------------------------------------------------------------

async function requirePurchase(id: string): Promise<PurchaseDetailRow> {
  const purchase = await findPurchaseById(id);

  if (!purchase) {
    throw new ResourceNotFoundError('That purchase was not found.');
  }

  return purchase;
}

interface ResolvedPurchaseItem {
  rawMaterialId: string;
  measurementUnitId: string;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  lengthMetres?: Prisma.Decimal;
  widthMetres?: Prisma.Decimal;
  heightMetres?: Prisma.Decimal;
  numberOfLoads?: number;
}

async function resolveItem(item: PurchaseItemInput): Promise<ResolvedPurchaseItem> {
  const rawMaterial = await rawMaterialsService.getRawMaterial(item.rawMaterialId);

  if (!rawMaterial.isActive) {
    throw new BusinessRuleViolationError(
      `"${rawMaterial.name}" is inactive and cannot be purchased.`,
    );
  }

  const isPumice = normalizeForComparison(rawMaterial.name) === PUMICE_NAME_NORMALIZED;

  if (isPumice) {
    return resolvePumiceItem(item, rawMaterial.id, rawMaterial.measurementUnitId, rawMaterial.name);
  }

  return resolveGenericItem(item, rawMaterial.id, rawMaterial.measurementUnitId, rawMaterial.name);
}

/**
 * The generic quantity × unit-cost shape used by Cement, Dust, and every
 * other raw material. See business-blueprint section 2.16.
 */
function resolveGenericItem(
  item: PurchaseItemInput,
  rawMaterialId: string,
  measurementUnitId: string,
  rawMaterialName: string,
): ResolvedPurchaseItem {
  if (
    item.lengthMetres ||
    item.widthMetres ||
    item.heightMetres ||
    item.numberOfLoads ||
    item.ratePerCubicMetre
  ) {
    throw new BusinessRuleViolationError(
      `"${rawMaterialName}" is not costed by volume — remove the length, width, height, number of loads, and rate fields.`,
    );
  }
  if (!item.quantity) {
    throw new BusinessRuleViolationError(`Enter the quantity purchased for "${rawMaterialName}".`);
  }
  if (!item.unitCost) {
    throw new BusinessRuleViolationError(`Enter the unit cost for "${rawMaterialName}".`);
  }

  const quantity = new Prisma.Decimal(item.quantity);
  const unitCost = new Prisma.Decimal(item.unitCost);

  if (!quantity.isPositive()) {
    throw new BusinessRuleViolationError('Quantity must be greater than zero.');
  }
  if (unitCost.isNegative()) {
    throw new BusinessRuleViolationError('Unit cost cannot be negative.');
  }

  return {
    rawMaterialId,
    measurementUnitId,
    quantity,
    unitCost,
    lineTotal: quantity.mul(unitCost),
  };
}

/**
 * Pumice's cubic-metre calculation (business-blueprint section 2.16):
 *
 * `volumePerLoad = length × width × height`
 * `totalVolume = volumePerLoad × numberOfLoads`
 * `totalCost = totalVolume × ratePerCubicMetre`
 *
 * `totalVolume` becomes the generic `quantity`, `ratePerCubicMetre` becomes
 * the generic `unitCost` — see the module doc comment in purchases.types.ts.
 */
function resolvePumiceItem(
  item: PurchaseItemInput,
  rawMaterialId: string,
  measurementUnitId: string,
  rawMaterialName: string,
): ResolvedPurchaseItem {
  if (item.quantity || item.unitCost) {
    throw new BusinessRuleViolationError(
      `"${rawMaterialName}" is costed by volume — enter length, width, height, number of loads, and rate per cubic metre instead of quantity and unit cost.`,
    );
  }
  if (
    !item.lengthMetres ||
    !item.widthMetres ||
    !item.heightMetres ||
    !item.numberOfLoads ||
    !item.ratePerCubicMetre
  ) {
    throw new BusinessRuleViolationError(
      `Enter length, width, height, number of loads, and rate per cubic metre for "${rawMaterialName}".`,
    );
  }

  const length = new Prisma.Decimal(item.lengthMetres);
  const width = new Prisma.Decimal(item.widthMetres);
  const height = new Prisma.Decimal(item.heightMetres);
  const numberOfLoads = item.numberOfLoads;
  const ratePerCubicMetre = new Prisma.Decimal(item.ratePerCubicMetre);

  if (!length.isPositive() || !width.isPositive() || !height.isPositive()) {
    throw new BusinessRuleViolationError('Length, width, and height must be greater than zero.');
  }
  if (numberOfLoads <= 0) {
    throw new BusinessRuleViolationError('Number of loads must be greater than zero.');
  }
  if (ratePerCubicMetre.isNegative()) {
    throw new BusinessRuleViolationError('Rate per cubic metre cannot be negative.');
  }

  const volumePerLoad = length.mul(width).mul(height);
  const totalVolume = volumePerLoad.mul(numberOfLoads);
  const totalCost = totalVolume.mul(ratePerCubicMetre);

  return {
    rawMaterialId,
    measurementUnitId,
    quantity: totalVolume,
    unitCost: ratePerCubicMetre,
    lineTotal: totalCost,
    lengthMetres: length,
    widthMetres: width,
    heightMetres: height,
    numberOfLoads,
  };
}

async function invalidateCache(): Promise<void> {
  await cache.delByPrefix(buildCacheKeyPrefix(CACHE_MODULE));
}

function buildListIdentifier(filters: ListPurchasesFilters): string {
  return [
    `p=${String(filters.page)}`,
    `s=${String(filters.pageSize)}`,
    `q=${filters.search ?? ''}`,
    `sup=${filters.supplierId ?? ''}`,
    `rm=${filters.rawMaterialId ?? ''}`,
    `o=${filters.sortBy}.${filters.sortDirection}`,
  ].join('&');
}

function toSummary(row: PurchaseRow): PurchaseSummary {
  return {
    id: row.id,
    purchaseNumber: row.purchaseNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    purchaseDate: row.purchaseDate.toISOString(),
    reference: row.reference,
    totalCost: row.totalCost.toFixed(2),
    itemCount: row._count.items,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: PurchaseDetailRow): PurchaseDetail {
  return {
    id: row.id,
    purchaseNumber: row.purchaseNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier.name,
    purchaseDate: row.purchaseDate.toISOString(),
    reference: row.reference,
    totalCost: row.totalCost.toFixed(2),
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    items: row.items.map(toItemSummary),
  };
}

function toItemSummary(item: PurchaseItemRow): PurchaseItemSummary {
  return {
    id: item.id,
    rawMaterialId: item.rawMaterialId,
    rawMaterialName: item.rawMaterial.name,
    measurementUnitId: item.measurementUnitId,
    measurementUnitName: item.measurementUnit.name,
    measurementUnitSymbol: item.measurementUnit.symbol,
    quantity: item.quantity.toFixed(3),
    unitCost: item.unitCost.toFixed(2),
    lineTotal: item.lineTotal.toFixed(2),
    lengthMetres: item.lengthMetres ? item.lengthMetres.toFixed(3) : null,
    widthMetres: item.widthMetres ? item.widthMetres.toFixed(3) : null,
    heightMetres: item.heightMetres ? item.heightMetres.toFixed(3) : null,
    numberOfLoads: item.numberOfLoads,
  };
}

function toAuditSnapshot(row: PurchaseDetailRow): Record<string, unknown> {
  return {
    purchaseNumber: row.purchaseNumber,
    supplierId: row.supplierId,
    purchaseDate: row.purchaseDate.toISOString(),
    reference: row.reference,
    totalCost: row.totalCost.toFixed(2),
  };
}
