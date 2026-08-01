# Greenstone Management System
## Approved Implementation Plan

## 1. Purpose

This document defines the step-by-step implementation order for the Greenstone Management System.

Claude must use this plan together with:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`
- `CLAUDE.md`
- `frontend/CLAUDE.md`
- `backend/CLAUDE.md`

The business and technical blueprints remain the source of truth.

This implementation plan controls the order of work. It does not replace approved business requirements.

---

# 2. Execution Rules

For every phase, Claude must:

1. Read the approved documentation.
2. Inspect the current repository.
3. Check the current Git status.
4. Prepare a clear implementation plan for the requested phase.
5. Wait for approval before making large changes.
6. Implement only the approved phase.
7. Run available validation commands.
8. Report:
   - Created files.
   - Changed files.
   - Commands run.
   - Test results.
   - Build results.
   - Warnings.
   - Unfinished items.
9. Update the progress section of this document only when instructed.
10. Stop after the requested phase.

Claude must not:

- Start the next phase automatically.
- Invent business requirements.
- Implement future features early.
- Add real company data.
- Mix demo and production data.
- Stop or kill running frontend or backend terminal processes.
- Use browser automation.
- Open or control a browser automatically.
- Run destructive database or Git commands.
- Force-push.
- Change approved architecture without permission.

---

# 3. Progress

| Phase | Name | Status |
|---|---|---|
| 0 | Repository foundation | NOT_STARTED |
| 1 | Backend foundation | NOT_STARTED |
| 2 | Authentication, users, and permissions | NOT_STARTED |
| 3 | Frontend shell and authentication | NOT_STARTED |
| 4 | Master data | NOT_STARTED |
| 5 | Quotations, orders, and customer credit | NOT_STARTED |
| 6 | Production and curing | NOT_STARTED |
| 7 | Raw materials, purchases, and supplier balances | NOT_STARTED |
| 8 | Finished stock and deliveries | NOT_STARTED |
| 9 | Invoices, customer payments, and receipts | NOT_STARTED |
| 10 | Expenses and salaries | NOT_STARTED |
| 11 | Dashboard, reports, and alerts | NOT_STARTED |
| 12 | Hardening and production preparation | NOT_STARTED |

Allowed status values:

- `NOT_STARTED`
- `PLANNING`
- `IN_PROGRESS`
- `BLOCKED`
- `COMPLETED`

---

# 4. Phase 0 — Repository Foundation

## Goal

Create a clean monorepo foundation without implementing Greenstone business features.

## Work

Prepare:

- pnpm workspace.
- Root package configuration.
- Next.js 16 frontend application.
- Express and TypeScript backend application.
- Shared formatting.
- Shared linting.
- Type checking.
- Environment example files.
- Root `.gitignore`.
- Root `.editorconfig`.
- Basic scripts.
- GitHub Actions validation workflow.
- Development and production seed separation structure.
- Empty documentation placeholders where approved.
- Local development commands.

## Frontend setup

Prepare:

- Next.js 16 App Router.
- TypeScript.
- Tailwind CSS v4.
- Basic application shell only.
- No dashboard.
- No authentication page.
- No business pages.

## Backend setup

Prepare:

- Express.
- TypeScript.
- Basic server entry.
- Basic application entry.
- No Prisma schema design.
- No authentication.
- No business modules.

## Do not build

- Database entities.
- Authentication.
- Customers.
- Products.
- Dashboard.
- Business modules.
- Demo business records.
- Real company data.

## Completion gate

Phase 0 is complete only when:

- Root workspace configuration works.
- Frontend installs and builds.
- Backend installs and builds.
- Linting passes.
- Type checking passes.
- Validation workflow is present.
- Local startup instructions are documented.
- No business features were added.

---

# 5. Phase 1 — Backend Foundation

## Goal

Create shared backend infrastructure before business modules.

## Work

Prepare:

- Express application structure.
- Environment validation.
- Prisma client connection.
- MySQL configuration.
- Request ID middleware.
- Structured logging.
- Security headers.
- CORS configuration.
- Cookie configuration.
- CSRF foundation.
- Rate-limit foundation.
- Standard success responses.
- Standard error responses.
- Global error handler.
- Zod validation middleware.
- Transaction helpers.
- Audit-log infrastructure.
- Document-numbering infrastructure.
- File-storage abstraction.
- PDF-generation abstraction.
- Liveness endpoint.
- Readiness endpoint.
- Test database configuration.
- Redis cache infrastructure. Added as a Phase 1 addendum before Phase 4, since
  there is no business data to cache until then.

## Do not build

- Authentication endpoints.
- Users module.
- Business modules.
- Full Prisma business schema.
- Frontend login.

## Completion gate

- Backend starts successfully.
- Health endpoints work.
- Environment validation works.
- Error responses follow the approved format.
- Test database connection works.
- Numbering infrastructure has concurrency tests.
- Backend lint, type check, tests, and build pass.

---

# 6. Phase 2 — Authentication, Users, and Permissions

## Goal

Secure the system before business features are created.

## Backend modules

Create exactly six files for:

- `auth`
- `users`

## Work

Better Auth is the only authentication framework. Do not build any part of
authentication by hand.

Implement:

- Better Auth with the Prisma adapter and MySQL.
- Email and password login.
- Logout.
- Better Auth database-backed sessions.
- Better Auth password hashing.
- Secure HTTP-only cookies.
- The Better Auth handler mounted at `/api/auth/*`, before `express.json()`.
- Public sign-up disabled.
- User creation by Super Admin and Admin only.
- The Better Auth Admin plugin.
- Custom Better Auth access control.
- CSRF protection for `/api/v1` business routes.
- User activation.
- User deactivation.
- Session revocation on logout, deactivation, and role change.
- Fixed roles:
  - `super_admin`.
  - `admin`.
  - `accountant`.
- Shared permission map from the approved permissions matrix.
- Approved user capability grants.
- Authentication audit logs.
- Login rate limiting.

Do not build:

- Custom JWT access tokens.
- Refresh tokens or refresh-token rotation.
- Custom password hashing.
- Custom session tables.
- Custom authentication endpoints.

Do not enable public registration, social login, magic links, passkeys,
organization plugins, the JWT plugin, user impersonation, or automatic
authentication emails.

## Do not build

- Customers.
- Dashboard.
- Business workflows.
- Frontend application shell beyond what is needed for API testing.

## Completion gate

- Login and logout work.
- Public sign-up is rejected.
- Sessions are stored in the database.
- Session revocation takes effect immediately.
- Deactivated users lose access and their sessions are revoked.
- Role checks work.
- Capability grants work.
- Only Super Admin and Admin can create users or change roles.
- Security tests pass.
- Backend validation and build pass.

---

# 7. Phase 3 — Frontend Shell and Authentication

## Goal

Create the mobile-first application shell and connect it to backend authentication.

## Work

Implement:

- Better Auth client setup.
- Login page using email and password.
- Session-expired handling.
- Authenticated route group.
- Main application layout.
- Desktop sidebar.
- Mobile navigation.
- Header.
- User menu.
- Theme provider.
- Light and dark mode.
- TanStack Query provider.
- Central API client.
- Permission helpers for interface control only.
- Loading pages.
- Error pages.
- Not-found page.
- Basic responsive page container.

## Do not build

- Dashboard business data.
- Customer pages.
- Product pages.
- Other business modules.

## Completion gate

- Login works on mobile and desktop.
- Protected pages redirect correctly.
- A missing or revoked session returns the user to login.
- No custom token-refresh logic exists.
- Navigation works on small screens.
- Frontend lint, type check, tests, and build pass.

---

# 8. Phase 4 — Master Data

## Goal

Create the records required by later workflows.

## Backend and frontend modules

Implement:

- Customers.
- Customer addresses.
- Products.
- Measurement units.
- Raw materials.
- Suppliers.
- Employees.
- Drivers.
- Company vehicles.
- Hired vehicles.
- Settings.

## Product data

Include the confirmed initial product definitions:

- Hollow Blocks 6 × 9
- Hollow Blocks 4 × 9
- Hollow Blocks 9 × 9
- Hollow Pot 380 × 200 × 150 mm
- Hollow Pot 380 × 200 × 200 mm
- Hollow Pot 380 × 200 × 300 mm

Do not add a required fixed selling price to products.

## Caching

Cache master-data list and lookup queries, and invalidate them on every create,
update, activate, and deactivate.

Never cache a value a transaction acts on. See `docs/technical-blueprint.md`
section 4A.

## Demo data

Prepare a development-only seed process.

Demo data must:

- Be clearly marked.
- Be easy to remove.
- Never be inserted automatically in production.

## Completion gate

- Master records can be created, viewed, edited, activated, and deactivated as approved.
- Mobile forms work.
- Production seed does not add demo business records.
- Tests and builds pass.

---

# 9. Phase 5 — Quotations, Orders, and Customer Credit

## Goal

Implement customer sales preparation and order control.

## Modules

Implement:

- Quotations.
- Orders.
- Customer credit.

## Work

Implement:

- Quotation numbering.
- Quotation items.
- Customer-specific agreed prices.
- Price snapshots.
- Draft quotation editing.
- Quotation status changes.
- Quotation PDF.
- Direct orders.
- Orders from accepted quotations.
- Order numbering.
- Order items.
- Customer addresses on orders.
- Customer opening balances.
- Credit-status calculation.
- Credit thresholds:
  - NORMAL below KES 800,000.
  - WARNING from KES 800,000 to 899,999.
  - STRONG_WARNING from KES 900,000 to 999,999.
  - BLOCKED at KES 1,000,000 or above.
- New credit-order block.
- Admin and Super Admin override.
- Written override reason.
- Audit log.

## Do not add

- Discounts.
- VAT.
- Taxes.
- Fixed product pricing.

## Completion gate

- Historical price snapshots remain unchanged.
- Credit levels calculate correctly.
- Blocked credit orders are rejected.
- Fully paid orders may continue.
- Overrides are audited.
- PDFs use official saved information.
- Tests and builds pass.

---

# 10. Phase 6 — Production and Curing

## Goal

Implement production output, allocation, raw-material usage, and curing.

## Modules

Implement:

- Production.
- Curing.
- Broken products where required for this workflow.

## Work

Implement:

- Production numbering.
- Production for an order.
- Production for general stock.
- Pallet entry.
- Twelve pieces per pallet.
- Produced quantity calculation.
- Broken quantity.
- Usable quantity.
- Order allocation.
- Excess quantity.
- Production order allocation records.
- Actual raw-material usage.
- Two-day curing.
- Three-day curing.
- Minimum two-full-day release rule.
- Controlled change from three days to two days.
- Written reason.
- Audit log.
- Curing release.
- Order-allocated stock release.
- Excess release to general finished stock.
- Curing completion alerts.

## Completion gate

- Pallet calculations are correct.
- Early release is blocked.
- Duration changes are traceable.
- Excess production is not allocated incorrectly.
- Broken quantities are recorded.
- Raw-material usage is actual, not formula-based.
- Tests and builds pass.

---

# 11. Phase 7 — Raw Materials, Purchases, and Supplier Balances

## Goal

Implement raw-material stock and supplier financial tracking.

## Modules

Implement:

- Raw materials.
- Purchases.
- Purchase payments.
- Suppliers where remaining functions are needed.

## Work

Implement:

- Raw-material stock balance.
- Raw-material movement ledger.
- Opening raw-material quantity.
- Purchase numbering.
- Purchase items.
- Purchase receipt into stock.
- Supplier opening balances.
- Purchase-payment numbering.
- Purchase-payment records.
- Supplier outstanding balance.
- Purchase-payment history.
- Low-stock alerts only when reorder level exists.
- Stock adjustments with reasons and audit logs.

## Financial separation

Keep separate:

- Purchases.
- Purchase payments.
- General expenses.
- Salary payments.
- Customer payments.

## Completion gate

- Purchases increase raw-material stock.
- Actual production usage reduces stock.
- Opening balances remain traceable.
- Supplier balances calculate correctly.
- Purchase costs are not counted twice.
- Tests and builds pass.

---

# 12. Phase 8 — Finished Stock and Deliveries

## Goal

Implement finished-stock control and delivery trips.

## Modules

Implement:

- Finished stock.
- Deliveries.
- Vehicles.
- Drivers.
- Broken products where remaining functions are needed.

## Work

Implement:

- Opening finished stock.
- Physical stock.
- Reserved stock.
- Available stock.
- Stock movement ledger.
- Stock reservation.
- Delivery numbering.
- Partial delivery.
- Several trips for one order.
- One location per delivery.
- Vehicle assignment.
- Driver assignment.
- Company vehicle.
- Hired vehicle.
- Dispatch.
- Permanent stock reduction at dispatch.
- Pre-dispatch cancellation.
- Reservation release.
- Post-dispatch correction.
- Written correction reason.
- Audit log.
- Stock adjustments.

## Do not add

- Customer returns.
- Customer signatures.
- Delivery photographs.
- Delivery-proof uploads.

## Completion gate

- Planned delivery does not reduce physical stock.
- Reservation reduces available stock only.
- Dispatch reduces physical stock.
- Cancellation releases reservation.
- Post-dispatch corrections are traceable.
- Credit block prevents new deliveries unless properly overridden.
- Tests and builds pass.

---

# 13. Phase 9 — Invoices, Customer Payments, and Receipts

## Goal

Implement customer financial documents and payment control.

## Modules

Implement:

- Invoices.
- Customer payments.
- Receipts.

## Work

Implement:

- Strict one-order-to-one-invoice relationship.
- Invoice numbering.
- Invoice items from the order only.
- Invoice price snapshots copied from order items.
- Manual due date.
- Invoice PDF.
- M-Pesa payments.
- Cash payments.
- Bank-transfer payments.
- Cheque payments.
- Method-specific payment evidence.
- Payment numbering.
- Payment allocation.
- Payment approval.
- Payment reversal.
- Customer balance recalculation.
- Receipt numbering.
- Receipt creation after payment approval.
- Receipt PDF.
- Customer statements.
- Overdue-invoice alerts.
- Permanent payment evidence.

## Completion gate

- One order cannot create two invoices.
- One invoice cannot combine orders.
- Pending payments do not reduce balances.
- Approved payments reduce balances.
- Reversal restores balances.
- Receipts come only from approved payments.
- Tests and builds pass.

---

# 14. Phase 10 — Expenses and Salaries

## Goal

Implement general expenses and simple weekly or monthly salary payments.

## Modules

Implement:

- Expenses.
- Employees where remaining functions are needed.
- Salaries.

## Work

Implement:

- Expense numbering.
- Expense categories.
- Expense evidence.
- Weekly salary payments.
- Monthly salary payments.
- Salary numbering.
- Salary registration.
- Salary approval.
- Salary correction.
- Salary reversal.
- Written reason.
- Previous and updated information.
- Audit history.
- Accountant capability for salary registration where approved.

## Do not add

- Allowances.
- Salary advances.
- Deductions.
- Overtime.
- Bonuses.

## Completion gate

- Salary payments remain separate from expenses.
- Accountant cannot approve, correct, or reverse salaries.
- Corrections and reversals are traceable.
- Tests and builds pass.

---

# 15. Phase 11 — Dashboard, Reports, and Alerts

## Goal

Provide clear operational information without changing business records.

## Modules

Implement:

- Dashboard.
- Reports.
- Notifications.
- Audit-log viewing.

## Internal alerts

Implement:

- Low raw-material stock.
- Customer credit warning.
- Customer credit strong warning.
- Customer credit block.
- Customer payment waiting for approval.
- Curing completion.
- Overdue invoices.

## Reports

Implement approved operational reports for Accountant access:

- Orders.
- Production.
- Curing.
- Finished stock.
- Broken products.
- Raw-material stock.
- Purchases.
- Deliveries.
- Vehicles.
- Drivers.
- Customer operational history.

Do not give Accountant access to unapproved financial reports.

## Caching

Cache dashboard summaries, report results, and alert counts in Redis.

- Use short time-to-live values for financial and stock figures.
- Invalidate affected entries when the underlying records change.
- Reports and dashboards must never serve a figure that a transaction acts on.

## Do not add

- Automatic WhatsApp.
- Automatic SMS.
- Automatic customer email.
- Automatic website integration.

## Completion gate

- Dashboard is mobile responsive.
- Alerts do not duplicate unnecessarily.
- Permission-based report access works.
- Reports do not change business data.
- Cached dashboard and report values refresh when the underlying data changes.
- The system works correctly when Redis is unavailable.
- Tests and builds pass.

---

# 16. Phase 12 — Hardening and Production Preparation

## Goal

Prepare the approved MVP for safe real use.

## Work

Complete:

- Full automated tests.
- Security tests.
- Permission tests.
- Concurrency tests.
- Numbering tests.
- Stock tests.
- Balance tests.
- Payment tests.
- Salary tests.
- File validation tests.
- PDF tests.
- Mobile acceptance tests.
- Performance checks.
- Staging deployment.
- Production environment configuration.
- Database backup setup.
- File-storage backup setup.
- Restore testing.
- Production seed verification.
- Demo-data removal verification.
- Production setup screens.
- Deployment documentation.
- User training preparation.

## Production setup data

Enter later:

- Real company details.
- Real users.
- Real customers.
- Real employees.
- Real suppliers.
- Real drivers.
- Real vehicles.
- Real raw materials.
- Real measurement units.
- Real reorder levels.
- Real opening stock.
- Real opening balances.

## Completion gate

- No demo business records exist in production.
- Backups work.
- Restore test succeeds.
- Critical workflows pass.
- Mobile acceptance passes.
- Security review passes.
- Production deployment checklist is complete.

---

# 17. Phase Approval Format

Before implementation, Claude should provide:

## Proposed phase

- Phase number.
- Phase name.

## Files to create

- Exact file paths.

## Files to change

- Exact file paths.

## Dependencies

- Packages to add.
- Reason for every package.

## Database impact

- Schema changes.
- Migrations.
- Seed impact.

## Validation

- Commands that will be run.
- Tests that will be added.

## Excluded work

- Clear list of work not included in this phase.

Claude must wait for approval after presenting this plan.

---

# 18. Completion Report Format

After implementation, Claude must report:

## Completed scope

A short summary of completed work.

## Files created

Exact file paths.

## Files changed

Exact file paths.

## Commands run

All important validation commands.

## Results

- Lint result.
- Type-check result.
- Test result.
- Build result.

## Database changes

- Migration names.
- Seed changes.
- Data impact.

## Warnings

Any warnings or limitations.

## Not implemented

Anything intentionally excluded.

## Next phase

Name only. Do not start it automatically.
