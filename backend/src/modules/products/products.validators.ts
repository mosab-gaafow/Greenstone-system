import { z } from 'zod';
import { ProductCategory } from '../../generated/prisma/client.js';

/**
 * Product request schemas.
 *
 * Backend validation is mandatory and never trusts the frontend.
 *
 * Note what is absent: there is no price field, and `.strict()` on the bodies
 * means sending one is rejected rather than quietly ignored.
 */

const categorySchema = z.enum(
  Object.values(ProductCategory) as [ProductCategory, ...ProductCategory[]],
);

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Product name must be at least 2 characters.')
  .max(120, 'Product name must be 120 characters or fewer.');

const sizeSchema = z
  .string()
  .trim()
  .min(1, 'Size is required.')
  .max(60, 'Size must be 60 characters or fewer.');

const descriptionSchema = z
  .string()
  .trim()
  .max(500, 'Description must be 500 characters or fewer.');

export const productIdParamsSchema = z.object({
  id: z.string().min(1, 'A product id is required.'),
});

export const createProductBodySchema = z
  .object({
    name: nameSchema,
    category: categorySchema,
    size: sizeSchema,
    // Nullable as well as optional, so a form that clears the field can send
    // null on create exactly as it does on update.
    description: descriptionSchema.nullable().optional(),
  })
  .strict();

export const updateProductBodySchema = z
  .object({
    name: nameSchema.optional(),
    category: categorySchema.optional(),
    size: sizeSchema.optional(),
    // Null clears the description; undefined leaves it unchanged.
    description: descriptionSchema.nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update.',
  });

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(120).optional(),
  category: categorySchema.optional(),
  // Absent means both. The string form is what a URL query gives us.
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  sortBy: z.enum(['name', 'category', 'createdAt']).default('name'),
  sortDirection: z.enum(['asc', 'desc']).default('asc'),
});
