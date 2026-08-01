import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AUTH_BASE_PATH, createApp } from '../../src/app.js';
import { disconnectPrisma } from '../../src/shared/database/prisma.js';
import { TEST_PASSWORD, createTestUser, truncateAuthTables } from '../setup/auth-helpers.js';
import { disconnectTestPrisma } from '../setup/test-database.js';

const app = createApp();

describe('Better Auth endpoints', () => {
  beforeEach(async () => {
    await truncateAuthTables();
  });

  afterAll(async () => {
    await disconnectTestPrisma();
    await disconnectPrisma();
  });

  it('rejects public sign-up', async () => {
    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-up/email`)
      .send({ email: 'intruder@test.local', password: 'a-long-enough-password', name: 'Intruder' });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(response.body)).toMatch(/sign up|disabled|not enabled/i);
  });

  it('does not create a user when sign-up is attempted', async () => {
    await request(app).post(`${AUTH_BASE_PATH}/sign-up/email`).send({
      email: 'intruder2@test.local',
      password: 'a-long-enough-password',
      name: 'Intruder',
    });

    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: 'intruder2@test.local', password: 'a-long-enough-password' });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('signs a user in and sets an HTTP-only session cookie', async () => {
    const user = await createTestUser('admin');

    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(response.status).toBe(200);

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toMatch(/HttpOnly/i);
  });

  it('never returns a session token in the response body', async () => {
    const user = await createTestUser('admin');

    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: user.email, password: TEST_PASSWORD });

    const body = JSON.stringify(response.body);
    expect(body).not.toMatch(/"password"/);
  });

  it('rejects a wrong password', async () => {
    const user = await createTestUser('accountant');

    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: user.email, password: 'completely-wrong-password' });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects an unknown email without revealing that it is unknown', async () => {
    const response = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: 'nobody@test.local', password: TEST_PASSWORD });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(JSON.stringify(response.body)).not.toMatch(/no such user|does not exist|not found/i);
  });

  it('returns the session for a signed-in user', async () => {
    const user = await createTestUser('admin');

    const signIn = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: user.email, password: TEST_PASSWORD });

    const cookie = (signIn.headers['set-cookie'] as unknown as string[])
      .map((value) => value.split(';')[0])
      .join('; ');

    const response = await request(app).get(`${AUTH_BASE_PATH}/get-session`).set('Cookie', cookie);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(user.email);
  });

  it('signs the user out', async () => {
    const user = await createTestUser('admin');

    const signIn = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-in/email`)
      .send({ email: user.email, password: TEST_PASSWORD });

    const cookie = (signIn.headers['set-cookie'] as unknown as string[])
      .map((value) => value.split(';')[0])
      .join('; ');

    const signOut = await request(app)
      .post(`${AUTH_BASE_PATH}/sign-out`)
      .set('Cookie', cookie)
      .send({});

    expect(signOut.status).toBe(200);
  });
});
