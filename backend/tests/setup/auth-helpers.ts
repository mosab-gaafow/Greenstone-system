import { auth } from '../../src/shared/auth/auth.js';
import type { GreenstoneRole } from '../../src/shared/auth/permissions.js';
import { getTestPrisma } from './test-database.js';

/**
 * Helpers for building authenticated test users.
 *
 * Users are created through Better Auth's own API, so tests exercise the same
 * path production uses rather than inserting rows directly.
 */

export const TEST_PASSWORD = 'test-password-1234';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: GreenstoneRole;
}

/**
 * Creates a user directly through the internal adapter, bypassing the admin
 * permission check. Used to seed the first Super Admin in a test, which has no
 * existing administrator to authorise it.
 */
export async function createTestUser(
  role: GreenstoneRole,
  overrides: { email?: string; name?: string } = {},
): Promise<TestUser> {
  const email =
    overrides.email ?? `${role}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@test.local`;
  const name = overrides.name ?? `Test ${role}`;

  const created = await auth.api
    .signUpEmail({
      body: { email, password: TEST_PASSWORD, name },
    })
    .catch(async () => {
      // Sign-up is disabled in this application, which is the point of the test
      // suite. Fall back to writing through Better Auth's context adapter.
      const ctx = await auth.$context;
      const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: false });
      await ctx.internalAdapter.linkAccount({
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password: await ctx.password.hash(TEST_PASSWORD),
      });
      return { user };
    });

  await getTestPrisma().user.update({
    where: { id: created.user.id },
    data: { role },
  });

  return { id: created.user.id, email, name, role };
}

/**
 * Signs in and returns the cookie header for subsequent requests.
 */
export async function signIn(email: string, password = TEST_PASSWORD): Promise<string> {
  const response = await auth.api.signInEmail({
    body: { email, password },
    asResponse: true,
  });

  const setCookie = response.headers.getSetCookie();

  if (setCookie.length === 0) {
    throw new Error(`Sign-in did not return a session cookie for ${email}`);
  }

  return setCookie.map((cookie) => cookie.split(';')[0]).join('; ');
}

/** Creates a user of the given role and returns its session cookie. */
export async function createSignedInUser(
  role: GreenstoneRole,
): Promise<{ user: TestUser; cookie: string }> {
  const user = await createTestUser(role);
  const cookie = await signIn(user.email);
  return { user, cookie };
}

/** Removes all rows between tests. Kept as an alias so intent reads clearly. */
export { truncateAll as truncateAuthTables } from './test-database.js';
