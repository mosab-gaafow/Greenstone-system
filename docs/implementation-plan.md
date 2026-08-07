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
| 5A | Quotations (removed from plan 2026-08-02 — built, code removed in Phase 6C-3) | COMPLETED |
| 5B | Orders and customer credit | COMPLETED |
| 6A | Raw-material and finished-stock foundations | COMPLETED |
| 6B | Production and curing | COMPLETED |
| 6C-1 | Quotation and Order data audit | COMPLETED |
| 6C-2 | Direct Order foundation (status, paymentArrangement) | COMPLETED |
| 6C-3 | Safe Quotation removal | COMPLETED |
| 6D | Product operational names, pieces per pallet, and truck capacity | COMPLETED |
| 6E | Customer credit projection formula and balance filters | COMPLETED |
| 6F | Vehicle Owners; rework Vehicle | COMPLETED |
| 7A | Supplier opening balances and balance display | COMPLETED |
| 7B | Raw-material reference data (Cement, Dust, Pumice; Sack, Cubic Metre, Tonne) | COMPLETED |
| 7C | Purchases module (Pumice/Cement calculations, raw-material receipt) | COMPLETED |
| 7D | Purchase payments module (allocations, approval, reversal) | COMPLETED |
| 8 | Finished stock (deliveries; transport payment, truck-trip count) | NOT_STARTED |
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

## Phase 5A — Quotations (COMPLETED; removed from the plan 2026-08-02)

**This sub-phase's scope is no longer part of the approved system.** New
confirmed company information (2026-08-02) removed Quotations entirely — see
`docs/decisions/business-workflow-update-2026-08-02.md`. Everything below is
left unedited as an honest record of what was actually built and shipped at
the time; it does not describe current or future scope. The quotations
module, its tables, its PDF, and its tests still exist in the codebase today
and have not been touched — removing them is its own future sub-phase, Phase
6C, below.

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

**Superseded 2026-08-02:** the "current status, not including the new order's
own amount" behaviour above is a reversal target — the new confirmed rule
requires the projection to explicitly include the new credit order's own
total (`docs/decisions/business-workflow-update-2026-08-02.md` section 6).
Also, `CASH` is renamed `PREPAID` going forward — see Phase 6C-2/6E below. This
paragraph is left as an honest record of what 5B actually built.

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

# 10. Phase 6 — Raw Materials, Finished Stock, Production, and Curing

## Goal

Implement production output, allocation, raw-material usage, and curing.

Split into two approved sub-phases — the same A/B pattern Phases 4 and 5
used — because Production/Curing cannot honestly satisfy business-blueprint
2.7/2.8 without a real raw-material ledger and a real finished-stock ledger
already existing:

- **Phase 6A — Raw-Material and Finished-Stock Foundations (COMPLETED).**
- **Phase 6B — Production and Curing (COMPLETED).**

New confirmed company information (2026-08-02) added four further sub-phases
under the same Phase 6 umbrella, continuing the lettering after 6B rather than
renumbering the plan — see
`docs/decisions/business-workflow-update-2026-08-02.md` for the full record.
Phase 6C was judged too large for one focused change and is itself split into
three smaller steps, 6C-1–6C-3, following the same sub-lettering approach
already used for Phase 4 (4A–4D) and Phase 5/6 (5A/5B, 6A/6B):

- **Phase 6C-1 — Quotation and Order Data Audit (COMPLETED).** Read-only
  inspection and report. No code, no migration, no deletion.
- **Phase 6C-2 — Direct Order Foundation (COMPLETED).** `Order.status`,
  `paymentArrangement` rename, cancellation action. Does not touch Quotation
  code.
- **Phase 6C-3 — Safe Quotation Removal (COMPLETED).** Removed the
  Quotation module, tables, and related code, after 6C-1 confirmed it was
  safe and 6C-2's `sourceQuotationId` removal had landed.
- **Phase 6D — Product operational names, pieces per pallet, and truck
  capacity (COMPLETED).** Added `Product.operationalName`/
  `piecesPerPallet`/`maxPiecesPerTruck`; removed the old global
  "12 pieces per pallet" rule from Production.
- **Phase 6E — Customer credit projection formula and balance filters
  (COMPLETED).** Split accounting outstanding balance from projected credit
  exposure; added the customer-list balance filter.
- **Phase 6F — Vehicle Owners; rework Vehicle (COMPLETED).** New
  `vehicle-owners` module; `Vehicle` now requires a registered, active
  owner instead of `ownershipType`; the Phase 4C volumetric truck-load
  calculation removed entirely.

## Phase 6A — Raw-Material and Finished-Stock Foundations (COMPLETED)

Pulled forward from their nominally-numbered phases (Raw Materials from
Phase 7, Finished Stock from Phase 8) — the pre-declared `raw-material`,
`raw-material-stock`, and `finished-stock` permission resources already
anticipated this, the same way `customer-credit` was pre-declared ahead of
Phase 5B. See docs/database-notes.md for the table-level design notes.

Backend modules: `measurement-units`, `raw-materials` (master data + its own
stock balance/movement ledger — one module, per technical-blueprint 3.3),
`finished-stock` (balance/movement ledger, keyed by product), and
`broken-products` (append-only, decrements finished stock automatically at
the `FINISHED_STOCK` stage).

### Raw materials and their stock ledger

`MeasurementUnit` and `RawMaterial` master data (business-blueprint
2.12–2.14), each raw material getting a zero-balance `RawMaterialStockBalance`
row at creation. `RawMaterialMovement` is the ledger — `OPENING`,
`POSITIVE_ADJUSTMENT`, `NEGATIVE_ADJUSTMENT` write today;
`PRODUCTION_USAGE` (Phase 6B) and `PURCHASE_RECEIPT` (Phase 7) reuse the same
enum and table without a migration of their own. Quantities allow up to
three decimal places — raw materials are frequently fractional, unlike
finished-product pieces. Balance updates always run inside a transaction
holding a row lock (`lockRowsForUpdate`, built in Phase 1 for exactly this).

### Finished stock and its ledger

`FinishedStockBalance` (physical/reserved/available, all three stored per
technical-blueprint 4.7), created lazily per product the same way
`company_settings`' singleton row is. `FinishedStockMovement` is the ledger
— `OPENING`, `POSITIVE_ADJUSTMENT`, `NEGATIVE_ADJUSTMENT`, `BROKEN` write
today; `CURING_RELEASE`/`GENERAL_STOCK_RELEASE` (Phase 6B) and
`DELIVERY_DISPATCH` (Phase 8) reuse the same table. `reservedQuantity` stays
at 0 until Phase 8's Stock Reservation exists.

### Broken products

