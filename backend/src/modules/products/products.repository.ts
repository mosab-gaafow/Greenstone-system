import type { Prisma, Product } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';
import type {
  CreateProductInput,
  ListProductsFilters,
  UpdateProductInput,
} from './products.types.js';

/**
 * Product database access.
 *
 * Queries only. No business decisions, no HTTP, no permission checks.
 */

export type ProductRow = Product;

function buildWhere(filters: ListProductsFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (filters.search) {
    where.OR = [{ name: { contains: filters.search } }, { size: { contains: filters.search } }];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  return where;
}

export async function findProducts(
  filters: ListProductsFilters,
  client: DbClient = getPrisma(),
): Promise<{ rows: ProductRow[]; total: number }> {
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    client.product.findMany({
      where,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      orderBy: { [filters.sortBy]: filters.sortDirection },
    }),
    client.product.count({ where }),
  ]);

  return { rows, total };
}

export async function findProductById(
  id: string,
  client: DbClient = getPrisma(),
): Promise<ProductRow | null> {
  return client.product.findUnique({ where: { id } });
}

/**
 * Finds a product by name, case-insensitively.
 *
 * The column collation is `utf8mb4_unicode_ci`, so MySQL already compares
 * without regard to case. This is what makes the duplicate-name check catch
 * "Hollow Blocks 6 x 9" against "hollow blocks 6 x 9".
 */
export async function findProductByName(
  name: string,
  client: DbClient = getPrisma(),
): Promise<ProductRow | null> {
  return client.product.findFirst({ where: { name } });
}

export async function insertProduct(
  input: CreateProductInput,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  return client.product.create({
    data: {
      name: input.name,
      category: input.category,
      size: input.size,
      description: input.description ?? null,
    },
  });
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  const data: Prisma.ProductUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }
  if (input.category !== undefined) {
    data.category = input.category;
  }
  if (input.size !== undefined) {
    data.size = input.size;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }

  return client.product.update({ where: { id }, data });
}

export async function setProductActive(
  id: string,
  isActive: boolean,
  client: DbClient = getPrisma(),
): Promise<ProductRow> {
  return client.product.update({ where: { id }, data: { isActive } });
}

export async function countProducts(client: DbClient = getPrisma()): Promise<number> {
  return client.product.count();
}
