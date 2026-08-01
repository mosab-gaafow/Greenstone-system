import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../../src/shared/middleware/error-handler.js';
import { requestId } from '../../src/shared/middleware/request-id.js';
import { getValidatedQuery, validate } from '../../src/shared/validation/validate.js';

const bodySchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  quantity: z.number().int().positive('Quantity must be a positive whole number.'),
});

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

function buildApp() {
  const app = express();
  app.use(requestId());
  app.use(express.json());

  app.post('/items', validate({ body: bodySchema }), (req, res) => {
    res.status(200).json({ received: req.body });
  });

  app.get('/items', validate({ query: querySchema }), (_req, res) => {
    res.status(200).json({ query: getValidatedQuery(res) });
  });

  app.use(errorHandler());
  return app;
}

describe('Zod validation middleware', () => {
  it('accepts a valid body', async () => {
    const response = await request(buildApp()).post('/items').send({ name: 'Cement', quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body.received).toEqual({ name: 'Cement', quantity: 5 });
  });

  it('rejects an invalid body with 422 and field errors', async () => {
    const response = await request(buildApp()).post('/items').send({ name: '', quantity: -2 });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.fieldErrors).toEqual({
      name: ['Name is required.'],
      quantity: ['Quantity must be a positive whole number.'],
    });
  });

  it('reports a missing field', async () => {
    const response = await request(buildApp()).post('/items').send({ name: 'Cement' });

    expect(response.status).toBe(422);
    expect(response.body.error.fieldErrors).toHaveProperty('quantity');
  });

  it('strips unknown fields rather than trusting them', async () => {
    const response = await request(buildApp())
      .post('/items')
      .send({ name: 'Cement', quantity: 5, isApproved: true });

    expect(response.body.received).not.toHaveProperty('isApproved');
  });

  it('coerces and defaults query parameters', async () => {
    const withPage = await request(buildApp()).get('/items?page=3');
    expect(withPage.body.query).toEqual({ page: 3 });

    const withoutPage = await request(buildApp()).get('/items');
    expect(withoutPage.body.query).toEqual({ page: 1 });
  });

  it('rejects an invalid query parameter', async () => {
    const response = await request(buildApp()).get('/items?page=0');

    expect(response.status).toBe(422);
    expect(response.body.error.fieldErrors).toHaveProperty('page');
  });
});