`BrokenProductRecord` across all four approved stages
(`PRODUCTION`/`CURING`/`FINISHED_STOCK`/`DELIVERY`), but only
`FINISHED_STOCK` has a real ledger effect today — recording one also
decrements physical finished stock in the same transaction. The other three
stages are recorded structurally now; Phase 6B and Phase 8 will call the
same insert function from inside their own transactions once production
batches, curing records, and deliveries exist to reference.

### Never cached

Raw-material and finished-stock availability are read from MySQL on every
request, per docs/technical-blueprint.md section 4A.3 — only the
`raw-materials`/`measurement-units` master-data lists are cached.

### Excluded from 6A

Purchases, purchase payments, supplier balances (Phase 7 — will add the
`PURCHASE_RECEIPT` writer on top of this ledger). Stock reservation,
delivery dispatch (Phase 8 — will add the `DELIVERY_DISPATCH` writer and
reservation logic on top of this ledger). Low-stock/curing-completion
alerts, any notification persistence (Phase 11 — `reorderLevel` is stored
now, but nothing reads it yet). Production and Curing themselves (Phase 6B).

## Phase 6B — Production and Curing (COMPLETED)

Backend modules: `production` and `curing` (technical-blueprint 3.3 lists
them separately). Both extend the ledgers `raw-materials`/`finished-stock`
already built in Phase 6A, and reuse `broken-products` for breakage records.
See docs/database-notes.md for the table-level design notes.

### Production

`POST /production` creates the batch, its items, and (per item) an
automatically-started `CuringRecord` — there is no separate "begin curing"
endpoint — all in one transaction: allocate the yearly `PRD-YYYY-####`
number, insert the batch and items, start curing for every item, credit the
order (when this batch is for one), record raw-material usage against the
Phase 6A ledger, and record any production-stage breakage. Any failure rolls
back all of it.

