import { describe, expect, it } from 'vitest';
import {
  canApprovePayments,
  canApproveSalaries,
  canManageUsers,
  canOverrideCredit,
  canViewAuditLogs,
  canViewFinancialReports,
  canReleaseCuring,
  canRegisterSalary,
  isRole,
  roleLabel,
  type CurrentUser,
} from '@/lib/permissions';

/**
 * Smoke coverage for the interface permission helpers.
 *
 * The full frontend test suite is deferred to a later phase. These exist so the
 * runner is wired up and the most security-adjacent helpers are not completely
 * unverified.
 *
 * Remember: these helpers only decide what is shown. The backend enforces every
 * one of these rules again.
 */

function user(role: CurrentUser['role'], capabilities: CurrentUser['capabilities'] = []) {
  return { id: '1', name: 'Test', email: 't@test.local', role, capabilities };
}

describe('role helpers', () => {
  it('recognises only the three approved roles', () => {
    expect(isRole('super_admin')).toBe(true);
    expect(isRole('admin')).toBe(true);
    expect(isRole('accountant')).toBe(true);
    expect(isRole('owner')).toBe(false);
    expect(isRole(null)).toBe(false);
  });

  it('labels roles for display', () => {
    expect(roleLabel('super_admin')).toBe('Super Admin');
    expect(roleLabel('accountant')).toBe('Accountant');
  });
});

describe('administrator-only actions', () => {
  const checks = [
    canManageUsers,
    canApprovePayments,
    canApproveSalaries,
    canOverrideCredit,
    canViewAuditLogs,
    canViewFinancialReports,
  ];

  it('allows super admin and admin', () => {
    for (const check of checks) {
      expect(check(user('super_admin'))).toBe(true);
      expect(check(user('admin'))).toBe(true);
    }
  });

  it('refuses the accountant', () => {
    for (const check of checks) {
      expect(check(user('accountant'))).toBe(false);
    }
  });

  it('refuses a signed-out visitor', () => {
    for (const check of checks) {
      expect(check(null)).toBe(false);
    }
  });
});

describe('capabilities', () => {
  it('refuses an accountant with no grant', () => {
    expect(canReleaseCuring(user('accountant'))).toBe(false);
    expect(canRegisterSalary(user('accountant'))).toBe(false);
  });

  it('allows an accountant holding the grant', () => {
    expect(canReleaseCuring(user('accountant', ['CURING_RELEASE']))).toBe(true);
    expect(canRegisterSalary(user('accountant', ['SALARY_REGISTER']))).toBe(true);
  });

  it('keeps the two capabilities independent', () => {
    expect(canRegisterSalary(user('accountant', ['CURING_RELEASE']))).toBe(false);
  });

  it('allows administrators without any grant', () => {
    expect(canReleaseCuring(user('admin'))).toBe(true);
    expect(canRegisterSalary(user('super_admin'))).toBe(true);
  });
});
