import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { Capability } from '../../src/generated/prisma/client.js';
import {
  grantCapability,
  hasCapability,
  listCapabilities,
  revokeCapability,
} from '../../src/shared/auth/capability.service.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const context = {
  userId: null,
  userName: 'Test Admin',
  userRole: 'admin',
  requestId: 'test-request',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
};

describe('capability grants', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('reports no capability before a grant', async () => {
    const user = await createTestUser('accountant');
    expect(await hasCapability(user.id, Capability.CURING_RELEASE)).toBe(false);
  });

  it('grants a capability', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);

    expect(await hasCapability(user.id, Capability.CURING_RELEASE)).toBe(true);
  });

  it('keeps capabilities independent of one another', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);

    expect(await hasCapability(user.id, Capability.SALARY_REGISTER)).toBe(false);
  });

  it('revokes a capability', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.SALARY_REGISTER, context);
    await revokeCapability(user.id, Capability.SALARY_REGISTER, context);

    expect(await hasCapability(user.id, Capability.SALARY_REGISTER)).toBe(false);
  });

  it('keeps the revoked grant row for history rather than deleting it', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.SALARY_REGISTER, context);
    await revokeCapability(user.id, Capability.SALARY_REGISTER, context);

    const rows = await getTestPrisma().userCapabilityGrant.findMany({
      where: { userId: user.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.revokedAt).toBeInstanceOf(Date);
  });

  it('allows re-granting after a revoke', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);
    await revokeCapability(user.id, Capability.CURING_RELEASE, context);
    await grantCapability(user.id, Capability.CURING_RELEASE, context);

    expect(await hasCapability(user.id, Capability.CURING_RELEASE)).toBe(true);
    expect(await getTestPrisma().userCapabilityGrant.count({ where: { userId: user.id } })).toBe(2);
  });

  it('rejects granting a capability the user already holds', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);

    await expect(grantCapability(user.id, Capability.CURING_RELEASE, context)).rejects.toThrow(
      /already has/i,
    );
  });

  it('rejects revoking a capability the user does not hold', async () => {
    const user = await createTestUser('accountant');

    await expect(revokeCapability(user.id, Capability.CURING_RELEASE, context)).rejects.toThrow(
      /does not have/i,
    );
  });

  it('lists only active capabilities', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);
    await grantCapability(user.id, Capability.SALARY_REGISTER, context);
    await revokeCapability(user.id, Capability.CURING_RELEASE, context);

    expect(await listCapabilities(user.id)).toEqual([Capability.SALARY_REGISTER]);
  });

  it('audits the grant and the revoke', async () => {
    const user = await createTestUser('accountant');

    await grantCapability(user.id, Capability.CURING_RELEASE, context);
    await revokeCapability(user.id, Capability.CURING_RELEASE, context);

    const actions = await getTestPrisma().auditLog.findMany({
      where: { module: 'capabilities' },
      select: { action: true },
      orderBy: { createdAt: 'asc' },
    });

    expect(actions.map((row) => row.action)).toEqual(['GRANT_CAPABILITY', 'REVOKE_CAPABILITY']);
  });

  it('does not leave a grant behind when the audit write fails', async () => {
    const user = await createTestUser('accountant');

    await expect(
      grantCapability(user.id, Capability.CURING_RELEASE, {
        ...context,
        // A role snapshot longer than the column allows fails the audit insert.
        userRole: 'x'.repeat(1000),
      }),
    ).rejects.toThrow();

    expect(await hasCapability(user.id, Capability.CURING_RELEASE)).toBe(false);
  });

  it('supports only the two approved capabilities', () => {
    expect(Object.values(Capability).sort()).toEqual(['CURING_RELEASE', 'SALARY_REGISTER']);
  });
});