`allocatedQuantity`/`excessQuantity` computed at this point are the
**planned** split against the order — the split actually credited to
finished stock is computed at curing release, since further breakage may
occur during curing. The allocation cap is `orderItem.quantity −
orderItem.producedQuantity` (how much this order item still needs
*produced*), not `remainingQuantity` (delivery's concern, Phase 8). A
purpose-`ORDER` batch requires every item's product to already be on the
referenced order — rejected otherwise, not silently treated as excess.

No update or delete route: a production run, once recorded, is never edited
— only curing moves it forward.

### Curing

A curing record's release requires `now >= plannedCompletion`, using
whichever duration is currently selected — not a separate "two full days
from the original start" floor. `TWO_DAYS` is already the shortest
selectable duration, which is what makes it the absolute floor; the only way
to release a `THREE_DAYS` record before the full three days is the explicit,
audited `PATCH /curing/:id/change-duration` action (Admin/Super Admin only,
written reason required, one-directional — three to two, never back).

`POST /curing/:id/release` uses the `CURING_RELEASE` **capability**
(`requireCapability`, built in Phase 2, unused until this phase) instead of
a plain role permission: Admin/Super Admin always pass; an Accountant passes
only with a capability grant. Release computes `releasedQuantity =
quantityEntering − brokenQuantity` (breakage discovered during curing — a
second, separate capture point from the production item's own broken
quantity), splits it as `orderPortion = min(allocatedQuantity,
releasedQuantity)` / `excessPortion = releasedQuantity − orderPortion`
(curing breakage hits the excess portion first, protecting the customer's
committed quantity — my interpretation, not a stated rule), credits finished
stock with two movements (`CURING_RELEASE`/`GENERAL_STOCK_RELEASE`), credits
`OrderItem.allocatedQuantity` for the order portion, and marks the
production batch `COMPLETED` once every item's curing has been released.

## Completion gate

- Pallet calculations are correct.
- Early release is blocked.
- Duration changes are traceable.
- Excess production is not allocated incorrectly.
- Broken quantities are recorded.
- Raw-material usage is actual, not formula-based.
- Tests and builds pass.

### Excluded from 6B

Purchases (Phase 7), stock reservation/delivery dispatch (Phase 8),
curing-completion alerts and any notification persistence (Phase 11 —
`plannedCompletion` is stored, nothing reads it yet for alerting).

## Phase 6C — Remove Quotations; rework Order (split into three steps)

Phase 6C is too large for one focused, reviewable change. It is split into
three sub-steps, the same way Phase 4 split into 4A–4D and Phase 6 split into
6A/6B — each ships and is approved independently. See
`docs/decisions/business-workflow-update-2026-08-02.md` sections 1, 4, 5, and
12 for the full confirmed rules behind this scope.

**None of 6C-1, 6C-2, or 6C-3 are planned or approved for implementation
yet.** This section records expected scope only.

### Phase 6C-1 — Quotation and Order Data Audit (COMPLETED)

**Read-only. No code, no migration, no deletion.** Produced a report only.

**Findings (2026-08-02):** 3 quotations, 4 quotation items, 0 orders with
`sourceQuotationId` set, 1 `GeneratedDocument` (type `QUOTATION`), 1 stored
PDF file (30,930 bytes), `QUOTATION` document sequence at year 2026/last
number 3, `Order.paymentType` distribution 3 `CASH`/0 `CREDIT`, 3 total
orders. All 3 quotations were confirmed by the business owner as development
test data — not production records, safe to remove in Phase 6C-3. The
highest-risk scenario (an order referencing a quotation) did not occur.

Inspect and report:

- Quotation row count.
- `QuotationItem` row count.
- `Order` rows with `sourceQuotationId` not null (count, and enough detail
  to identify which orders — order number, customer, date).
- `GeneratedDocument` rows of type `QUOTATION` (count, and whether any are
  recent/likely real rather than test data).
- Stored quotation PDF files on disk (via `stored_files` metadata linked to
  those `GeneratedDocument` rows) — count and total size.
- `DocumentSequence` rows for the `QUOTATION` document type (last allocated
  number, year).
- Existing `Order.paymentType` value distribution (`CASH` vs `CREDIT` counts).
- Existing `Order` row count (baseline, so 6C-2's rename can be sanity-checked
  afterward — same row count before and after).

Rules:

- Do not delete anything.
- Do not create a migration.
- Do not edit application code.
- If any linked or important records exist (real, non-demo quotations;
  orders actually converted from a quotation; real stored PDF files), report
  them clearly and explicitly flag them for a human decision before 6C-3
  proceeds.

Gate: 6C-3 may not begin until this report exists and confirms removal is
safe, or until a human has explicitly decided how to handle whatever unsafe
records were found.

### Phase 6C-2 — Direct Order Foundation (COMPLETED)

Migration `20260802160000_phase6c2_direct_order_foundation` applied to
`greenstone_dev` (`prisma migrate deploy`, confirmed via `prisma migrate
status` → "Database schema is up to date!"). All 3 existing orders backfilled
correctly (`CASH` → `PREPAID`, `status` defaulted to `PENDING`). Backend
**499/499 tests passing** (one pre-existing, unrelated flaky test in
`finished-stock.test.ts` — confirmed by re-running that file alone and the
full suite again, both clean). Backend and frontend `typecheck`/`lint`/build
all clean; frontend `build` generated all 26 routes.

Depended on nothing from 6C-1 except the `Order.paymentType` value snapshot
(informational only — 6C-2 proceeded regardless of 6C-1's findings, since it
does not touch Quotation data). Did not touch Quotation code at all.

Implemented:

- Rename `Order.paymentType` → `Order.paymentArrangement`.
- Change existing `CASH` values to `PREPAID`.
- Keep existing `CREDIT` values as `CREDIT`.
- Add `Order.status` (`OrderStatus` enum): `PENDING`, `IN_PRODUCTION`,
  `CURING`, `READY_FOR_DELIVERY`, `PARTIALLY_DELIVERED`, `COMPLETED`,
  `CANCELLED` (per the confirmed lifecycle,
  `docs/decisions/business-workflow-update-2026-08-02.md` section 12.3).
- Every new Order starts as `PENDING`. Reject a client-supplied `status` on
  both creation and update — the field is never accepted from a request
  body.
- **Do not create a generic status-update endpoint.** There is no
  `PATCH /orders/:id/status` accepting an arbitrary target value.
- Remove `Order.sourceQuotationId`/`sourceQuotationItemId` and the
  quotation-conversion API shape (`POST /orders` accepting
  `sourceQuotationId`) — **only after Phase 6C-1 confirms there are no unsafe
  linked records.** Direct order creation (`{ customerId, customerAddressId,
  paymentArrangement, items, creditOverrideReason? }`) becomes the only
  creation shape.
- Add an explicit `POST /orders/:id/cancel` action. Cancellation requires a
  written reason and writes an audit log, matching the pattern already used
  for Quotation rejection/cancellation (Phase 5A) and Curing duration changes
  (Phase 6B).

During 6C-2, implement real service actions only for:

- `PENDING` — set automatically at creation, never chosen.
- `CANCELLED` — set only through the explicit cancellation action.

The other five statuses belong to later workflows and must not be settable
by a user request in this phase:

- Production sets `IN_PRODUCTION` (Phase 6B's existing module, revisited
  later to write this status — not part of 6C-2's own scope).
- Curing sets `CURING`.
- Finished-stock/curing release sets `READY_FOR_DELIVERY`.
- Delivery sets `PARTIALLY_DELIVERED`.
- Full delivery sets `COMPLETED`.

This phase keeps direct Order creation only — no quotation-conversion shape
remains once this phase and 6C-1's confirmation are both complete.

### Phase 6C-3 — Safe Quotation Removal (COMPLETED)

Gated on Phase 6C-1's report confirming removal was safe (0 orders
referenced a quotation; the 3 quotations/4 items/1 generated PDF were
confirmed development test data), and on Phase 6C-2 having already removed
`Order.sourceQuotationId`. Migration
`20260802170000_phase6c3_remove_quotations` applied to `greenstone_dev`.
Backend **470/470 tests passing** (down from 499 — `quotations.test.ts` and
the 4 quotation-conversion tests in `orders.test.ts` were removed, not a
regression), re-run twice for stability. Frontend build generated 24 routes
(down from 26 — the two `/quotations` routes are gone). Backend and
frontend `typecheck`/`lint`/`test`/`build` all clean.

The one `QUOTATION`-type generated PDF file was removed via a one-off
script before the migration ran (SQL cannot touch the filesystem); 59
additional orphaned PDF files from repeated test runs, never referenced by
any database row, were removed from local storage at the same time.

**`DocumentType.QUOTATION` was deliberately kept**, not removed as
originally planned — see the "Important deviation" note below.

Removed:

- The `quotations` backend module (routes, controller, service, repository,
  validators, types).
- `quotations` frontend pages and features.
- The Quotations entry from frontend navigation (`nav-items.ts`).
- The `quotation` resource from the permissions matrix and its permission
  tests.
- Quotation-specific test files (`quotations.test.ts` and any quotation
  assertions in `permissions.test.ts`).
- Quotation PDF generation code path.
- The `QUOTATION` document-numbering configuration path (the `quotations`
  module was the only thing that ever allocated one — no code allocates a
  new `QUOTATION` number now).
- The `QUOTATION` value from `GeneratedDocumentType` (its one row was
  deleted first, so narrowing was safe).
- `Quotation`/`QuotationItem` Prisma models and their `quotations`/
  `quotation_items` tables, via the new migration above.

Rules followed:

- No already-applied migration file was edited — this was a new migration on
  top of the existing history.
- No stored PDF file or `generated_documents`/`stored_files` row was removed
  silently — 6C-1's audit found exactly one such row, the business owner
  explicitly confirmed it was test data safe to remove, and it was removed
  deliberately (script + migration), not as an unreviewed side effect.
- Historical `DocumentSequence` rows for `QUOTATION` were never deleted —
  see the deviation note below.

### Important deviation: `DocumentType.QUOTATION` was kept

The original plan (this section, first draft) said to remove `QUOTATION`
from **both** `GeneratedDocumentType` and `DocumentType`. Only
`GeneratedDocumentType` was actually narrowed. `DocumentType` backs
`document_sequences.documentType`, which has a real historical row (year
2026, last number 3) that must never be hard-deleted or invalidated per the
project's standing rule for issued document records
(`docs/implementation-plan.md` section 2; `CLAUDE.md`). Narrowing that
column's MySQL `ENUM` list while a row still holds the removed value would
either fail the migration outright (in strict SQL mode) or silently corrupt
that row — neither is acceptable for a document-numbering record. Keeping
`QUOTATION` in `DocumentType` costs nothing going forward: no code path
allocates a new one, since the `quotations` module that did so is gone. See
the `DocumentType` doc comment in `schema.prisma` and
`docs/database-notes.md`'s "Planned schema changes" section 3 for the full
reasoning.

### Excluded from Phase 6C (all three steps)

None of 6C-1, 6C-2, or 6C-3 include: Product operational names or truck
capacities (Phase 6D), customer credit projection or customer balance
filters (Phase 6E), Vehicle Owners or Vehicle rework (Phase 6F), Production,
Curing, Purchases, Deliveries, Invoices, or Payments. Each of those remains
its own phase, unaffected by this split.

## Phase 6D — Product operational names, pieces per pallet, and truck capacity (COMPLETED)

See `docs/decisions/business-workflow-update-2026-08-02.md` sections 2, 3,
12.2, 12.5, and 13. Migration `20260803180000_phase6d_product_operational_fields`
applied to `greenstone_dev` (`prisma migrate deploy`), verified against the
live database. Backend **481/481 tests passing**; frontend typecheck/lint
(4 pre-existing informational warnings, 0 errors)/9 tests/build all clean —
build generated the same 24 routes as before (no new route).

Implemented:

- Added four nullable `Product` columns: `operationalName`,
  `operationalNameNormalized` (unique when present, same dual-column pattern
  as `Customer.emailNormalized`), `piecesPerPallet`, `maxPiecesPerTruck`.
- Backfilled the four already-confirmed products, matched by
  `nameNormalized`: 4-inch (18 pieces/pallet, 1,500 max/truck), 6-inch (12,
  1,200), 9-inch (pieces-per-pallet **not confirmed**, left `null`; 850
  max/truck), 300mm (6, 750). The two Hollow Pot 150mm/200mm rows are left
  untouched — their operational name stays permanently empty, per section
  12.1.
- **Removed the old global "one pallet is always 12 pieces" rule.**
  `production.service.ts`'s `resolveItem` now reads the selected product's
  own `piecesPerPallet` and computes `producedQuantity = pallets ×
  product.piecesPerPallet`, and rejects the request (`BUSINESS_RULE_VIOLATION`,
  422) when that product has no confirmed value — including the 9-inch
  product, which cannot be produced until the company confirms it.
- `products` module: `operationalName`/`piecesPerPallet`/`maxPiecesPerTruck`
  accepted on create/update, all nullable/clearable; a duplicate
  `operationalName` (case/whitespace-insensitive) is rejected the same way a
  duplicate `name` already was.
- Production seed (`INITIAL_PRODUCTS`) updated with the same four confirmed
  values, so a brand-new database gets them at insert time; the migration
  backfill is what applies them to the already-seeded dev database.
- Frontend: Product add/edit form and detail page gained the three fields
  (each shows "Not confirmed" when empty); the Production form now shows the
  selected product's actual pieces-per-pallet (or a clear "not confirmed"
  message) instead of a hardcoded `× 12`, and blocks with an inline message
  when the selected product has none.

