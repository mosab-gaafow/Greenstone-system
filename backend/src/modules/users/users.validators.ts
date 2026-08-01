import { z } from 'zod';
import { Capability } from '../../generated/prisma/client.js';
import { ROLE_NAMES } from '../../shared/auth/permissions.js';

/**
 * Request schemas for the users module.
 *
 * Backend validation is mandatory and never trusts the frontend.
 */

const roleSchema = z.enum(ROLE_NAMES as [string, ...string[]]);
const capabilitySchema = z.enum(Object.values(Capability) as [string, ...string[]]);

export const userIdParamsSchema = z.object({
  id: z.string().min(1, 'A user id is required.'),
});

export const createUserBodySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
  email: z.email('Enter a valid email address.').toLowerCase(),
  // Better Auth hashes the password. It is never stored or logged by Greenstone.
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),
  role: roleSchema,
});

export const updateRoleBodySchema = z.object({
  role: roleSchema,
});

export const deactivateBodySchema = z.object({
  reason: z.string().trim().min(3, 'A reason is required.').max(500).optional(),
});

export const capabilityBodySchema = z.object({
  capability: capabilitySchema,
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(120).optional(),
});
