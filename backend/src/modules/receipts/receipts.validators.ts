import { z } from 'zod';

export const receiptIdParamsSchema = z.object({
  id: z.string().uuid('Invalid receipt ID.'),
});

export const listReceiptsQuerySchema = z.object({
  page: z.coerce.number().int().min(1),
  pageSize: z.coerce.number().int().min(1).max(100),
  search: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  sortBy: z.string().optional().default('issuedAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
});
