import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, AUTH_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { TEST_PASSWORD, createSignedInUser, createTestUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const USERS = `${API_BASE_PATH}/users`;

/**
 * Fetches a CSRF token bound to the caller's session and returns headers ready
 * for a state-changing request.
 *
 * This is exactly the flow the frontend follows.
 */
async function csrfHeaders(cookie: string): Promise<Record<string, string>> {
  const response = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);

  expect(response.status).toBe(200);

  const issued = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const csrfCookie = issued.find((value) => value.startsWith('greenstone.csrf='));

  if (!csrfCookie) {
    throw new Error('The CSRF endpoint did not set its cookie.');
  }

  return {
    Cookie: `${cookie}; ${csrfCookie.split(';')[0] as string}`,
    [CSRF_HEADER_NAME]: response.body.data.csrfToken as string,
  };
}

describe('users module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(USERS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('returns the standard error envelope when unauthenticated', async () => {
      const response = await request(app).get(USERS);

      expect(response.body.success).toBe(false);
      expect(typeof response.body.requestId).toBe('string');
    });
  });

  describe('role permissions', () => {
    it('allows an admin to list users', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).get(USERS).set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('allows a super admin to list users', async () => {
      const { cookie } = await createSignedInUser('super_admin');

      const response = await request(app).get(USERS).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('refuses an accountant', async () => {
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(USERS).set('Cookie', cookie);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('refuses an accountant creating a user', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(USERS).set(headers).send({
        name: 'New User',
        email: 'new.user@test.local',
        password: 'a-long-enough-password',
        role: 'admin',
      });

      expect(response.status).toBe(403);
    });

    it('includes pagination metadata on the list', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).get(`${USERS}?page=1&pageSize=10`).set('Cookie', cookie);

      expect(response.body.meta).toMatchObject({ page: 1, pageSize: 10 });
    });
  });

  describe('CSRF', () => {
    it('rejects a state-changing request with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).post(USERS).set('Cookie', cookie).send({
        name: 'New User',
        email: 'csrf.test@test.local',
        password: 'a-long-enough-password',
        role: 'accountant',
      });

      expect(response.status).toBe(403);
    });
  });

  describe('user creation', () => {
    it('creates a user and never returns the password', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(USERS).set(headers).send({
        name: 'Amina Accountant',
        email: 'amina@test.local',
        password: 'a-long-enough-password',
        role: 'accountant',
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toMatchObject({
        email: 'amina@test.local',
        role: 'accountant',
        isActive: true,
      });
      expect(JSON.stringify(response.body)).not.toContain('a-long-enough-password');
    });

    it('rejects a duplicate email', async () => {
      const { cookie } = await createSignedInUser('admin');
      await createTestUser('accountant', { email: 'taken@test.local' });
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(USERS).set(headers).send({
        name: 'Duplicate',
        email: 'taken@test.local',
        password: 'a-long-enough-password',
        role: 'accountant',
      });

      expect(response.status).toBe(422);
    });

    it('rejects a short password', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(USERS)
        .set(headers)
        .send({ name: 'Short', email: 'short@test.local', password: 'short', role: 'accountant' });

      expect(response.status).toBe(422);
      expect(response.body.error.fieldErrors).toHaveProperty('password');
    });

    it('rejects an unknown role', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).post(USERS).set(headers).send({
        name: 'Bad Role',
        email: 'badrole@test.local',
        password: 'a-long-enough-password',
        role: 'owner',
      });

      expect(response.status).toBe(422);
    });

    it('writes an audit log for the creation', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).post(USERS).set(headers).send({
        name: 'Audited User',
        email: 'audited@test.local',
        password: 'a-long-enough-password',
        role: 'accountant',
      });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_USER' },
      });

      expect(audit).not.toBeNull();
      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('users');
      expect(JSON.stringify(audit?.updatedData)).not.toContain('a-long-enough-password');
    });
  });

  describe('deactivation', () => {
    it('deactivates a user and revokes their sessions', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${USERS}/${target.user.id}/deactivate`)
        .set(headers)
        .send({ reason: 'Left the company.' });

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(false);

      const sessions = await getTestPrisma().session.count({
        where: { userId: target.user.id },
      });
      expect(sessions).toBe(0);
    });

    it('blocks a deactivated user from signing in', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${USERS}/${target.id}/deactivate`)
        .set(headers)
        .send({ reason: 'Deactivated for test.' });

      const signIn = await request(app)
        .post(`${AUTH_BASE_PATH}/sign-in/email`)
        .send({ email: target.email, password: TEST_PASSWORD });

      expect(signIn.status).toBeGreaterThanOrEqual(400);
    });

    it('refuses to deactivate your own account', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${USERS}/${user.id}/deactivate`)
        .set(headers)
        .send({ reason: 'Testing self-lockout.' });

      expect(response.status).toBe(422);
    });

    it('reactivates a deactivated user', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${USERS}/${target.id}/deactivate`)
        .set(headers)
        .send({ reason: 'Temporary.' });

      const response = await request(app)
        .post(`${USERS}/${target.id}/activate`)
        .set(headers)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.data.isActive).toBe(true);
    });

    it('audits the deactivation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${USERS}/${target.id}/deactivate`)
        .set(headers)
        .send({ reason: 'Audited deactivation.' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'DEACTIVATE_USER', entityId: target.id },
      });

      expect(audit?.reason).toBe('Audited deactivation.');
    });
  });

  describe('role changes', () => {
    it('changes a role and revokes the sessions', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${USERS}/${target.user.id}/role`)
        .set(headers)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('admin');

      const sessions = await getTestPrisma().session.count({
        where: { userId: target.user.id },
      });
      expect(sessions).toBe(0);
    });

    it('refuses to change your own role', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(`${USERS}/${user.id}/role`)
        .set(headers)
        .send({ role: 'accountant' });

      expect(response.status).toBe(422);
    });

    it('audits the role change with before and after values', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      await request(app).patch(`${USERS}/${target.id}/role`).set(headers).send({ role: 'admin' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CHANGE_USER_ROLE', entityId: target.id },
      });

      expect(audit?.previousData).toEqual({ role: 'accountant' });
      expect(audit?.updatedData).toEqual({ role: 'admin' });
    });
  });

  describe('capabilities', () => {
    it('grants and revokes an approved capability', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      const granted = await request(app)
        .post(`${USERS}/${target.id}/capabilities`)
        .set(headers)
        .send({ capability: 'CURING_RELEASE' });

      expect(granted.status).toBe(200);
      expect(granted.body.data.capabilities).toContain('CURING_RELEASE');

      const revoked = await request(app)
        .delete(`${USERS}/${target.id}/capabilities`)
        .set(headers)
        .send({ capability: 'CURING_RELEASE' });

      expect(revoked.status).toBe(200);
      expect(revoked.body.data.capabilities).not.toContain('CURING_RELEASE');
    });

    it('rejects an unapproved capability', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${USERS}/${target.id}/capabilities`)
        .set(headers)
        .send({ capability: 'DELETE_EVERYTHING' });

      expect(response.status).toBe(422);
    });

    it('refuses an accountant granting a capability to themselves', async () => {
      const { cookie, user } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .post(`${USERS}/${user.id}/capabilities`)
        .set(headers)
        .send({ capability: 'SALARY_REGISTER' });

      expect(response.status).toBe(403);
    });

    it('audits the grant', async () => {
      const { cookie } = await createSignedInUser('admin');
      const target = await createTestUser('accountant');
      const headers = await csrfHeaders(cookie);

      await request(app)
        .post(`${USERS}/${target.id}/capabilities`)
        .set(headers)
        .send({ capability: 'SALARY_REGISTER' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'GRANT_CAPABILITY' },
      });

      expect(audit).not.toBeNull();
    });
  });

  describe('not found', () => {
    it('returns 404 for an unknown user', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).get(`${USERS}/does-not-exist`).set('Cookie', cookie);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
