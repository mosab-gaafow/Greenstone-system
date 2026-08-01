import { Capability } from '../../generated/prisma/client.js';
import type { DbClient, TransactionClient } from '../database/transaction.js';
import { getPrisma } from '../database/prisma.js';
import { runInTransaction } from '../database/transaction.js';
import { recordAudit } from '../audit/audit.service.js';
import { BusinessRuleViolationError } from '../errors/app-error.js';
import type { AuditContext } from '../audit/audit.types.js';

/**
 * Greenstone capability grants.
 *
 * Only two per-user permissions are approved, both for the Accountant role:
 * curing release and salary registration. See docs/permissions-matrix.md
 * section 4.
 *
 * Capabilities are checked **after** the role check, never instead of it.
 */

export { Capability };

const AUDIT_MODULE = 'capabilities';

/**
 * Returns true when the user holds an active grant for the capability.
 *
 * A grant with a `revokedAt` date no longer counts.
 */
export async function hasCapability(
  userId: string,
  capability: Capability,
  client: DbClient = getPrisma(),
): Promise<boolean> {
  const grant = await client.userCapabilityGrant.findFirst({
    where: { userId, capability, revokedAt: null },
    select: { id: true },
  });

  return grant !== null;
}

/** Lists a user's active capabilities. */
export async function listCapabilities(
  userId: string,
  client: DbClient = getPrisma(),
): Promise<Capability[]> {
  const grants = await client.userCapabilityGrant.findMany({
    where: { userId, revokedAt: null },
    select: { capability: true },
  });

  return grants.map((grant) => grant.capability);
}

/**
 * Grants a capability. Granting one the user already holds is rejected rather
 * than silently duplicated, so the audit history stays meaningful.
 */
export async function grantCapability(
  userId: string,
  capability: Capability,
  context: AuditContext,
): Promise<void> {
  await runInTransaction(async (tx: TransactionClient) => {
    if (await hasCapability(userId, capability, tx)) {
      throw new BusinessRuleViolationError('This user already has that capability.');
    }

    const grant = await tx.userCapabilityGrant.create({
      data: {
        userId,
        capability,
        grantedById: context.userId ?? null,
      },
      select: { id: true },
    });

    await recordAudit(tx, {
      ...context,
      action: 'GRANT_CAPABILITY',
      module: AUDIT_MODULE,
      entityType: 'UserCapabilityGrant',
      entityId: grant.id,
      updatedData: { userId, capability },
    });
  });
}

/** Revokes an active capability grant. */
export async function revokeCapability(
  userId: string,
  capability: Capability,
  context: AuditContext,
): Promise<void> {
  await runInTransaction(async (tx: TransactionClient) => {
    const grant = await tx.userCapabilityGrant.findFirst({
      where: { userId, capability, revokedAt: null },
      select: { id: true },
    });

    if (!grant) {
      throw new BusinessRuleViolationError('This user does not have that capability.');
    }

    await tx.userCapabilityGrant.update({
      where: { id: grant.id },
      data: { revokedAt: new Date() },
    });

    await recordAudit(tx, {
      ...context,
      action: 'REVOKE_CAPABILITY',
      module: AUDIT_MODULE,
      entityType: 'UserCapabilityGrant',
      entityId: grant.id,
      previousData: { userId, capability, revoked: false },
      updatedData: { userId, capability, revoked: true },
    });
  });
}
