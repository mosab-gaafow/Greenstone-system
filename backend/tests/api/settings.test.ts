import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const SETTINGS = `${API_BASE_PATH}/settings`;

async function csrfHeaders(cookie: string): Promise<Record<string, string>> {
  const response = await request(app).get(`${API_BASE_PATH}/csrf-token`).set('Cookie', cookie);
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

describe('settings module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(SETTINGS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('refuses an accountant reading settings', async () => {
      // The approved matrix gives settings to Super Admin and Admin only.
      const { cookie } = await createSignedInUser('accountant');

      const response = await request(app).get(SETTINGS).set('Cookie', cookie);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('PERMISSION_DENIED');
    });

    it('refuses an accountant updating settings', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(SETTINGS)
        .set(headers)
        .send({ companyName: 'Not Allowed' });

      expect(response.status).toBe(403);
    });

    it('lets an admin read settings', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app).get(SETTINGS).set('Cookie', cookie);

      expect(response.status).toBe(200);
    });

    it('rejects an update with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');

      const response = await request(app)
        .patch(SETTINGS)
        .set('Cookie', cookie)
        .send({ companyName: 'No CSRF' });

      expect(response.status).toBe(403);
    });
  });

  describe('reading', () => {
    it('creates the singleton row with blank values on first read', async () => {
      const { cookie } = await createSignedInUser('super_admin');

      const response = await request(app).get(SETTINGS).set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        companyName: null,
        address: null,
        phone: null,
        email: null,
        paymentDetails: null,
        footerNotes: null,
      });

      expect(await getTestPrisma().companySettings.count()).toBe(1);
    });

    it('never creates a second row on repeated reads', async () => {
      const { cookie } = await createSignedInUser('super_admin');

      await request(app).get(SETTINGS).set('Cookie', cookie);
      await request(app).get(SETTINGS).set('Cookie', cookie);

      expect(await getTestPrisma().companySettings.count()).toBe(1);
    });
  });

  describe('updating', () => {
    it('updates allowed fields', async () => {
      const { cookie } = await createSignedInUser('super_admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).patch(SETTINGS).set(headers).send({
        companyName: 'Greenstone Blocks Ltd',
        phone: '0722123456',
        email: 'info@greenstone.co.ke',
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        companyName: 'Greenstone Blocks Ltd',
        phone: '0722123456',
        email: 'info@greenstone.co.ke',
      });
    });

    it('clears a field when null is sent', async () => {
      const { cookie } = await createSignedInUser('super_admin');
      const headers = await csrfHeaders(cookie);

      await request(app).patch(SETTINGS).set(headers).send({ companyName: 'Has A Name' });
      const response = await request(app).patch(SETTINGS).set(headers).send({ companyName: null });

      expect(response.body.data.companyName).toBeNull();
    });

    it('rejects an empty update', async () => {
      const { cookie } = await createSignedInUser('super_admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app).patch(SETTINGS).set(headers).send({});

      expect(response.status).toBe(422);
    });

    it('rejects an unexpected field', async () => {
      const { cookie } = await createSignedInUser('super_admin');
      const headers = await csrfHeaders(cookie);

      const response = await request(app)
        .patch(SETTINGS)
        .set(headers)
        .send({ logoUrl: 'https://example.com/logo.png' });

      expect(response.status).toBe(422);
    });
  });

  describe('audit', () => {
    it('records the update with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);

      await request(app).patch(SETTINGS).set(headers).send({ companyName: 'Audited Co' });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'UPDATE_SETTINGS' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('settings');
    });
  });
});
