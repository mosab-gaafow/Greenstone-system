# Greenstone Management System

A secure, mobile-first management system for Greenstone's daily business operations.

The system will manage the full workflow from customer quotation and order creation to production, curing, stock, delivery, invoicing, payment, salaries, and reporting.

## Project Status

The business blueprint and technical implementation blueprint are approved.

The project is currently at:

**Phase 0 — Repository and documentation setup**

Application features have not been implemented yet.

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
- Zod
- JWT access tokens
- Refresh tokens
- Secure HTTP-only cookies

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
├── frontend/
├── backend/
├── docs/
│   ├── business-blueprint.md
│   └── technical-blueprint.md
├── scripts/
├── CLAUDE.md
├── README.md
├── package.json
└── pnpm-workspace.yaml
```

## Documentation

The approved project documents are stored in:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`

These documents are the main source of truth.

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

Local setup commands will be added after the frontend and backend applications are created during Phase 0.

## License

This is a private Greenstone business project.

No open-source license is currently provided.
