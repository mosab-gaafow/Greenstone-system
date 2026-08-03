import { afterAll, describe, expect, it } from 'vitest';
import { hasPermission } from '../../src/shared/auth/permission.middleware.js';
import { ROLE_NAMES, statement } from '../../src/shared/auth/permissions.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { disconnectTestPrisma } from '../setup/test-database.js';

/**
 * Role permissions, checked against docs/permissions-matrix.md.
 *
 * These assertions are the executable form of the approved matrix. If one fails,
 * either the code or the matrix has drifted.
 */

describe('role permissions', () => {
  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('declares exactly the three approved roles', () => {
    expect([...ROLE_NAMES].sort()).toEqual(['accountant', 'admin', 'super_admin']);
  });

  describe('super_admin', () => {
    it('may manage users', async () => {
      expect(await hasPermission('super_admin', 'user', 'create')).toBe(true);
      expect(await hasPermission('super_admin', 'user', 'set-role')).toBe(true);
      expect(await hasPermission('super_admin', 'user', 'ban')).toBe(true);
    });

    it('may approve and reverse payments', async () => {
      expect(await hasPermission('super_admin', 'customer-payment', 'approve')).toBe(true);
      expect(await hasPermission('super_admin', 'customer-payment', 'reverse')).toBe(true);
    });

    it('may override customer credit', async () => {
      expect(await hasPermission('super_admin', 'customer-credit', 'override')).toBe(true);
    });

    it('may force-deactivate a customer (Phase 6E addendum)', async () => {
      expect(await hasPermission('super_admin', 'customer', 'force-deactivate')).toBe(true);
    });

    it('may approve, correct and reverse salaries', async () => {
      expect(await hasPermission('super_admin', 'salary', 'approve')).toBe(true);
      expect(await hasPermission('super_admin', 'salary', 'correct')).toBe(true);
      expect(await hasPermission('super_admin', 'salary', 'reverse')).toBe(true);
    });

    it('may view audit logs', async () => {
      expect(await hasPermission('super_admin', 'audit-log', 'read')).toBe(true);
    });
  });

  describe('admin', () => {
    it('may manage users', async () => {
      expect(await hasPermission('admin', 'user', 'create')).toBe(true);
      expect(await hasPermission('admin', 'user', 'ban')).toBe(true);
    });

    it('may approve payments and salaries', async () => {
      expect(await hasPermission('admin', 'customer-payment', 'approve')).toBe(true);
      expect(await hasPermission('admin', 'salary', 'approve')).toBe(true);
    });

    it('may override customer credit', async () => {
      expect(await hasPermission('admin', 'customer-credit', 'override')).toBe(true);
    });

    it('may force-deactivate a customer (Phase 6E addendum)', async () => {
      expect(await hasPermission('admin', 'customer', 'force-deactivate')).toBe(true);
    });

    it('may change settings and read audit logs', async () => {
      expect(await hasPermission('admin', 'settings', 'update')).toBe(true);
      expect(await hasPermission('admin', 'audit-log', 'read')).toBe(true);
    });
  });

  describe('accountant — permitted', () => {
    it('may manage customers', async () => {
      expect(await hasPermission('accountant', 'customer', 'create')).toBe(true);
      expect(await hasPermission('accountant', 'customer', 'update')).toBe(true);
    });

    it('may create orders and invoices', async () => {
      expect(await hasPermission('accountant', 'order', 'create')).toBe(true);
      expect(await hasPermission('accountant', 'invoice', 'create')).toBe(true);
    });

    it('may cancel orders', async () => {
      expect(await hasPermission('accountant', 'order', 'cancel')).toBe(true);
      expect(await hasPermission('super_admin', 'order', 'cancel')).toBe(true);
      expect(await hasPermission('admin', 'order', 'cancel')).toBe(true);
    });

    it('may record payments and expenses', async () => {
      expect(await hasPermission('accountant', 'customer-payment', 'create')).toBe(true);
      expect(await hasPermission('accountant', 'expense', 'create')).toBe(true);
    });

    it('may adjust stock', async () => {
      expect(await hasPermission('accountant', 'finished-stock', 'adjust')).toBe(true);
      expect(await hasPermission('accountant', 'raw-material-stock', 'adjust')).toBe(true);
    });

    it('may register production and curing', async () => {
      expect(await hasPermission('accountant', 'production', 'create')).toBe(true);
      expect(await hasPermission('accountant', 'curing', 'create')).toBe(true);
    });

    it('may read operational reports', async () => {
      expect(await hasPermission('accountant', 'report', 'read-operational')).toBe(true);
    });
  });

  describe('accountant — refused', () => {
    it('may not approve or reverse customer payments', async () => {
      expect(await hasPermission('accountant', 'customer-payment', 'approve')).toBe(false);
      expect(await hasPermission('accountant', 'customer-payment', 'reverse')).toBe(false);
    });

    it('may not approve, correct or reverse salaries', async () => {
      expect(await hasPermission('accountant', 'salary', 'approve')).toBe(false);
      expect(await hasPermission('accountant', 'salary', 'correct')).toBe(false);
      expect(await hasPermission('accountant', 'salary', 'reverse')).toBe(false);
    });

    it('may not register salaries through the role alone', async () => {
      // Salary registration is granted per user by capability, never by role.
      expect(await hasPermission('accountant', 'salary', 'register')).toBe(false);
    });

    it('may not release curing through the role alone', async () => {
      expect(await hasPermission('accountant', 'curing', 'release')).toBe(false);
    });

    it('may not override customer credit', async () => {
      expect(await hasPermission('accountant', 'customer-credit', 'override')).toBe(false);
    });

    it('may not force-deactivate a customer (Phase 6E addendum)', async () => {
      expect(await hasPermission('accountant', 'customer', 'force-deactivate')).toBe(false);
    });

    it('may not manage users', async () => {
      expect(await hasPermission('accountant', 'user', 'create')).toBe(false);
      expect(await hasPermission('accountant', 'user', 'list')).toBe(false);
      expect(await hasPermission('accountant', 'user', 'set-role')).toBe(false);
    });

    it('may not grant capabilities', async () => {
      expect(await hasPermission('accountant', 'capability', 'grant')).toBe(false);
    });

    it('may not change settings', async () => {
      expect(await hasPermission('accountant', 'settings', 'update')).toBe(false);
    });

    it('may not read audit logs', async () => {
      expect(await hasPermission('accountant', 'audit-log', 'read')).toBe(false);
    });

    it('may not read financial reports', async () => {
      expect(await hasPermission('accountant', 'report', 'read-financial')).toBe(false);
    });

    it('may not set opening balances or opening stock', async () => {
      expect(await hasPermission('accountant', 'customer-credit', 'set-opening-balance')).toBe(
        false,
      );
      expect(await hasPermission('accountant', 'finished-stock', 'set-opening')).toBe(false);
    });

    it('may not void an invoice', async () => {
      expect(await hasPermission('accountant', 'invoice', 'void')).toBe(false);
    });
  });

  describe('statement', () => {
    it('includes the Better Auth user and session resources', () => {
      expect(statement).toHaveProperty('user');
      expect(statement).toHaveProperty('session');
    });

    it('does not grant impersonation to any Greenstone role', async () => {
      // Impersonation is disabled for this project.
      expect(await hasPermission('admin', 'user', 'impersonate')).toBe(false);
      expect(await hasPermission('accountant', 'user', 'impersonate')).toBe(false);
    });
  });
});
