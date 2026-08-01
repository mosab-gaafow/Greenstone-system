# Greenstone Management System

A secure, mobile-first management system for Greenstone's daily business operations.

The system will manage the full workflow from customer quotation and order creation to production, curing, stock, delivery, invoicing, payment, salaries, and reporting.

## Project Status

The business blueprint and technical implementation blueprint are approved.

The project is currently at:

**Phase 1 — Backend foundation**

The repository foundation and the shared backend infrastructure are in place:
configuration, database access, transactions, audit logging, document
numbering, storage and PDF abstractions, error handling and health endpoints.

Authentication and business features have not been implemented yet.

## Main MVP Areas

The MVP will manage:

- Users and permissions
- Customers and building-site addresses
- Products
- Quotations
- Orders
- Production
- Curing
- Finished-product stock
- Broken products
- Raw-material inventory
- Suppliers
- Purchases and supplier payments
- Deliveries
- Company and hired vehicles
- Drivers
- Invoices
- Customer payments
- Receipts
- Customer credit and outstanding balances
- General expenses
- Employees
- Weekly and monthly salaries
- Internal alerts
- Reports
- Audit logs
- System settings

## Technology Stack

### Frontend

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod
- Better Auth client
- Lucide React
- Recharts
- Sonner
- next-themes

### Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- MySQL
- Redis (caching)
- Zod
- Better Auth
- Secure HTTP-only cookies

Better Auth is the only authentication framework. The project does not build
custom JWT access tokens, refresh tokens, password hashing, session tables, or
authentication endpoints.

## Architecture

The backend uses a pragmatic Domain-Driven Design modular structure.

Every business module must contain exactly six files:

```text
modules/customers/
├── customers.routes.ts
├── customers.controller.ts
├── customers.service.ts
├── customers.repository.ts
├── customers.validators.ts
└── customers.types.ts
```

Required dependency flow:

```text
routes → controller → service → repository → Prisma
```

Main rules:

- Routes connect endpoints and middleware only.
- Controllers handle HTTP requests and responses only.
- Services contain business logic and transaction coordination.
- Repositories communicate with Prisma and MySQL only.
- Validators contain Zod schemas.
- Types contain module-specific TypeScript types.
- Controllers must never call Prisma or repositories directly.
- Cross-module operations must happen through services.
- Sensitive operations must use transactions and audit logs.

## Repository Structure

The planned repository structure is:

```text
greenstone-system/
├── .github/
│   └── workflows/
│       └── validate.yml
├── frontend/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── lib/
│   ├── providers/
│   ├── hooks/
│   ├── styles/
│   ├── types/
│   ├── public/
│   ├── tests/
│   └── e2e/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── modules/
│   │   ├── shared/
│   │   ├── health/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   └── seed/
│   │       ├── development/
│   │       └── production/
│   ├── storage/
│   └── tests/
├── docs/
│   ├── business-blueprint.md
│   ├── technical-blueprint.md
│   ├── implementation-plan.md
│   ├── permissions-matrix.md
│   ├── api-conventions.md
│   ├── database-notes.md
│   ├── deployment-guide.md
│   └── production-setup-checklist.md
├── scripts/
├── CLAUDE.md
├── README.md
├── package.json
└── pnpm-workspace.yaml
```

`backend/src/shared/` and `backend/src/health/` hold the Phase 1 infrastructure.
`backend/src/modules/` and most `frontend/` subfolders are still empty
placeholders, filled in the phase that owns the work.

## Documentation