**230MM (2026-08-03):** not created, not connected to any existing product,
not seeded, not backfilled anywhere in this phase — remains a pending
product identification per section 13. No runtime guard rejects the literal
string "230MM" from being typed into `operationalName` — only its omission
from the seed/backfill was in scope; flagged as excluded, not assumed.

### Excluded from Phase 6D

Mixed-product truck-load calculation (still deferred, section 12.2).
Delivery's `requiredTrips` calculation and its capacity snapshot (Phase 8 —
only the source `maxPiecesPerTruck` column exists now). Vehicle
Owner/Vehicle rework (6F). Customer-credit projection/balance filters (6E).
Cement/Raw Materials/Purchases (Phase 7).

## Phase 6E — Customer credit projection formula and balance filters (COMPLETED)

See `docs/decisions/business-workflow-update-2026-08-02.md` sections 6 and 7.
No migration — pure service-logic and one new read-only endpoint, exactly as
originally anticipated. Backend **494/494 tests passing**; frontend
typecheck/lint (4 pre-existing informational warnings, 0 errors)/9 tests/
build all clean — same 24 routes as before (no new route).

Implemented:

- **Split the accounting outstanding balance from the projected credit
  exposure**, previously conflated in Phase 5B's interim `computeCreditStatus`:
  - `computeCreditStatus`/`GET /customers/:id/credit-status` — accounting
    balance only (`openingBalance` alone today; orders are never part of
    it). Used for the customer-detail display and the new list filter.
  - `computeProjectedExposure`/new `GET /customers/:id/credit-projection`
    (`customer-credit:read`, same permission as the status endpoint) —
    `currentOutstandingBalance + activeCreditOrdersTotal + newOrderTotal`,
    used only by order creation's block/override check.
- `orders.service.ts`'s `resolveCreditOverride` now calls
  `computeProjectedExposure` with the order's own computed `totalAmount` —
  the real behaviour change from the superseded 5B check, which never added
  the new order's own amount.
- `activeCreditOrdersTotal` excludes `CANCELLED` orders
  (`sumActiveCreditOrderTotals`, renamed from `sumCreditOrderTotals`), and
  accepts an optional `excludeOrderId` so a future order-edit flow cannot
  double-count the order being edited — no such flow exists yet, so nothing
  calls it with a real id today.
- Customer list gained `hasOutstandingBalance` (true/false/absent),
  independent of `isActive` and of credit status, using the accounting
  balance only. Implemented as a `Prisma.CustomerWhereInput.AND` group so it
  composes correctly with the existing search filter.
- `customer-credit.service.ts`'s `setOpeningBalance` now invalidates the
  `customers` module's list cache after commit (a newly-exported
  `customersService.invalidateCustomerCache()`), since the list can now
  depend on a customer's balance — the one new cross-module cache
  dependency this phase introduces.
- Frontend: `CreditStatusCard` dropped the "Credit orders" row (no longer
  part of the accounting balance); `OrderForm`'s CREDIT-arrangement preview
  now shows the full projection breakdown (current balance, active credit
  orders, this order's total, projected exposure) via a new
  `useCreditProjection` hook, replacing the old `useCreditStatus` call for
  this purpose; the customer list gained a `Balance` `FilterSelect` (All /
  No outstanding balance / Has outstanding balance) alongside the existing
  active-status tabs.

**Design call made and implemented, flagged for your awareness:** "active"
credit orders excludes only `CANCELLED` — every other status counts as
not-yet-invoiced today, since no code path sets any Order status besides
`PENDING`/`CANCELLED` yet.

### Excluded from Phase 6E

No order-edit/update endpoint was built — `excludeOrderId` exists in
`computeProjectedExposure`'s signature only, unused today, per the decision
document's approved scope. The pre-existing TOCTOU race (two concurrent
CREDIT-order requests for the same customer could both read "not blocked"
before either commits) is unchanged — an inherited 5B-era characteristic,
not addressed here. Invoices, payments, and the real
`issuedInvoicesTotal`/`approvedPaymentAllocationsTotal` terms remain Phase 9;
both stay `0` until then. Vehicle Owner/Vehicle rework (6F), Cement/Purchases
(Phase 7) — untouched.

## Phase 6E — Addendum: Customer deactivation safeguards (2026-08-03, COMPLETED)

See `docs/decisions/business-workflow-update-2026-08-02.md` section 16.
Migration `20260803190000_phase6e_customer_deactivation_reason` applied to
`greenstone_dev` (`prisma migrate deploy`). Backend **508/508 tests
passing**; frontend typecheck/lint (4 pre-existing informational warnings, 0
errors)/9 tests/build all clean — same 24 routes as before (no new route).

Implemented:

