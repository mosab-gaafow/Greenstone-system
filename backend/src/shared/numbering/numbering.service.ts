import { formatDocumentNumber } from '../constants/document-types.js';
import { InternalServerError } from '../errors/app-error.js';
import { getNairobiYear } from '../utils/nairobi.js';
import type { TransactionClient } from '../database/transaction.js';
import { runInTransaction } from '../database/transaction.js';
import { allocateSequenceValue } from './numbering.repository.js';
import type { AllocateNumberInput, AllocatedNumber } from './numbering.types.js';

/**
 * Central document-numbering service.
 *
 * Business modules call this from their service layer. Controllers, routes and
 * the frontend must never generate official numbers.
 *
 * See docs/technical-blueprint.md section 10.
 */

/** Attempts before giving up when the database reports a transient conflict. */
const MAX_ATTEMPTS = 5;

/**
 * Allocates the next official number **within an existing transaction**.
 *
 * Prefer this form: the number is allocated in the same transaction as the
 * document it belongs to, so a failed business write rolls the counter back
 * rather than burning a number.
 *
 * A caller-supplied transaction cannot be retried from here — if the database
 * reports a conflict, the caller's whole transaction must be retried.
 */
export async function allocateNumberInTransaction(
  tx: TransactionClient,
  input: AllocateNumberInput,
): Promise<AllocatedNumber> {
  const { documentType } = input;
  const year = input.year ?? getNairobiYear();
  const sequence = await allocateSequenceValue(tx, documentType, year);

  return {
    documentType,
    year,
    sequence,
    documentNumber: formatDocumentNumber(documentType, year, sequence),
  };
}

/**
 * Allocates the next official number in its own transaction.
 *
 * Use only when there is no surrounding transaction. The number is committed
 * immediately, so an unused one leaves a gap. Gaps are allowed; duplicates are
 * not.
 */
export async function allocateNumber(input: AllocateNumberInput): Promise<AllocatedNumber> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await runInTransaction((tx) => allocateNumberInTransaction(tx, input));
    } catch (error) {
      lastError = error;

      if (!isTransientConflict(error)) {
        throw error;
      }

      await backOff(attempt);
    }
  }

  throw new InternalServerError(
    `Could not allocate a ${input.documentType} number after ${MAX_ATTEMPTS} attempts.`,
    { cause: lastError },
  );
}

/**
 * Conflicts the database expects the client to retry: deadlocks, lock-wait
 * timeouts and unique-key races. Anything else is a real failure.
 */
function isTransientConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;

  // P2034: write conflict or deadlock. P2002: unique constraint violation.
  if (code === 'P2034' || code === 'P2002') {
    return true;
  }

  const message = 'message' in error ? String((error as { message?: unknown }).message) : '';
  return /deadlock|lock wait timeout|write conflict/i.test(message);
}

/**
 * Short randomised pause so retrying transactions do not collide again in step.
 */
async function backOff(attempt: number): Promise<void> {
  const delayMs = Math.min(20 * 2 ** (attempt - 1), 200) + Math.floor(Math.random() * 20);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
