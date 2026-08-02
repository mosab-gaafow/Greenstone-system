import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { API_BASE_PATH, createApp } from '../../src/app.js';
import { CSRF_HEADER_NAME } from '../../src/config/security.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { normalizeForComparison, normalizePhone } from '../../src/shared/utils/normalize.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { recordAudit } from '../../src/shared/audit/audit.service.js';
import { runInTransaction } from '../../src/shared/database/transaction.js';
import { allocateNumberInTransaction } from '../../src/shared/numbering/numbering.service.js';
import { insertQuotation } from '../../src/modules/quotations/quotations.repository.js';
import { createSignedInUser } from '../setup/auth-helpers.js';
import { disconnectTestPrisma, getTestPrisma, truncateAll } from '../setup/test-database.js';

const app = createApp();
const QUOTATIONS = `${API_BASE_PATH}/quotations`;

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

async function seedCustomer(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const phone = `07${String(Math.floor(10000000 + Math.random() * 89999999))}`;

  return getTestPrisma().customer.create({
    data: {
      name: overrides.name ?? `Customer ${Math.random().toString(36).slice(2, 8)}`,
      phone,
      phoneNormalized: normalizePhone(phone),
      isActive: overrides.isActive ?? true,
    },
  });
}

async function seedProduct(overrides: Partial<{ name: string; isActive: boolean }> = {}) {
  const name = overrides.name ?? `Product ${Math.random().toString(36).slice(2, 8)}`;

  return getTestPrisma().product.create({
    data: {
      name,
      nameNormalized: normalizeForComparison(name),
      category: 'HOLLOW_BLOCK',
      size: '6 × 9',
      isActive: overrides.isActive ?? true,
    },
  });
}