- Added `Customer.deactivationReason` (nullable, mirrors `Order.statusReason`
  — cleared on reactivation, permanent history stays in the audit log
  regardless).
- New `CUSTOMER_DEACTIVATION_BLOCKED` error code/class.
- `customers.service.ts`'s `assertCustomerDeactivatable` — checked before
  every normal deactivation, never silent. Reports every failing condition
  together (active-order count with order numbers/statuses, and/or the
  outstanding balance) in one composed error message.
- Active orders and the accounting balance are read directly from the
  `orders`/`customer_opening_balances` tables by `customers.repository.ts` —
  not through the `orders`/`customer-credit` modules' own services — the
  same one-directional-dependency pattern `customer-credit.repository.ts`
  already used, avoiding a circular module dependency (`orders` and
  `customer-credit` already depend on `customers`; `customers` never
  depends back).
- New `POST /customers/:id/force-deactivate` (`customer:force-deactivate`,
  Super Admin/Admin only — Accountant excluded from this action, though
  still granted normal `customer:update`/deactivation like before).
  Bypasses `assertCustomerDeactivatable` entirely, requires a written
  reason, and records a full snapshot (previous status, active-order
  summary, outstanding balance) in the audit log
  (`FORCE_DEACTIVATE_CUSTOMER`). Never auto-cancels Orders, auto-releases
  stock reservations, or auto-erases the balance.
- Frontend: customer list gained a "Force deactivate" action (Super
  Admin/Admin only) with a required-reason dialog matching the Order
  cancellation pattern; the normal deactivate dialog now shows the backend's
  detailed block message inline; the customer detail page shows the
  deactivation reason when inactive.

**Confirmed and implemented exactly as flagged before implementation:**
Delivery, Stock Reservation, Invoice, and Customer Payment do not exist in
the schema (Phases 8/9), so three of the six normal-deactivation conditions
(unfinished Delivery, per-customer reserved stock, pending/unapproved
Customer payments) are vacuously satisfied — there is nothing to check
against yet, only checkable conditions were actually enforced. Because no
code path sets `Order.status` to anything but `PENDING`/`CANCELLED` today, a
customer with any non-cancelled order cannot be normally deactivated yet —
only force-deactivated. This was confirmed as intended before implementation
began.

### Excluded from this addendum

The Delivery/Stock-Reservation/Payment checks above remain placeholders
until Phases 8/9 ship — revisit `assertCustomerDeactivatable` then. Vehicle
Owner/Vehicle rework (6F), Cement/Raw Materials/Purchases (Phase 7) —
untouched.

## Phase 6F — Vehicle Owners; rework Vehicle (COMPLETED)

See `docs/decisions/business-workflow-update-2026-08-02.md` sections 10,
11, and 12.4. Split into two sub-steps, the same pattern as 4A–4D, 6A/6B,
and 6C-1–3, so the new module shipped and could be reviewed independently
before the existing, working Vehicle feature was touched:

- **Phase 6F-1 — Vehicle Owners module (COMPLETED).**
- **Phase 6F-2 — Vehicle rework (COMPLETED).**

Backend **534/534 tests passing** (one transient CSRF-cookie flake under
full-suite load, confirmed not a regression by two clean re-runs — an
infrastructure characteristic, not a logic bug). Frontend typecheck/lint (3
pre-existing informational warnings, 0 errors — one fewer than before, since
the removed truck-dimension `watch()` calls no longer trigger one)/9 tests/
build all clean — 26 routes (up from 24, the four new `/vehicle-owners`
routes).

### Phase 6F-1 — Vehicle Owners module

Migration `20260804100000_phase6f1_vehicle_owners` — created `vehicle_owners`
(name, phone/phoneNormalized required and unique, optional
nationalId/nationalIdNormalized unique when present, active status) and
added `vehicles.vehicleOwnerId` as nullable (not yet required — see 6F-2).

New backend module `vehicle-owners` (six files:
`vehicle-owners.{routes,controller,service,repository,validators,types}.ts`),
mirroring the `drivers` module's architecture exactly, mounted at
`/api/v1/vehicle-owners`. `vehicle-owner` permission
(create/read/update, all three roles) added to `shared/auth/permissions.ts`
— the resource itself was already pre-declared in
`docs/permissions-matrix.md` ahead of this phase.

`normalizeNationalId` (previously local to `drivers.repository.ts`) was
extracted to `shared/utils/normalize.ts`, since `vehicle-owners.repository.ts`
needed the identical function — removes a duplicate, not a new abstraction.

New development demo seed (`prisma/seed/development/vehicle-owners.ts`),
wired into `index.ts` ahead of the vehicles seed. New frontend feature
`features/vehicle-owners/` and `app/(system)/vehicle-owners/` (list, detail,
add/edit Dialog-on-desktop/Sheet-on-mobile), mirroring `drivers`/`features/
drivers` file-for-file. New "Vehicle owners" nav entry.

### Phase 6F-2 — Vehicle rework

**The 3 existing Vehicle rows (2 from the development demo seed — `KAA
000A`, `KAA 000B` — and 1 ad hoc — `KDA123`) had no owner information
anywhere in the schema to derive one from safely.** Per the migration-safety
rule, this was reported rather than assumed: all 3 are confirmed
non-production dev/demo data, so a one-off script created the same two demo
`VehicleOwner` records the development seed defines and assigned them to
the 3 vehicles — never invented owners, and never done silently (reported
here and in `docs/database-notes.md`).

Once every row had a valid `vehicleOwnerId`, migration
`20260804110000_phase6f2_vehicle_rework` made the column **required** and
dropped `ownershipType` (and its `COMPANY`/`HIRED` enum) and all six Phase
4C volumetric fields (`truckLengthM`, `truckWidthM`, `truckHeightM`,
`calculationFactor`, `calculatedLoadKg`, `calculatedLoadTonnes`) — the
calculation those fields drove was based on a misunderstanding, per section
12.4 of the decision document.

`vehicles.service.ts` now validates the referenced Vehicle Owner exists and
is active via `vehicle-owners.service.ts`'s exported
`requireActiveVehicleOwner` before creating or reassigning a vehicle — the
one-directional dependency `vehicles` → `vehicle-owners`, never the
reverse. `vehicles.test.ts` was fully rewritten (previously asserted
`ownershipType`/`hireCost`/the volumetric fields extensively). Frontend
`vehicle-form.tsx` replaced the three dimension fields with a searchable
Vehicle Owner select; `vehicle-list.tsx`'s "Load capacity" column became an
"Owner" column; the detail page links through to the owner's own page.

