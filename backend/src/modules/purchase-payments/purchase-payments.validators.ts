import { z } from 'zod';
import { PaymentMethod } from '../../generated/prisma/client.js';
import { isNotFutureNairobiDate } from '../../shared/utils/nairobi.js';

/**
 * Purchase payment request schemas.
 *
 * Sent as `multipart/form-data` (an optional evidence file may accompany
 * the request), so every field arrives as a string — including
 * `allocations`, which the frontend JSON-encodes into one field. The
 * `z.preprocess` below decodes it before the array schema runs, the same
 * "normalise before validating" technique `purchases`' frontend form used to
 * fix its own empty-string-vs-undefined bug.
 *
 * Bodies are `.strict()`, so an unexpected field is rejected rather than
 * silently ignored.
 */

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to two decimal places.')
  .refine((value) => Number(value) > 0, { message: 'Amount must be greater than zero.' });

const allocationSchema = z
  .object({
    purchaseId: z.string().min(1, 'Select a purchase.'),
    allocatedAmount: moneyString,
  })
  .strict();

const allocationsField = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.trim() === '') {
    return [];
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(allocationSchema).default([]));

export const purchasePaymentIdParamsSchema = z.object({
  id: z.string().min(1, 'A purchase payment id is required.'),
});

export const createPurchasePaymentBodySchema = z
  .object({
    supplierId: z.string().min(1, 'Select a supplier.'),
    amount: moneyString,
    paymentMethod: z.enum(PaymentMethod),
    paymentReference: z
      .string()
      .trim()
      .min(1, 'Enter the payment reference or details.')
      .max(255, 'Reference must be 255 characters or fewer.'),
    paymentDate: z.coerce
      .date()
      .refine(isNotFutureNairobiDate, { message: 'Payment date cannot be in the future.' }),
    allocations: allocationsField,
  })
  .strict();

export const reversePurchasePaymentBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(1, 'A reason is required.')
      .max(500, 'Reason must be 500 characters or fewer.'),
  })
  .strict();

export const listPurchasePaymentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(150).optional(),
  supplierId: z.string().min(1).optional(),
  purchaseId: z.string().min(1).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REVERSED']).optional(),
  sortBy: z.enum(['paymentNumber', 'createdAt']).default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
