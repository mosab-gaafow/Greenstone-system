'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient, inferAdditionalFields } from 'better-auth/client/plugins';
import { BACKEND_URL } from './config';

/**
 * Better Auth client.
 *
 * Authentication is handled entirely by Better Auth. Never build a custom
 * session store, token refresh, or authentication request by hand.
 *
 * `credentials: 'include'` is required because the backend runs on a different
 * port in development, so the session cookie is cross-origin.
 */
export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  basePath: '/api/auth',
  plugins: [
    adminClient(),
    // The backend stores the Greenstone role on the user record. Declaring it
    // here makes it typed on the client.
    inferAdditionalFields({
      user: {
        role: { type: 'string' },
        banned: { type: 'boolean' },
      },
    }),
  ],
  fetchOptions: {
    credentials: 'include',
  },
});

export const { signIn, signOut, useSession } = authClient;