**Deliberate decision, flagged rather than silently done:** the vehicle
list's cached `vehicleOwnerName` is **not** invalidated when a Vehicle Owner
is renamed or deactivated — doing so would require
`vehicle-owners.service.ts` to import `vehicles.service.ts`, creating a
circular module dependency (since `vehicles` already imports
`vehicle-owners` for the validation above). A stale name/status in a cached
vehicle list self-heals within the list's own 300s TTL, matching this
project's existing cache-invalidation philosophy
(`docs/technical-blueprint.md` section 4A.4) — the owner-active check
itself is never affected, since it always reads live, uncached data.

### Excluded from Phase 6F

Delivery and its Driver+Vehicle+Owner-per-trip selection (Phase 8) — this
phase only documents the future relationship (one Driver may use many
Vehicles; one Vehicle may use many Drivers; the pairing is chosen per
Delivery trip), it does not build it. Transport-payment records/rates (KES
8,500 vs 8,000 per trip seen in the workbook) — Phase 8/9, not implemented.
Future Delivery snapshot fields (driver, vehicle registration, vehicle
owner, product truck capacity used, transport rate, number of trips, total
transport cost, payee) — documented as a future requirement, not built.
Pumice purchase/load records (Phase 7) — the `1100` KES/m³ rate and truck
dimensions for Pumice belong there, not on Vehicle.

---

# 11. Phase 7 — Purchases and Supplier Balances

## Goal

Implement supplier financial tracking on top of the raw-material ledger
Phase 6A already built.

`RawMaterial` master data, `RawMaterialStockBalance`, and
`RawMaterialMovement` already exist (Phase 6A) — this phase only adds the
`PURCHASE_RECEIPT` movement writer and the purchase/payment workflow around
it, and the real "opening raw-material quantity" endpoint (Phase 6A's
`set-opening` action exists; this phase is where an authorised user actually
uses it during production setup, per business-blueprint 2.15).

Split into four approved sub-phases, the same pattern as every earlier
multi-part phase (4A–4D, 5A/5B, 6A–6F), so each ships and is reviewed
independently:

- **Phase 7A — Supplier opening balances and balance display (COMPLETED).**
- **Phase 7B — Raw-material reference data (COMPLETED).**
- **Phase 7C — Purchases module (COMPLETED).**
- **Phase 7D — Purchase payments module (COMPLETED).**

## Phase 7A — Supplier opening balances and balance display (COMPLETED)

Migration `20260803145847_phase7a_supplier_opening_balances` added
`SupplierOpeningBalance` — mirrors `CustomerOpeningBalance` exactly:
corrected in place, one row per supplier, full before/after history in the
audit log.

Lives inside the existing `suppliers` module (`suppliers.{controller,
repository,routes,service,types,validators}.ts`) rather than a new
`supplier-balances` module: unlike the customer side, there is no separate
pre-declared permission resource forcing a split, so the existing
`supplier:update`/`supplier:read` (already granted to all three roles) gate
the two new endpoints. **Deliberate asymmetry, flagged rather than silently
decided:** a supplier's opening balance can be set by an Accountant, while a
customer's cannot (Admin/Super Admin only, via the separate
`customer-credit:set-opening-balance` action) — inventing a new restricted
permission was out of scope for this phase.

New `PATCH /suppliers/:id/opening-balance` and `GET /suppliers/:id/balance`.
`outstandingBalance` equals `openingBalance` alone until Phase 7C/7D add
Purchases and Purchase Payments. Never cached — read live from MySQL every
time, the same as `customer-credit.service.ts`'s `computeCreditStatus`.
Amount must be zero or greater (unlike the customer equivalent, which
permits negative). Remains settable and readable after the supplier is
deactivated — an opening balance must stay traceable regardless of the
supplier's current status.

Frontend: new `SupplierBalanceCard` + `OpeningBalanceDialog` on the supplier
detail page, mirroring `features/customers/components/credit-status-card.tsx`
and its opening-balance dialog file-for-file. New `canSetSupplierOpeningBalance`
permission helper (`lib/permissions.ts`) — every role, unlike its customer
counterpart.

Backend 561/561 tests passing; frontend typecheck/lint (same 3 pre-existing
unrelated warnings)/10 tests/26-route build all clean.

### Excluded from Phase 7A

Purchases, Purchase Payments, and the completed supplier outstanding-balance
formula (opening balance + unpaid approved purchases − approved
purchase-payment allocations) — Phase 7C/7D.

## Phase 7B — Raw-material reference data (COMPLETED)

No schema change. Fixed a gap found during Phase 7 planning: the
`raw-materials`/`measurement-units` modules have existed since Phase 6A but
had zero rows in any environment — the development demo seed never got a
`raw-materials.ts` file to seed them.

Cement, Dust, and Pumice, and their measurement units (Sack, Cubic Metre,
Tonne), are confirmed real system data (business-blueprint sections
2.12–2.13, and
`docs/decisions/business-workflow-update-2026-08-02.md` sections 8, 9, 14) —
the same reasoning already applied to the confirmed initial products — so
they were added to the **production** seed
(`prisma/seed/production/raw-materials.ts`), not the development demo seed.
Idempotent, and deliberately never updates an existing row, the same
"never undo a deliberate later change" rule `seedInitialProducts` already
follows. Reorder levels are left unset (business-blueprint section 2.14 —
optional). Every raw material still gets its normal zero-balance stock row
via the existing `insertRawMaterial` repository function, reused rather than
duplicated — no stock movement, no audit-log entry, and no opening quantity
of any kind is created by this seed. A real opening quantity is still
entered later, during production setup, through the existing Phase 6A
`set-opening` action, per business-blueprint section 2.15.

Verified directly against `greenstone_dev`: 3 `MeasurementUnit` rows, 3
`RawMaterial` rows, each with a zero-quantity `RawMaterialStockBalance` row,
zero `RawMaterialMovement` rows, zero related `AuditLog` rows. Running the
seed a second time creates no duplicates (verified both by the automated
test suite and directly against the live dev database). No CI/CD workflow
or package script invokes either seed automatically — `seed:prod` and
`seed:dev` are both explicit, manual commands only, so a production
deployment never creates demo business records by itself.

Backend 570/570 tests passing; frontend untouched (typecheck reconfirmed
clean).

### Excluded from Phase 7B

Purchases, Purchase Payments, real opening raw-material quantities (entered
later, during production setup) — Phase 7C/7D and beyond.

## Phase 7C — Purchases module (COMPLETED)

