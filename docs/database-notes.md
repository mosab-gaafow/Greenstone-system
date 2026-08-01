# Database Notes

Implementation notes for the MySQL database.

The approved design is `docs/technical-blueprint.md` section 4. This document
records what exists in code and why.

## Stack

- MySQL, accessed through Prisma 7.
- Prisma 7 requires a driver adapter. `@prisma/adapter-mariadb` is the adapter
  for the `mysql` provider; there is no separate `mysql2` dependency.
- The connection URL is **not** in `schema.prisma` — Prisma 7 removed that. It
  lives in `backend/prisma.config.ts` for the CLI, and is passed to
  `PrismaClient` through the adapter at runtime.
- The generated client is written to `backend/src/generated/prisma`, is
  gitignored, and is rebuilt with `pnpm --filter backend prisma:generate`.

## Migrations

| Migration                              | Phase | Contents                           |
| -------------------------------------- | ----- | ---------------------------------- |
| `20260801162336_phase1_infrastructure` | 1     | `document_sequences`, `audit_logs` |

Commands:

```bash
pnpm --filter backend prisma:migrate   # create and apply during development
pnpm --filter backend prisma:deploy    # apply existing migrations (CI, staging, production)
```

Business tables are added from Phase 2 onward, each in the phase that owns them.

## Tables

### `document_sequences`

One counter per document type per Africa/Nairobi calendar year.

- `UNIQUE (documentType, year)` is what ultimately guarantees one counter per
  year. It is a database constraint, not an application check.
- Sequences restart each calendar year, using the **Nairobi** year rather than
  UTC. Nairobi is UTC+3, so 31 December 22:00 UTC already belongs to the new
  year's sequence.

### `audit_logs`

Append-only. Rows are inserted by services and never updated or deleted through
the application.

- `previousData` and `updatedData` are MySQL `JSON`. A missing value is written
  as SQL `NULL` via `Prisma.DbNull`, not as the JSON value `null`.
- `userId` is a plain nullable column in Phase 1 because no `User` table exists
  yet. **Phase 2 adds the foreign-key relation.**
- Indexed on `(entityType, entityId)`, `userId`, `(module, action)` and
  `createdAt`, which are the ways audit history is searched.

## Document numbering and concurrency

Numbers are generated only by `src/shared/numbering/`, inside a transaction.

The allocation is a single statement:

```sql
INSERT INTO document_sequences (id, documentType, year, lastNumber, createdAt, updatedAt)
VALUES (?, ?, ?, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE lastNumber = lastNumber + 1, updatedAt = NOW(3)
```

followed by a read of the row in the same transaction.

**Why not `SELECT … FOR UPDATE`.** The obvious implementation — lock the row,
read it, increment it — fails for the first request of a new year. `FOR UPDATE`
on a row that does not exist acquires no row lock, so every concurrent request
falls through to `INSERT` and they deadlock on the unique index. This was
caught by `tests/integration/numbering-concurrency.test.ts` during Phase 1, not
in review. The upsert creates or increments atomically and holds an exclusive
lock on the index entry for the rest of the transaction.

`allocateNumberInTransaction` is the form business services should use, so a
failed business write rolls the counter back instead of burning a number.
`allocateNumber` opens its own transaction and retries transient conflicts
(`P2034`, `P2002`, deadlock and lock-wait-timeout messages) with randomised
backoff.

Gaps are allowed. Duplicates are not. Cancelled or voided numbers are never
reused.

## Row locking elsewhere

Prisma's query builder cannot express `FOR UPDATE`, so pessimistic locks are raw
SQL. `lockRowsForUpdate()` in `src/shared/database/transaction.ts` provides this
for stock, balances and other counters in later phases. It validates table and
column names against `^[A-Za-z_][A-Za-z0-9_]*$` and passes the value as a bound
parameter.

Locking outside a transaction gives no protection, because the lock is released
immediately.

## Transactions

`runInTransaction()` wraps Prisma's interactive transaction. Sensitive
operations — stock, balances, payments, approvals and numbering — must use it.

The business change and its required audit record commit together or not at all.
`tests/integration/audit-log.test.ts` proves this by forcing the audit insert to
fail and asserting the business row is gone.

## Test database

- Tests use `TEST_DATABASE_URL`, never `DATABASE_URL`.
- `tests/setup/global-setup.ts` refuses to run if the variable is missing, if it
  equals `DATABASE_URL`, or if the database name does not end in `_test`.
- Migrations are applied to the test database before the suite runs.
- Tables are truncated between tests.
- Test files run serially, because they share one database.

## Standards

- UUID identifiers for business records.
- Document numbers stored separately from internal ids.
- Money as `DECIMAL`, never floating-point.
- Piece quantities as integers; raw-material quantities may be decimal.
- Timestamps stored in UTC, displayed in Africa/Nairobi.
- Uniqueness enforced by database constraints for important business rules.
- Issued transactional records are never hard-deleted.
