import type { Capability } from '../../generated/prisma/client.js';
import { getPrisma } from '../../shared/database/prisma.js';
import type { DbClient } from '../../shared/database/transaction.js';

/**
 * Read access for user records.
 *
 * Better Auth owns writes to the user table. This repository only reads, and
 * only for the parts Better Auth's own APIs do not return — chiefly the
 * Greenstone capability grants.
 *
 * Never write to the Better Auth tables from here.
 */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: Date;
}

export async function findUsers(
  filters: { skip: number; take: number; search?: string | undefined },
  client: DbClient = getPrisma(),
): Promise<{ rows: UserRow[]; total: number }> {
  const where = filters.search
    ? {
        OR: [{ email: { contains: filters.search } }, { name: { contains: filters.search } }],
      }
    : {};

  const [rows, total] = await Promise.all([
    client.user.findMany({
      where,
      skip: filters.skip,
      take: filters.take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, banned: true, createdAt: true },
    }),
    client.user.count({ where }),
  ]);

  return { rows, total };
}

export async function findUserById(
  userId: string,
  client: DbClient = getPrisma(),
): Promise<UserRow | null> {
  return client.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, banned: true, createdAt: true },
  });
}

export async function findUserByEmail(
  email: string,
  client: DbClient = getPrisma(),
): Promise<UserRow | null> {
  return client.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, banned: true, createdAt: true },
  });
}

/** Active capability grants for several users, keyed by user id. */
export async function findCapabilitiesForUsers(
  userIds: string[],
  client: DbClient = getPrisma(),
): Promise<Map<string, Capability[]>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const grants = await client.userCapabilityGrant.findMany({
    where: { userId: { in: userIds }, revokedAt: null },
    select: { userId: true, capability: true },
  });

  const byUser = new Map<string, Capability[]>();

  for (const grant of grants) {
    const existing = byUser.get(grant.userId);
    if (existing) {
      existing.push(grant.capability);
    } else {
      byUser.set(grant.userId, [grant.capability]);
    }
  }

  return byUser;
}

/** Number of user records. Used by the bootstrap script. */
export async function countUsers(client: DbClient = getPrisma()): Promise<number> {
  return client.user.count();
}
