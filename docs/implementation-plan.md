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
| 4A | Master data — Products and shared UI patterns | COMPLETED |
| 4B | Master data — Customers and customer addresses | COMPLETED |
| 4C | Master data — Employees, Drivers, and Vehicles | COMPLETED |
| 4D | Master data — Suppliers, Company Settings, and development demo seed | COMPLETED |
| 5A | Quotations | COMPLETED |
| 5B | Orders and customer credit | NOT_STARTED |
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
- Redis cache infrastructure. Delivered as a Phase 1 addendum before Phase 4,
  since there is no business data to cache until then.
  - Official `redis` package (node-redis).
  - `REDIS_URL` optional. Empty disables caching safely.
  - Cache-aside pattern with a required TTL on every value.
  - Versioned, environment-namespaced keys.
  - A cache failure never fails a request, liveness, or readiness.
  - Readiness may report the cache as `degraded` while staying ready.
  - Infrastructure only. No business data is cached in this phase.

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

Phase 4 is split into four approved sub-phases, 4A–4D, so each ships and is
reviewed as a focused, independent change rather than one large one. This
split is now the approved record of Phase 4 — do not collapse it back into a
single undivided phase.

`RawMaterial` and `MeasurementUnit` are **deferred out of Phase 4 entirely**.
They remain in the approved MVP scope (business-blueprint sections 2.12–2.14,
technical-blueprint section 4.9) and return together with raw-material stock,
in the phase that needs them (Phase 7, "Raw materials, purchases, and
supplier balances"). Do not implement them as part of 4A–4D.

## Phase 4A — Products and shared UI patterns (COMPLETED)

Backend module: `products`.

Included the confirmed initial product definitions:

- Hollow Blocks 6 × 9
- Hollow Blocks 4 × 9
- Hollow Blocks 9 × 9
- Hollow Pot 380 × 200 × 150 mm
- Hollow Pot 380 × 200 × 200 mm
- Hollow Pot 380 × 200 × 300 mm

No required fixed selling price on products, per business-blueprint section 2.4.

Also established the shared frontend design system every later master-data
module reuses: the page header, connected summary-metrics card, status tabs,
search/filter toolbar, responsive data table with mobile cards, and the
Dialog-on-desktop / Sheet-on-mobile form pattern.

## Phase 4B — Customers and customer addresses (COMPLETED)

Backend module: `customers` (addresses live inside it, per
technical-blueprint section 3.3 — a customer's building sites have no module
of their own).

Applied the Phase 4A design system to the Customers list, detail, and
add/edit form.

## Phase 4C — Employees, Drivers, and Vehicles (COMPLETED)

Backend modules: `employees`, `drivers`, `vehicles` — three separate modules,
each with the required six files.

### Employees (COMPLETED)

Fields: name, phone, optional Kenyan ID number, job title, salary frequency
(`WEEKLY` or `MONTHLY`), salary amount, payment method, active status. See
business-blueprint section 2.28. Shipped and unaffected by the Driver/Vehicle
revision below.

### Drivers and employees are separate (revised)

A driver is **not** automatically a Greenstone employee. The two remain
independent master-data modules — do not add salary or employee fields to
Driver.

Fields: name, phone, national ID number, active status.

- `nationalId` is **required**. Stored as two columns, following the same
  pattern as Customer phone/email and Product name: `nationalId` (trimmed,
  the readable value shown on screen) and `nationalIdNormalized` (trimmed,
  uppercased, internal whitespace collapsed — this is the column with the
  `@unique` constraint, and is what the duplicate check actually compares).
  Editing a record never silently turns it into a duplicate of another —
  the same availability check runs on update as on create, excluding the
  record's own id.
- `phone` uses the same permissive validation as everywhere else in the
  system.

### Vehicles — hired-only for the MVP (revised)

Greenstone currently does not own any vehicles. For the MVP:

- Every registered vehicle is treated as hired.
- The frontend does not offer a `COMPANY` ownership choice.
- The `ownershipType` column and its `COMPANY`/`HIRED` enum stay in the
  schema, defaulted to `HIRED` and not exposed as a request field, so company
  vehicles can be added later without a schema migration.

Fields: registration number (unique), vehicle type, truck length, truck
width, truck height, calculation factor, calculated load (kg), calculated
load (tonnes), active status.

`hireCost` is **removed** from the Vehicle master. This does not mean hire
cost is out of business scope — it means a vehicle does not have one
permanent hire cost. Actual transport cost varies per delivery trip, and will
be captured later in the approved Delivery, Expense, or transport-payment
workflow, not invented as a rate or formula now. Vehicle payment tracking
returns only when that workflow is approved, likely alongside
Purchases/Supplier payments.

### Truck load calculation (revised — dimensions are now required)

New approved rule, captured here because it is not yet in the business or
technical blueprint:

```text
calculatedLoadKg = truckLength × truckWidth × truckHeight × calculationFactor
calculatedLoadTonnes = calculatedLoadKg ÷ 1000
```

- Dimensions are entered in metres, and are **required** on every vehicle
  (the original draft made them optional — every vehicle now needs a known
  load capacity).
- Default `calculationFactor` is 1100, **backend-controlled**. The normal
  vehicle form cannot change it — the UI may show it read-only, but the value
  a vehicle is saved with always comes from the backend constant, never from
  a request field. The backend remains the sole authority for the official
  calculation; anything the frontend computes before saving is a preview
  only.
- Length, width, height, factor, kilograms, and tonnes are all stored as a
  snapshot on the vehicle record.
- All dimensions and the factor must be greater than zero, and — new,
  following a production bug — capped at a realistic maximum (50 metres per
  dimension) so a data-entry slip cannot produce a load figure that overflows
  the database column and surfaces as a raw server error instead of a
  validation message.
- Calculations are decimal-safe (no floating-point money or measurement math).
- No payment-rate or payable-amount formula is derived from this — load
  capacity only.
- A future change to the default factor must not change any previously saved
  vehicle's stored figures.

### Driver and vehicle relationship (new)

Do not add `driverId` or `usualDriverId` on Vehicle, required or optional.
Driver and Vehicle remain fully independent master records in Phase 4C — one
driver may use many vehicles, one vehicle may use many drivers, and nothing
here decides that pairing.

When Phase 8 (Deliveries) is built, the Delivery record selects one Driver
and one Vehicle **per trip**, and must preserve a full snapshot of the
selection, not just the two ids — because a vehicle's dimensions or a
driver's details could change later, and a past delivery's record must not
silently change with them:

- `driverId`
- `vehicleId`
- vehicle registration number (snapshot)
- truck dimension snapshots (length, width, height)
- calculation factor snapshot
- calculated load kilograms snapshot
- calculated load tonnes snapshot

This is documentation only — no Delivery model exists yet.

The approved future relationship, once Deliveries (Phase 8) exists:

- One Delivery belongs to one Driver and one Vehicle.
- One Driver may be used on many deliveries; one Vehicle may be used on many
  deliveries.
- Different drivers may use the same vehicle on different trips, and the same
  driver may use different vehicles — the pairing is chosen per delivery, not
  fixed on the vehicle record.

An optional `usualDriverId` convenience field on Vehicle may be considered
later, but it must never become a permanent ownership relationship, and it is
explicitly **not part of the MVP** — do not build it now.

Frontend follows the Phase 4A/4B design system: page header, connected
summary metrics (Total/Active/Inactive), status tabs, search toolbar,
responsive table with mobile cards, and Dialog/Sheet add-edit forms.

## Phase 4D — Suppliers, Company Settings, and development demo seed (COMPLETED)

Backend modules: `suppliers`, `settings`.

### Suppliers

Master record only, per business-blueprint section 2.16. Opening balances,
purchases, and purchase payments (sections 2.17–2.18) are Phase 7, once
raw-material stock exists for a purchase to receive into.

Fields: name, phone (required, unique), email (optional, unique when
present), address (optional, free text), active status.

`phone`/`email` follow the same dual-column normalisation as Customer
phone/email. `address` is descriptive text only — not normalised, not unique.
Per the pre-declared permission map, super_admin, admin, and accountant may
all create, read, and update suppliers (no permission changes were needed —
`supplier` was already granted before this phase, the same situation Phase 4C
found for `employee`/`driver`/`vehicle`).

### Company settings

A **singleton** — one `CompanySettings` row, fixed at `SETTINGS_ROW_ID` in
`settings.repository.ts`. There is no create or delete endpoint, only
`GET /api/v1/settings` and `PATCH /api/v1/settings`.

Fields: company name, address, phone, email, payment details, footer notes —
all optional, since real company data is unknown during development
(business-blueprint section 9.5) and is entered later, during production
setup. **Logo is excluded** — it needs the file-storage architecture
(technical-blueprint section 8), which does not exist yet.

`settings` is granted to super_admin and admin only — the Accountant has no
`settings` permission at all (business-blueprint section 5.3), so an
Accountant request is refused before it reaches the service. Every update
writes an audit log in the same transaction (technical-blueprint section
7.3 requires this for settings changes). Reads are cached as a master-data
lookup; a missing row is created with blank values on first read, so the rest
of the system never has to handle "no settings yet" as a special case.

### Development demo seed

`prisma/seed/development/index.ts` is implemented (previously a placeholder
that threw). It seeds clearly marked demo records — every name prefixed
"Demo " — for the master-data modules that existed with none: Customers,
Employees, Drivers, Vehicles, Suppliers. Products are not seeded here; the
confirmed initial product definitions are real system data, created by the
production seed instead.

Every demo record uses a fixed identifying value (phone, national ID, or
registration number), so re-running the seed finds the existing row and skips
it rather than creating a duplicate.

The seed refuses to run if `NODE_ENV=production`, or if `DATABASE_URL`'s
database name contains "prod" — defence in depth, the same approach
`tests/setup/global-setup.ts` uses for the test database.

### Production seed

`prisma/seed/production/index.ts` now also creates the one required
company-settings row (blank, per "required system settings" in
business-blueprint section 4.3), alongside the confirmed product definitions
it already seeded. Idempotent, like the rest of the production seed.

## Caching

Cache master-data list and lookup queries, and invalidate them on every create,
update, activate, and deactivate.

Never cache a value a transaction acts on. See `docs/technical-blueprint.md`
section 4A.

## Completion gate

Per sub-phase:

- Master records can be created, viewed, edited, activated, and deactivated as approved.
- Mobile forms work.
- Production seed does not add demo business records.
- Tests and builds pass.

---

# 9. Phase 5 — Quotations, Orders, and Customer Credit

## Goal

Implement customer sales preparation and order control.

Split into two approved sub-phases, mirroring Phase 4's A–D split, so each
ships and is reviewed as a focused, independent change:

- **Phase 5A — Quotations (COMPLETED).**
- **Phase 5B — Orders and Customer Credit (COMPLETED).**

## Phase 5A — Quotations (COMPLETED)

Backend module: `quotations`. New shared infrastructure: `shared/documents/`
(the "generate and persist an official PDF" pipeline), and the real
Playwright PDF renderer (`shared/pdf/renderers/playwright.renderer.ts`),
replacing the Phase 1 stub. See business-blueprint sections 2.4 and 2.5.

### Quotation and QuotationItem

Fields: quotation number (from the pre-existing `QUOTATION` numbering
sequence), customer, status (`DRAFT`/`ACCEPTED`/`REJECTED`/`CANCELLED`),
total amount, an optional written status reason. Items: product, quantity
(whole number), agreed unit price, line total.

Rules:

- Only `DRAFT` quotations may be edited. Every other status change is a
  one-way, explicit service action (accept/reject/cancel), never a plain
  field update. Allowed transitions: `DRAFT → ACCEPTED | REJECTED |
  CANCELLED`, `ACCEPTED → CANCELLED`. `REJECTED` and `CANCELLED` are
  terminal.
- A quotation must contain at least one item.
- The backend calculates every `lineTotal` (`quantity × agreedUnitPrice`)
  and `totalAmount` (sum of line totals) using `Prisma.Decimal` — never
  trusted from a request, never JavaScript floating-point arithmetic.
- Creation runs in one transaction: allocate the yearly number, create the
  quotation and its items, save the calculated totals, write the audit log.
  Any failure rolls back the whole transaction, including the number.
- Before create or update, the service confirms the customer exists and is
  active, and every product exists and is active.
- Quotations are never deleted, only moved through the four statuses.
- Rejection and cancellation accept an optional written reason.

### Quotation PDF (not deferred — approved as part of 5A)

Unlike the original draft plan, quotation PDF generation is part of this
sub-phase, not deferred to Phase 9. Building it now meant discovering and
completing shared infrastructure that Phase 1 had deliberately scaffolded but
left unfinished for this exact moment:

- `shared/storage/` (file metadata, local filesystem provider, checksums,
  MIME/size validation) already existed and needed no changes.
- `shared/pdf/` existed with only a stub renderer that always threw, whose
  own comment said "the real renderer arrives in Phase 5 with the first
  official PDF." `PlaywrightPdfRenderer` now implements it; `PDF_RENDERER`
  defaults to `playwright`.
- Two new tables were added: `stored_files` (file metadata) and
  `generated_documents` (the explicit relation table linking a business
  record to its official PDF, restricted by `GeneratedDocumentType` to
  `QUOTATION`/`INVOICE`/`RECEIPT` — business-blueprint section 9.1: "Other
  PDFs must not be added unless approved").
- `shared/documents/` is the new, reusable "generate and persist an official
  PDF" pipeline: render, decide whether a new version is needed (the source
  record's `updatedAt` newer than the latest version's `generatedAt` — not a
  checksum comparison, since Chromium's own embedded timestamp makes two
  renders of identical input never byte-identical), store the file, record
  the `GeneratedDocument`/`StoredFile` metadata, and write an audit log — all
  inside one transaction. Built generically so Phase 9 reuses it for
  Invoices and Receipts without rework.
- `GET /quotations/:id/pdf` downloads the PDF. A browser-printable detail
  page also exists, but does not replace the official backend-generated PDF.

### API

`GET /quotations`, `GET /quotations/:id`, `GET /quotations/:id/pdf`,
`POST /quotations`, `PATCH /quotations/:id`, `POST /quotations/:id/accept`,
`POST /quotations/:id/reject`, `POST /quotations/:id/cancel`. No permanent-
delete endpoint.

### Frontend

A full page, not a Dialog — the multi-item form needs more room than the
master-data Dialog/Sheet pattern. Customer and product pickers use
`SearchableSelect` (already built in an earlier phase, unused until now).
Repeatable items use a new generic `components/forms/item-row-list.tsx`,
written for reuse when Orders (5B) needs the same pattern. Frontend-computed
line totals and the quotation total are a preview only — the backend total
is what gets saved.

### Excluded from 5A

Orders, customer credit, customer opening balances, credit overrides,
invoices, customer payments, receipts, discounts, VAT, taxes.

## Phase 5B — Orders and Customer Credit (COMPLETED)

Backend modules: `orders` and `customer-credit` (a separate module from
`customers`, matching the separately-declared `customer-credit` permission
resource). See business-blueprint sections 2.6, 2.24, 2.25, and
docs/database-notes.md for the table-level design notes.

Migration `20260802130000_phase5b_orders_customer_credit` applied to
`greenstone_dev` via `prisma migrate deploy` (confirmed via `prisma migrate
status` → "Database schema is up to date!"). Full backend suite —
**423/423 tests passing**, re-run twice to confirm stability — no flakes.
Frontend `typecheck`/`lint`/`build` all clean.

A real bug was found and fixed via live testing after this phase was first
written up: order creation returned a 500 because the migration had not yet
been applied to the dev database (MySQL was unreachable during the original
implementation session; this session confirmed it was up and ran the
deferred `prisma migrate deploy` and test suite).

### Order and OrderItem

Fields: order number (from the pre-existing `ORDER` numbering sequence),
customer, customer address (both a live FK and a text snapshot —
`addressLabel`/`addressLine`/`addressDirections` — captured at creation, per
schema.prisma's existing Phase 5 note that an order must snapshot the
address text), optional source quotation (unique — enforces "one quotation
may create at most one order"), `paymentType` (`CASH`/`CREDIT`), total
amount. Items: product, quantity, agreed unit price, line total, plus
`producedQuantity`/`allocatedQuantity`/`deliveredQuantity`/
`remainingQuantity` — part of the approved entity but only written by later
phases (Production: Phase 6, Delivery: Phase 8), added now and defaulted so
those phases need no further migration.

Orders have **no status lifecycle** in this phase — the `order` permission
resource only grants `create`/`read`/`update`, and neither blueprint document
describes an order-level accept/reject/cancel transition. Orders are never
deleted.

The backend calculates every `lineTotal` and `totalAmount` using
`Prisma.Decimal`, the same as quotations — including when converting from a
quotation, where the source item's price is trusted as an input, not copied
as an already-final total.

### Creating an order

One endpoint, two shapes, confirmed with you during planning:
`POST /orders` accepts either `{ sourceQuotationId, customerAddressId,
paymentType, creditOverrideReason? }` (conversion — items are copied from the
quotation) or `{ customerId, customerAddressId, paymentType, items,
creditOverrideReason? }` (direct). The source quotation must be `ACCEPTED`
and not already converted. Before create, the service confirms the customer
exists and is active, every product exists and is active, and the address
belongs to that customer and is active — the same integrity checks Phase 5A
established for quotations.

### Customer credit

`CustomerOpeningBalance`: one row per customer (unique `customerId`),
corrected in place — confirmed with you during planning — rather than
accumulated as history rows, with full before/after history in the audit
log, the same pattern `CompanySettings` uses for its own singleton
corrections. `PATCH /customers/:id/opening-balance`
(`customer-credit:set-opening-balance`, Admin/Super Admin only).

`GET /customers/:id/credit-status` (`customer-credit:read`) computes credit
status live — **never cached, never stored on `Customer`** — using the
interim formula agreed during Phase 5A planning: `opening balance + the
customer's CREDIT orders`. Every order counts as "not-yet-invoiced" today
because Invoices do not exist yet (Phase 9); this switches to the real
`opening balance + issued invoices − approved payments` formula once they
do. The sum is read directly from the `orders` table by the `customer-credit`
module's own repository (a plain aggregate query) rather than through a
cross-module call into `orders` — this keeps the dependency one-directional
(`orders` depends on `customer-credit` for its check; `customer-credit` never
depends back), avoiding a circular module dependency that a
call-the-other-module's-service design would have created.

Credit thresholds: NORMAL below KES 800,000; WARNING KES 800,000–899,999;
STRONG_WARNING KES 900,000–999,999; BLOCKED at KES 1,000,000 or above.
WARNING/STRONG_WARNING are informational only — they never block an order.
`CASH` orders skip the credit check entirely, since a fully paid order may
proceed even when the customer is credit-blocked. The check reads the
customer's *current* status, not a hypothetical status including the new
order's own amount.

`CustomerCreditOverride`: append-only. When a `CREDIT` order would be blocked,
the caller may resubmit `POST /orders` with `creditOverrideReason` set; the
service checks `customer-credit:override` (Admin/Super Admin only), and if
allowed, writes the order, the override record, and its own audit entry
(`OVERRIDE_CUSTOMER_CREDIT`) in the same transaction as the order.

### Frontend

`features/orders/` follows the Phase 5A Quotations pattern — a full page for
`/orders/new`, reusing `SearchableSelect` and `components/forms/
item-row-list.tsx`. One form component handles both creation shapes: when
opened with `?sourceQuotationId=`, it fixes the customer, shows the copied
items read-only, and hides item entry; otherwise it behaves like the
quotation form. A "Convert to order" button appears on an `ACCEPTED`
quotation's detail page. `features/customers/` gained a credit-status card
and an opening-balance dialog on the customer detail page, and
`lib/permissions.ts` gained `canSetOpeningBalance` alongside the existing
`canOverrideCredit`. `Orders` is flipped to `available: true` in
`nav-items.ts`.

### Excluded from 5B

Invoices, customer payments, receipts (Phase 9). Purchases, purchase
payments, raw materials (Phase 7). Production, curing, finished-stock
reservation (Phase 6). Deliveries, driver/vehicle pairing (Phase 8) —
Driver/Vehicle remain independent master records, as already decided in
Phase 4C. Discounts, VAT, taxes, fixed product pricing (never). The real
invoice-based credit formula (the Phase 9 switch-over noted above). Any
order-level status lifecycle (cancel, void) — not described by either
blueprint document for this phase.

## Do not add (either sub-phase)

- Discounts.
- VAT.
- Taxes.
- Fixed product pricing.

## Completion gate

Per sub-phase:

- Historical price snapshots remain unchanged.
- Credit levels calculate correctly (5B).
- Blocked credit orders are rejected (5B).
- Fully paid orders may continue (5B).
- Overrides are audited (5B).
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
