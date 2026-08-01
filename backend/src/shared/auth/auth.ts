import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin as adminPlugin } from 'better-auth/plugins';
import { getEnv } from '../../config/env.js';
import { getPrisma } from '../database/prisma.js';
import { ADMIN_ROLES, ac, roles } from './permissions.js';

/**
 * Better Auth instance.
 *
 * Better Auth is the only authentication framework in this project. It owns
 * sign-in, sign-out, sessions, cookies, password hashing, and the `/api/auth/*`
 * endpoints. Never build any of those by hand.
 *
 * Exported as a module-level constant because the Better Auth CLI introspects
 * this export to generate the database schema.
 *
 * See docs/technical-blueprint.md section 6.
 */

const env = getEnv();

export const auth = betterAuth({
  appName: 'Greenstone Management System',
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',

  database: prismaAdapter(getPrisma(), {
    provider: 'mysql',
  }),

  emailAndPassword: {
    enabled: true,
    // Users are created only by Super Admin or Admin. There is no public
    // registration in this system.
    disableSignUp: true,
    // Email delivery is not part of the MVP, so nothing is verified by email.
    requireEmailVerification: false,
    minPasswordLength: 12,
  },

  session: {
    // Database-backed sessions, so revocation takes effect immediately.
    expiresIn: env.SESSION_EXPIRES_IN_SECONDS,
    updateAge: 60 * 60 * 24,
  },

  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProduction || env.NODE_ENV === 'staging',
    },
  },

  trustedOrigins: [env.FRONTEND_ORIGIN],

  rateLimit: {
    enabled: true,
    window: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
    max: 100,
    customRules: {
      // Sign-in is the endpoint worth guarding hardest.
      '/sign-in/email': {
        window: env.AUTH_RATE_LIMIT_WINDOW_SECONDS,
        max: env.AUTH_SIGN_IN_MAX_ATTEMPTS,
      },
    },
  },

  plugins: [
    adminPlugin({
      ac,
      roles,
      adminRoles: [...ADMIN_ROLES],
      // Sign-up is disabled, so every user is created with an explicit role.
      // This default is the least privileged of the three.
      defaultRole: 'accountant',
      bannedUserMessage: 'This account is deactivated. Please contact a system administrator.',
    }),
  ],
});

export type Auth = typeof auth;
export type AuthSession = Auth['$Infer']['Session'];
