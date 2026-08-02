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
| 6D | Product operational names and truck capacity | NOT_STARTED |
| 6E | Customer credit projection formula and balance filters | NOT_STARTED |
| 6F | Vehicle Owners; rework Vehicle | NOT_STARTED |
| 7 | Purchases and supplier balances (Pumice/Cement calculations) | NOT_STARTED |
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
- **Phase 6D — Product operational names and truck capacity (NOT_STARTED).**
- **Phase 6E — Customer credit projection formula and balance filters
  (NOT_STARTED).**
- **Phase 6F — Vehicle Owners; rework Vehicle (NOT_STARTED).**

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

## Phase 6D — Product operational names and truck capacity (NOT_STARTED)

Not yet planned or approved for implementation — documentation only at this
stage. See `docs/decisions/business-workflow-update-2026-08-02.md` sections 2
and 3.

Expected scope:

- Add `Product.operationalName` (optional string) and
  `Product.maxPiecesPerTruck` (optional positive integer).
- Set the four confirmed operational names and truck capacities (4-inch/
  1,500; 6-inch/1,200; 9-inch/850; 300mm/750). Leave the two Hollow Pot
  150mm/200mm operational names empty — not confirmed.
- This is an additive migration only (two new nullable columns) — no data
  loss, no existing column changes.
- Any later delivery-trip calculation that reads `maxPiecesPerTruck` (Phase 8)
  must snapshot the value used at that time, so a later product update never
  changes an already-recorded delivery.

## Phase 6E — Customer credit projection formula and balance filters (NOT_STARTED)

Not yet planned or approved for implementation — documentation only at this
stage. See `docs/decisions/business-workflow-update-2026-08-02.md` sections 6
and 7.

Expected scope:

- Change the `customer-credit` module's new-credit-order check from "current
  outstanding balance" to "current outstanding balance + active credit orders
  not yet invoiced + the new credit order's own total."
- No schema migration required — this only changes the `customer-credit`
  service logic and the order-creation credit check already built in 5B.
- Add the customer list filter (All / No outstanding balance / Has
  outstanding balance), using the existing accounting-balance calculation,
  independent of active status and credit status.
- Depends on Phase 6C-2's `paymentArrangement` rename landing first if the
  two are implemented in the same session, since the credit check reads the
  order's payment arrangement.

## Phase 6F — Vehicle Owners; rework Vehicle (NOT_STARTED)

Not yet planned or approved for implementation — documentation only at this
stage. See `docs/decisions/business-workflow-update-2026-08-02.md` sections
10 and 11, and the impact report's note on the `calculationFactor` conflict.

Expected scope:

- Add a new `vehicle-owners` backend module and `VehicleOwner` model (name,
  phone, optional national ID, active status).
- Replace `Vehicle.ownershipType`/its `COMPANY`/`HIRED` enum with a
  `vehicleOwnerId` foreign key to `VehicleOwner`.
- Decide (with the business owner, not assumed) whether to remove the
  existing Phase 4C volumetric fields (`truckLengthM`, `truckWidthM`,
  `truckHeightM`, `calculationFactor`, `calculatedLoadKg`,
  `calculatedLoadTonnes`) now that per-product `maxPiecesPerTruck` (Phase 6D)
  supersedes them for delivery-trip planning — **not yet confirmed**, do not
  remove them until confirmed.
- Add the `vehicle-owners` resource to the permissions matrix, matching the
  existing `driver`/`vehicle` create/read/update pattern for all three roles.
- Rework `vehicles.test.ts`, which currently asserts `ownershipType`,
  `hireCost`, and the volumetric fields extensively.
- This is a schema migration (new table, new FK column, drop of
  `ownershipType`) — existing `Vehicle` rows need a `vehicleOwnerId` backfill
  strategy before the column can be made required.

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

## Modules

Implement:

- Purchases.
- Purchase payments.
- Suppliers where remaining functions are needed.

## Work

Implement:

- Purchase numbering.
- Purchase items, including the Pumice cubic-metre calculation and Cement
  bag calculation confirmed 2026-08-02 (see
  `docs/decisions/business-workflow-update-2026-08-02.md` sections 8 and 9):
  - Pumice: `volumePerLoad = length × width × height`,
    `totalVolume = volumePerLoad × numberOfLoads`,
    `totalCost = totalVolume × ratePerCubicMetre` (current rate KES 1,100 per
    cubic metre). Snapshot length, width, height, volume per load, number of
    loads, total volume, rate per cubic metre, and total cost on every Pumice
    purchase item. The rate must be configurable later; old purchases keep
    the rate used at creation. This `1100` must never be confused with
    `Vehicle.calculationFactor`'s unrelated `1100` (kilograms per cubic
    metre, Phase 4C) — different unit, different meaning.
  - Cement: measurement unit `BAG`, `totalCost = numberOfBags × unitCost`
    (current unit cost KES 850/bag). This is the same generic
    quantity × unit-cost shape every Purchase Item already has — no
    additional schema fields needed for Cement.
- Purchase receipt into stock (writes a `PURCHASE_RECEIPT` raw-material
  movement using the Phase 6A ledger).
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
- Vehicle Owners (2026-08-02 — see Phase 6F; must land before or alongside
  this phase since Delivery snapshots the vehicle owner as payee).
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
- Single-product truck-trip calculation (2026-08-02):
  `requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)`, using the
  product's `maxPiecesPerTruck` (Phase 6D), snapshotted onto the delivery so
  a later product update never changes an already-recorded delivery's trip
  count. Mixed-product truck loads are not confirmed — do not implement.
- Transport payment (2026-08-02): snapshot driver, vehicle, vehicle owner,
  transport rate, number of trips, total transport cost, and payee (the
  Vehicle Owner — the Driver, if they own the vehicle) on every delivery.
  `totalTransportCost = numberOfTrips × transportRate` (current rate KES
  8,500/trip). Never count this cost a second time as a general expense.
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
