// Must stay first: it populates the environment before any module that reads
// configuration at import time is evaluated.
import '../src/config/load-env.js';

import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { auth } from '../src/shared/auth/auth.js';
import { countUsers } from '../src/modules/users/users.repository.js';
import { recordAuditStandalone } from '../src/shared/audit/audit.service.js';
import { disconnectPrisma } from '../src/shared/database/prisma.js';

/**
 * Creates the initial Super Admin.
 *
 * Credentials are prompted for, never read from the environment, so no password
 * ends up in a .env file, shell history, or a CI log.
 *
 * Refuses to run once any user exists, so it cannot be used to quietly add a
 * privileged account to a live system.
 */

async function main(): Promise<void> {
  const existing = await countUsers();

  if (existing > 0) {
    console.error(
      `Refusing to run: the database already has ${existing} user(s).\n` +
        'Create further users through the application, as Super Admin or Admin.',
    );
    process.exitCode = 1;
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const name = (await rl.question('Full name: ')).trim();
    const email = (await rl.question('Email: ')).trim().toLowerCase();

    const password = await askHidden(rl, 'Password (min 12 characters): ');
    const confirm = await askHidden(rl, 'Confirm password: ');

    if (name.length < 2) {
      throw new Error('Name must be at least 2 characters.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address.');
    }
    if (password.length < 12) {
      throw new Error('Password must be at least 12 characters.');
    }
    if (password !== confirm) {
      throw new Error('The passwords do not match.');
    }

    // Better Auth hashes the password. It is never stored or logged here.
    const created = await auth.api.createUser({
      body: { name, email, password, role: 'super_admin' },
    });

    await recordAuditStandalone({
      userId: created.user.id,
      userName: name,
      userRole: 'super_admin',
      action: 'CREATE_SUPER_ADMIN',
      module: 'users',
      entityType: 'User',
      entityId: created.user.id,
      updatedData: { name, email, role: 'super_admin' },
      reason: 'Initial Super Admin created during system setup.',
    });

    console.log(`\nSuper Admin created: ${email}`);
    console.log('Sign in through the application and create the remaining users there.');
  } finally {
    rl.close();
  }
}

/**
 * Reads a line without echoing it to the terminal.
 *
 * `readline` has no hidden-input mode, so stdout is muted for the duration of
 * the prompt and restored afterwards.
 */
async function askHidden(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  const output = process.stdout;
  const originalWrite = output.write.bind(output);

  originalWrite(prompt);

  // Swallow echoed characters while the answer is being typed.
  const mutedWrite = (chunk: unknown, ...rest: unknown[]): boolean => {
    if (typeof chunk === 'string' && !chunk.includes('\n')) {
      return true;
    }
    return (originalWrite as (...args: unknown[]) => boolean)(chunk, ...rest);
  };

  output.write = mutedWrite as typeof output.write;

  try {
    return await rl.question('');
  } finally {
    output.write = originalWrite;
    originalWrite('\n');
  }
}

void main()
  .catch((error: unknown) => {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => {
    void disconnectPrisma();
  });