The approved project documents are stored in:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`
- `docs/implementation-plan.md`

These documents are the main source of truth.

Practical guides:

- `docs/api-testing-guide.md` — how to test the API with Postman or curl
- `docs/api-conventions.md` — response formats, error codes, status codes
- `docs/permissions-matrix.md` — roles, permissions, and capabilities

The following documents are placeholders and are written in the phase that owns them:

- `docs/permissions-matrix.md` — Phase 2
- `docs/api-conventions.md` — Phase 1
- `docs/database-notes.md` — Phase 1 onward
- `docs/deployment-guide.md` — Phase 12
- `docs/production-setup-checklist.md` — Phase 12

Implementation must not invent or change approved business requirements.

## Roles

The confirmed system roles are:

- Super Admin
- Admin
- Accountant

Permissions must be checked by the backend.

Hiding an action in the frontend is not enough for security.

## Important Business Rules

- One pallet contains exactly 12 pieces.
- Curing duration is either 2 days or 3 days.
- Products cannot be released before completing at least 2 full curing days.
- Raw-material usage is recorded using the actual quantity used.
- Product prices are agreed per customer transaction.
- Quotations, orders, and invoices store their own price snapshots.
- One order has exactly one invoice.
- The customer credit limit is KES 1,000,000.
- Finished stock is reserved before delivery and permanently reduced at dispatch.
- Issued financial and stock records must remain traceable.
- Important changes require audit logs.
- Official document numbers are generated automatically by the backend.

## Demo and Production Data

Development may use safe demo records.

Demo data must:

- Be clearly separated from production data.
- Be created through a development seed process.
- Be easy to remove.
- Never be inserted automatically into production.

Real company data will be entered during production setup.

## Development Principles

- Work in small phases.
- Keep the frontend and backend separate.
- Do not place business logic in controllers or repositories.
- Do not hard-delete issued financial or stock records.
- Use database transactions for sensitive operations.
- Use decimal values for money.
- Store dates in UTC.
- Display user-facing dates using the Africa/Nairobi timezone.
- Build mobile-first.
- Keep the interface simple for non-technical users.

## Planned Implementation Order

1. Repository and documentation foundation
2. Backend foundation
3. Authentication, users, and permissions
4. Frontend login and application shell
5. Master data
6. Quotations, orders, and customer credit
7. Production and curing
8. Raw materials, purchases, and supplier balances
9. Finished stock and deliveries
10. Invoices, customer payments, and receipts
11. Expenses and salaries
12. Dashboard, reports, alerts, testing, and deployment

## Local Development

### Requirements

- Node.js 24 or newer (CI validates Node 24 and Node 26)
- pnpm 11.18.0 or newer
- A running MySQL server with two databases: one for development and one for tests

### Install

```bash
pnpm install
```

This installs the root workspace and both applications.

### Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Fill in `DATABASE_URL`, `TEST_DATABASE_URL` and `CSRF_SECRET` in `backend/.env`.

Never commit a real environment file. Never place a secret in a frontend variable.

### Database setup

Create both databases, then apply the migrations:

```sql
CREATE DATABASE greenstone_dev;
CREATE DATABASE greenstone_test;
```

```bash
pnpm --filter backend prisma:generate   # generate the Prisma client
pnpm --filter backend prisma:migrate    # create and apply migrations (development)
```

The Prisma client is generated code and is not committed. Run
`prisma:generate` after cloning the repository and after any schema change.

> **The test database is wiped repeatedly.** The suite refuses to run unless
> `TEST_DATABASE_URL` differs from `DATABASE_URL` and its database name ends
> with `_test`.

| Command                                 | Purpose                                       |
| --------------------------------------- | --------------------------------------------- |
| `pnpm --filter backend prisma:generate` | Regenerate the Prisma client                  |
| `pnpm --filter backend prisma:migrate`  | Create and apply a migration (development)    |
| `pnpm --filter backend prisma:deploy`   | Apply existing migrations (CI, staging, prod) |
| `pnpm --filter backend prisma:studio`   | Browse the database                           |

### Running the applications

Run the frontend and the backend in **two separate terminal sessions**. Keep both
processes running while developing.

Terminal 1 — backend:

```bash
pnpm dev:backend
```

Terminal 2 — frontend:

```bash
pnpm dev:frontend
```

| Application | Default address       |
| ----------- | --------------------- |
| Frontend    | http://localhost:3000 |
| Backend     | http://localhost:4000 |

The backend exposes health endpoints only. Business routes are added from
Phase 2 onward.

| Endpoint                   | Purpose                                             |
| -------------------------- | --------------------------------------------------- |
| `GET /api/v1/health/live`  | Liveness. Does not touch the database.              |
| `GET /api/v1/health/ready` | Readiness. Checks database, configuration, storage. |

### Validation commands

| Command             | Purpose                                      |
| ------------------- | -------------------------------------------- |
| `pnpm format`       | Apply Prettier formatting                    |
| `pnpm format:check` | Verify formatting                            |
| `pnpm lint`         | Lint both applications                       |
| `pnpm lint:fix`     | Lint and apply safe fixes                    |
| `pnpm typecheck`    | Type check both applications                 |
| `pnpm build`        | Build both applications                      |
| `pnpm validate`     | Run format check, lint, type check and build |

`pnpm validate` runs the same steps as the GitHub Actions validation workflow.

### Tests

```bash
pnpm test                          # both applications
pnpm --filter backend test         # backend suite
pnpm --filter backend test:unit    # unit tests only, no database needed
pnpm --filter frontend test        # frontend suite
```

Backend unit tests need no database. Integration and API tests use
`TEST_DATABASE_URL`, and run serially because they share one database.

Frontend test coverage is deliberately minimal for now. The runner is
configured and the permission helpers are covered; broader UI tests are added
in a later phase.

### Design system

The frontend uses the same brand palette, typography and radii as the
Greenstone marketing website, so the two read as one product.

- Brand green `#285030`, with a 50–900 scale
- Inter for body text, Manrope for headings
- shadcn/ui components, light and dark mode
- Tokens live in `frontend/app/globals.css`

Change a token in the marketing website first, then copy it across.

### Seeds

Seed commands are reserved but not implemented yet.

| Command                           | Implemented in |
| --------------------------------- | -------------- |
| `pnpm --filter backend seed:dev`  | Phase 4        |
| `pnpm --filter backend seed:prod` | Phase 2        |

See `backend/prisma/seed/README.md`.

### Toolchain notes

- TypeScript is pinned to 5.9 because `typescript-eslint` does not yet support
  TypeScript 7.
- ESLint is pinned to 9 because `eslint-config-next` is not yet compatible with
  ESLint 10.
- Prisma 7 requires a driver adapter; `@prisma/adapter-mariadb` is the one for
  the `mysql` provider.
- Prisma 7 no longer reads the connection URL from `schema.prisma`. It lives in
  `backend/prisma.config.ts`, which loads `.env` through Node's built-in loader
  so the project needs no `dotenv` dependency.

## License

This is a private Greenstone business project.

No open-source license is currently provided.