describe('quotations module', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  describe('authentication and permissions', () => {
    it('rejects an unauthenticated request', async () => {
      const response = await request(app).get(QUOTATIONS);

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });

    it('lets an accountant create a quotation', async () => {
      const { cookie } = await createSignedInUser('accountant');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 10, agreedUnitPrice: '50.00' }],
        });

      expect(response.status).toBe(201);
    });

    it('rejects a mutation with no CSRF token', async () => {
      const { cookie } = await createSignedInUser('admin');
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set('Cookie', cookie)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(403);
    });
  });

  describe('creating', () => {
    it('rejects a quotation with no items', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({ customerId: customer.id, items: [] });

      expect(response.status).toBe(422);
    });

    it('rejects a non-whole-number quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 2.5, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
    });

    it('rejects a zero or negative quantity', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 0, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
    });

    it('rejects a zero or negative unit price', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 5, agreedUnitPrice: '0' }],
        });

      expect(response.status).toBe(422);
    });

    it('rejects an inactive customer', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer({ isActive: false });
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('rejects an inactive product', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct({ isActive: false });

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.status).toBe(422);
      expect(response.body.error.message).toMatch(/inactive/i);
    });

    it('calculates line totals and the quotation total in decimal', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const productA = await seedProduct();
      const productB = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [
            { productId: productA.id, quantity: 3, agreedUnitPrice: '150.50' },
            { productId: productB.id, quantity: 7, agreedUnitPrice: '99.99' },
          ],
        });

      expect(response.status).toBe(201);
      const items = response.body.data.items as { lineTotal: string }[];
      expect(items[0]?.lineTotal).toBe('451.50');
      expect(items[1]?.lineTotal).toBe('699.93');
      // 451.50 + 699.93 — a floating-point sum would give 1151.4299999999998.
      expect(response.body.data.totalAmount).toBe('1151.43');
    });

    it('assigns a unique quotation number in the QUO-YYYY-#### format', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.body.data.quotationNumber).toMatch(/^QUO-\d{4}-\d{4}$/);
    });

    it('gives every concurrently created quotation a unique number', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();
      const body = {
        customerId: customer.id,
        items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
      };

      const responses = await Promise.all(
        Array.from({ length: 8 }, () => request(app).post(QUOTATIONS).set(headers).send(body)),
      );

      expect(responses.every((response) => response.status === 201)).toBe(true);
      const numbers = responses.map((response) => response.body.data.quotationNumber as string);
      expect(new Set(numbers).size).toBe(8);
    });

    it('starts every quotation as DRAFT', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      expect(response.body.data.status).toBe('DRAFT');
    });

    it('records the create with the actor', async () => {
      const { cookie, user } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'CREATE_QUOTATION' },
      });

      expect(audit?.userId).toBe(user.id);
      expect(audit?.module).toBe('quotations');
      expect(audit?.documentNumber).toMatch(/^QUO-/);
    });
  });

  describe('updating', () => {
    it('lets a draft quotation be edited', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      const response = await request(app)
        .patch(`${QUOTATIONS}/${created.body.data.id}`)
        .set(headers)
        .send({ items: [{ productId: product.id, quantity: 5, agreedUnitPrice: '20.00' }] });

      expect(response.status).toBe(200);
      expect(response.body.data.totalAmount).toBe('100.00');
      expect(response.body.data.items).toHaveLength(1);
    });

    it('does not change an old quotation when the product later changes', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct({ name: 'Original Name' });

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 2, agreedUnitPrice: '75.00' }],
        });

      await getTestPrisma().product.update({
        where: { id: product.id },
        data: { name: 'Renamed Product', nameNormalized: 'renamed product' },
      });

      const response = await request(app)
        .get(`${QUOTATIONS}/${created.body.data.id}`)
        .set('Cookie', cookie);

      expect(response.body.data.items[0].agreedUnitPrice).toBe('75.00');
      expect(response.body.data.items[0].lineTotal).toBe('150.00');
    });

    it('rejects editing a quotation that is not DRAFT', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });
      const id = created.body.data.id as string;

      await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      const response = await request(app)
        .patch(`${QUOTATIONS}/${id}`)
        .set(headers)
        .send({ items: [{ productId: product.id, quantity: 2, agreedUnitPrice: '10.00' }] });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_DOCUMENT_STATUS');
    });
  });

  describe('status transitions', () => {
    async function createDraft(headers: Record<string, string>): Promise<string> {
      const customer = await seedCustomer();
      const product = await seedProduct();

      const response = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      return response.body.data.id as string;
    }

    it('accepts a draft quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);

      const response = await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('ACCEPTED');
    });

    it('rejects a draft quotation with a reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);

      const response = await request(app)
        .post(`${QUOTATIONS}/${id}/reject`)
        .set(headers)
        .send({ reason: 'Customer chose a competitor.' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('REJECTED');
      expect(response.body.data.statusReason).toBe('Customer chose a competitor.');
    });

    it('cancels an accepted quotation with a reason', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);
      await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      const response = await request(app)
        .post(`${QUOTATIONS}/${id}/cancel`)
        .set(headers)
        .send({ reason: 'Order no longer needed.' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('CANCELLED');
    });

    it('rejects cancelling a rejected quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);
      await request(app).post(`${QUOTATIONS}/${id}/reject`).set(headers).send({});

      const response = await request(app).post(`${QUOTATIONS}/${id}/cancel`).set(headers).send({});

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('INVALID_DOCUMENT_STATUS');
    });

    it('rejects accepting an already-accepted quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);
      await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      const response = await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      expect(response.status).toBe(409);
    });

    it('accepts a rejection with no reason given', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);

      const response = await request(app).post(`${QUOTATIONS}/${id}/reject`).set(headers).send({});

      expect(response.status).toBe(200);
      expect(response.body.data.statusReason).toBeNull();
    });

    it('records status changes in the audit log', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await createDraft(headers);

      await request(app).post(`${QUOTATIONS}/${id}/accept`).set(headers).send({});

      const actions = await getTestPrisma().auditLog.findMany({
        where: { module: 'quotations', entityId: id },
        select: { action: true },
        orderBy: { createdAt: 'asc' },
      });

      expect(actions.map((row) => row.action)).toEqual(['CREATE_QUOTATION', 'ACCEPT_QUOTATION']);
    });
  });

  describe('no permanent deletion', () => {
    it('exposes no delete route', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const id = await (async () => {
        const customer = await seedCustomer();
        const product = await seedProduct();
        const created = await request(app)
          .post(QUOTATIONS)
          .set(headers)
          .send({
            customerId: customer.id,
            items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
          });
        return created.body.data.id as string;
      })();

      const response = await request(app).delete(`${QUOTATIONS}/${id}`).set(headers);

      expect(response.status).toBe(404);
      expect(await getTestPrisma().quotation.findUnique({ where: { id } })).not.toBeNull();
    });
  });

  describe('PDF generation and download', () => {
    it('downloads a PDF for a quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 2, agreedUnitPrice: '50.00' }],
        });

      const response = await request(app)
        .get(`${QUOTATIONS}/${created.body.data.id}/pdf`)
        .set('Cookie', cookie)
        .buffer(true)
        .parse((response_, callback) => {
          const chunks: Buffer[] = [];
          response_.on('data', (chunk: Buffer) => chunks.push(chunk));
          response_.on('end', () => {
            callback(null, Buffer.concat(chunks));
          });
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
      const body = response.body as Buffer;
      expect(body.subarray(0, 4).toString('latin1')).toBe('%PDF');
    }, 20000);

    it('creates permanent generated-document metadata', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });

      await request(app).get(`${QUOTATIONS}/${created.body.data.id}/pdf`).set('Cookie', cookie);

      const document = await getTestPrisma().generatedDocument.findFirst({
        where: { documentType: 'QUOTATION', relatedEntityId: created.body.data.id as string },
        include: { storedFile: true },
      });

      expect(document?.version).toBe(1);
      expect(document?.storedFile.retentionType).toBe('PERMANENT');
      expect(document?.storedFile.mimeType).toBe('application/pdf');

      const audit = await getTestPrisma().auditLog.findFirst({
        where: { action: 'GENERATE_QUOTATION_PDF' },
      });
      expect(audit).not.toBeNull();
    }, 20000);

    it('reuses the same version on a repeat download of an unchanged quotation', async () => {
      const { cookie } = await createSignedInUser('admin');
      const headers = await csrfHeaders(cookie);
      const customer = await seedCustomer();
      const product = await seedProduct();

      const created = await request(app)
        .post(QUOTATIONS)
        .set(headers)
        .send({
          customerId: customer.id,
          items: [{ productId: product.id, quantity: 1, agreedUnitPrice: '10.00' }],
        });
      const id = created.body.data.id as string;

      await request(app).get(`${QUOTATIONS}/${id}/pdf`).set('Cookie', cookie);
      await request(app).get(`${QUOTATIONS}/${id}/pdf`).set('Cookie', cookie);

      const documents = await getTestPrisma().generatedDocument.count({
        where: { documentType: 'QUOTATION', relatedEntityId: id },
      });
      expect(documents).toBe(1);
    }, 20000);
  });

  describe('transaction rollback', () => {
    it('rolls back the quotation and its number when the audit write fails', async () => {
      const customer = await seedCustomer();
      const product = await seedProduct();

      await expect(
        runInTransaction(async (tx) => {
          const { documentNumber } = await allocateNumberInTransaction(tx, {
            documentType: 'QUOTATION',
          });

          await insertQuotation(
            {
              quotationNumber: documentNumber,
              customerId: customer.id,
              totalAmount: new Prisma.Decimal('10.00'),
              items: [
                {
                  productId: product.id,
                  quantity: 1,
                  agreedUnitPrice: '10.00',
                  lineTotal: new Prisma.Decimal('10.00'),
                },
              ],
            },
            tx,
          );

          // `action` is a required column; a null violates it and fails the write.
          await recordAudit(tx, {
            action: null as unknown as string,
            module: 'quotations',
            entityType: 'Quotation',
          });
        }),
      ).rejects.toThrow();

      expect(await getTestPrisma().quotation.count()).toBe(0);
      expect(await getTestPrisma().quotationItem.count()).toBe(0);
      expect(await getTestPrisma().documentSequence.count()).toBe(0);
    });
  });
});