Migration `20260803160927_phase7c_purchases` — new `purchases` and
`purchase_items` tables (same pre-existing Better Auth index drift as every
migration since Phase 7A hit `account_userId_idx`/`session_userId_idx`
already existing untracked in the dev database; fixed the same way each
time — the two extraneous statements removed from the generated migration
file, unrelated to this phase's own schema).

New `purchases` module (six files). Creating a purchase **is** receiving it
— one transaction: allocate `PUR-YYYY-####`, validate the supplier and every
referenced raw material are active, compute each item's line total, write a
`PURCHASE_RECEIPT` movement per item against the Phase 6A raw-material
ledger, write one audit log. **No update or delete route** — a purchase,
once recorded, is never edited, the same shape `ProductionBatch` already
established.

- Pumice: `volumePerLoad = length × width × height`,
  `totalVolume = volumePerLoad × numberOfLoads`,
  `totalCost = totalVolume × ratePerCubicMetre` (reference rate KES 1,100/m³,
  never hard-coded, snapshotted per item). **Design decision**: `quantity`
  holds the computed total volume and `unitCost` holds the rate per cubic
  metre — reused rather than duplicated under Pumice-specific names, so
  `lineTotal = quantity × unitCost` holds as one invariant for every raw
  material and the stock ledger never needs Pumice-specific code. Pumice is
  identified by matching the raw material's normalised name, the same
  approach `production.service.ts` already uses for per-product rules.
- Cement and Dust: the fully generic quantity × unit-cost shape, no special
  fields. Reference costs (KES 850/sack) are never hard-coded.
- No Purchase PDF — `GeneratedDocumentType` stays `INVOICE`/`RECEIPT` only,
  per business-blueprint section 9.1.

**Bug found and fixed before commit**: the frontend Purchase form's Zod
schema used `z.string().optional()` for the Pumice-only fields, but
`useFieldArray` keeps every item's full shape in form state even for fields
whose input isn't currently rendered — a Cement item's untouched Pumice
fields held `''`, not `undefined`, which `.optional()` does not accept, so
every submission failed silently (the button did nothing, no visible
error). Fixed with a `z.preprocess` step that normalises `''` to `undefined`
before the regex runs — same fix applied to the mirror-image case (a Pumice
item's untouched generic fields).

Backend 597/597 tests passing at this point; frontend build 28 routes (the
three new `/purchases` routes).

### Excluded from Phase 7C

Purchase payments, purchase-payment allocations, and the completed supplier
outstanding-balance formula — Phase 7D.

## Phase 7D — Purchase payments module (COMPLETED)

Migration `20260803171800_phase7d_purchase_payments` — new
`purchase_payments` and `purchase_payment_allocations` tables (same known
migration-drift fix as every prior Phase 7 sub-phase).

New `purchase-payments` module (six files). Lifecycle: `PENDING` (any role,
never affects the balance) → `APPROVED` (Admin/Super Admin only, reduces
the balance) → `REVERSED` (Admin/Super Admin only, written reason required,
restores the balance) — the same three-state shape already anticipated for
customer payments (Phase 9). Never permanently deleted.

`paymentReference` is a single field, **always required regardless of
payment method** — the backend cannot mechanically verify "a valid M-Pesa
code" vs. "valid cheque details" beyond requiring a non-empty descriptive
string; the frontend changes only the field's label per method.

Supplier outstanding-balance formula completed:
`openingBalance + Σ(Purchase.totalCost) − Σ(PurchasePayment.amount WHERE status = APPROVED)`.
The amount is checked against the live balance at creation (advisory) and
**re-checked inside the approval transaction**, after locking both the
`suppliers` row and the specific `purchase_payments` row
(`SELECT ... FOR UPDATE`), so two payments approved for the same supplier
at the same moment cannot both succeed when only one should.

Allocations (`PurchasePaymentAllocation`) are traceability only — the
balance always uses the payment's own `amount`/`status`, never the
allocation breakdown. Every allocation is checked: same supplier as the
payment, amount > 0, amount ≤ that purchase's remaining unpaid amount
(`totalCost − Σ(APPROVED allocations)`, re-validated fresh at approval too),
no duplicate purchase within one payment, combined total ≤ the payment
amount.

**Evidence upload — the first real file-upload endpoint in this codebase.**
Added `multer` 2.x (the one new runtime dependency across the whole Phase 4–7
build), wired only on `POST /purchase-payments` (never registered globally).
Optional; never a substitute for `paymentReference`. Storage: memory →
`shared/storage/storage.service.ts`'s `storeFile` (existing MIME/size
checks) → **new** real file-signature (magic-byte) validation, since a
client-supplied `Content-Type` can be spoofed but the file's own leading
bytes cannot — this was `storage.service.ts`'s own long-standing deferred
comment ("file-signature checking is added in the phase that introduces
uploads"), now resolved. If the transaction fails after the file is stored,
the orphaned file is removed — a deliberate, explicit deviation from
`documents.service.ts`'s generated-PDF pipeline, which accepts an orphaned
file as a standard, documented tradeoff. Download
(`GET /purchase-payments/:id/evidence`) requires authentication and
`purchase-payment:read`. `insertStoredFile` was extracted from
`documents.repository.ts` into a new `shared/storage/storage.repository.ts`
once evidence upload became a second caller.

**Same-day addendum — future-date restriction.** Neither `Purchase.purchaseDate`
nor `PurchasePayment.paymentDate` may be in the future. Backend: new
`getNairobiToday()`/`isNotFutureNairobiDate()` in `shared/utils/nairobi.ts`,
applied via `.refine()` in both validators — deliberately compares calendar
date strings, not `Date` instants, since Nairobi (UTC+3) reaches a new
calendar date a few hours before UTC does and a naive instant comparison
would wrongly reject "today" during that window. Frontend: new
`todayInNairobi()` in `lib/format.ts`, used as both the date input's `max`
attribute and its default value, plus a matching Zod refinement in both
forms' schemas.

Backend 658/658 tests passing; frontend 23/23 tests passing, build clean
(30 routes, the three new `/purchase-payments` routes).

## Financial separation

Keep separate:

- Purchases.
- Purchase payments.
- General expenses.
- Salary payments.
- Customer payments.

## Completion gate (Phase 7C and 7D together)

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
- Vehicle Owners (2026-08-02 — see Phase 6F; must land before or alongside
  this phase since Delivery snapshots the vehicle owner as payee).
- Drivers.
- Broken products where remaining functions are needed.

## Approved delivery lifecycle (final, 2026-08-03)

Four statuses: `PLANNED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`. `DISPATCHED`
is **not** delivery completion — it is a separate, earlier step from
`DELIVERED`.

- **PLANNED** — the delivery is created; finished stock is reserved
  atomically in the same transaction (`FinishedStockBalance.reservedQuantity`
  increments, no ledger row — only physical-stock-affecting changes get a
  `FinishedStockMovement`).
- **DISPATCHED** — the truck has left the yard. Reduce
  `reservedQuantity` and `physicalQuantity` together, write the
  `DELIVERY_DISPATCH` movement. Do **not** touch
  `OrderItem.deliveredQuantity`/`remainingQuantity` yet, and do not advance
  `Order.status` yet.
- **DELIVERED** — the customer has received the goods. Record the actual
  quantity received and the quantity broken during delivery. Increase
  `OrderItem.deliveredQuantity` by the actually-received amount only,
  recalculate `remainingQuantity`, and recalculate `Order.status` using the
  existing approved statuses — completing the Order only once every item's
  `remainingQuantity` reaches 0.
- **CANCELLED** — allowed only from `PLANNED`. Releases the reservation
  (`reservedQuantity` decrement, no ledger row). Requires a written reason
  and an audit log.

### Broken products during delivery (2026-08-03)

Recorded only at the `DELIVERED` step, alongside the actual quantity
received — for example: dispatched 1,000, broken during delivery 20,
actually delivered 980.

- Finished stock stays reduced by the full 1,000 — all of it left the yard at
  dispatch.
- `OrderItem.deliveredQuantity` increases by 980 only.
- A `BrokenProductRecord` (`stage: DELIVERY`) is created for the 20.
- The 20 broken pieces are never returned to finished stock.
- This is never combined with an administrative correction. A true
  correction of an incorrectly *recorded* dispatch/delivery quantity is a
  separate action (Phase 8F), with its own written reason, audit log, and
  `CORRECTION` stock movement.

### PREPAID payment rule (2026-08-03)

The Customer Payments module does not exist until Phase 9, so `PREPAID` is
never treated as already paid.

- `CREDIT` deliveries use the existing customer-credit rules and override
  workflow (the same current-status check already used for `CREDIT` orders,
  not the projected-exposure calculation — the order was already checked at
  its own creation).
- A `PREPAID` delivery may be `PLANNED` and reserved.
- A `PREPAID` delivery must not reach `DISPATCHED` until an approved Customer
  Payment confirms full payment. Until Phase 9 ships, block `PREPAID`
  dispatch outright with a clear error message.
- Do not add a temporary "paid" checkbox and do not create placeholder
  payment records to work around this.
- Browser testing for Phase 8 must use `CREDIT` orders until Phase 9 exists.

### Driver, Vehicle, Vehicle Owner, and payee (confirms Phase 6F design — no change)

- Driver and Vehicle are selected separately on every delivery; never
  permanently paired.
- The payee is the Vehicle Owner linked to the selected Vehicle at
  delivery-creation time.
- Snapshot the owner/payee name and phone on the Delivery so a later change
  to that Vehicle Owner record never rewrites delivery history.
- If the Driver owns the vehicle, that person is also registered as a
  separate Vehicle Owner record (never auto-merged with the Driver record).

## Sub-phases (final breakdown, 2026-08-03)

### Phase 8A — Delivery planning and stock reservation (NOT_STARTED)

`Delivery`/`DeliveryItem` schema, `DEL-YYYY-0001` numbering, one order + one
customer address (snapshotted) + one driver + one vehicle per delivery,
credit-block check and override wiring (`CustomerCreditOverride` gains a
nullable `relatedDeliveryId` alongside the now-nullable `relatedOrderId`),
create/list/detail endpoints and pages, permissions, audit log.

### Phase 8B — Trip and transport-cost calculation (NOT_STARTED)

Single-product `requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)`
with a capacity snapshot; manual trip-count entry when a delivery has more
than one product (mixed-product capacity math stays unconfirmed — do not
implement it). Transport rate entered per delivery (never hard-coded),
`totalTransportCost = numberOfTrips × transportRate`, payee snapshot.

### Phase 8C — Dispatch (NOT_STARTED)

Physical stock reduction, `DELIVERY_DISPATCH` ledger write, the `PREPAID`
dispatch block, row-locked transaction. Does not touch `OrderItem` or
`Order.status`.

### Phase 8D — Delivery completion and broken-product recording (NOT_STARTED)

Record actual quantity received and quantity broken, advance
`OrderItem.deliveredQuantity`/`remainingQuantity`, recompute `Order.status`,
write the `BrokenProductRecord` (`stage: DELIVERY`).

### Phase 8E — Pre-dispatch cancellation (NOT_STARTED)

Release the reservation, written reason, audit log. Allowed only from
`PLANNED`.

### Phase 8F — Administrative correction (NOT_STARTED)

Separate action for fixing an incorrectly recorded dispatch/delivery
quantity after the fact — written reason, audit log, `CORRECTION` stock
movement. Never used for ordinary delivery breakage (that is Phase 8D).

## Do not add

- Customer returns.
- Customer signatures.
- Delivery photographs.
- Delivery-proof uploads.
- Mixed-product truck-load capacity calculation.
- A temporary "paid" checkbox or placeholder payment records for PREPAID
  deliveries.

## Completion gate

- Planned delivery does not reduce physical stock.
- Reservation reduces available stock only.
- Dispatch reduces physical stock but does not complete the Order.
- Delivery completion records actual/broken quantity and only then advances
  `OrderItem`/`Order` status.
- Cancellation (PLANNED only) releases the reservation.
- Administrative corrections are separate from delivery-breakage recording,
  always with a written reason and audit log.
- PREPAID deliveries cannot dispatch without an approved Customer Payment
  (blocked outright until Phase 9).
- Credit block prevents new CREDIT deliveries unless properly overridden.
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

## Phase 11A — Executive Dashboard ✅ COMPLETED (2026-08-07)

The executive dashboard at `/` provides management with:

- **Date filter**: Sheet/Drawer with 9 presets (Today, Yesterday, This Week, Last 7 Days, This Month, Last Month, Last 3 Months, This Year, Custom). Default: This Week.
- **8 operational KPI cards**: Active orders, Pending deliveries, Overdue invoices, Low-stock materials, Total finished stock (SUM of physicalQuantity), Pending payments, Salary approvals, Credit customers. All clickable to module pages.
- **4 financial cards**: Total invoiced, Payments received (APPROVED only), Outstanding, Expenses.
- **Invoices vs Payments chart**: Grouped bar chart with day/month auto-grouping.
- **Invoice payment status**: Donut chart (Fully paid / Partially paid / Unpaid).
- **Stock by Product chart**: Horizontal bar (physical vs available quantities from FinishedStockBalance).
- **Top 10 Orders table**: Ranked by `totalAmount` DESC in period, with totals footer.
- **Top 10 Customers by Payments table**: Ranked by `SUM(APPROVED allocations)` in period, with totals footer.
- **Redis caching**: 30s TTL, cache-aside, safe date-based keys. Fallback to MySQL when Redis unavailable.
- **View Reports button**: Links to `/reports`.
- **Reports Center** at `/reports`: 24 planned reports across 6 categories (Sales & Customers, Operations, Stock, Purchasing, Finance, Administration). Cards marked "Next phase". Search and category filter. Added to sidebar under "Reporting".

Next: Phase 11B — build detailed report pages.
