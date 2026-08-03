# Greenstone Management System
## Final Technical Implementation Blueprint

## 0. Technical Blueprint Status

The Greenstone business blueprint is approved.

This document is the technical source of truth for implementation.

Development must not wait for real company data such as:

- Opening stock.
- Opening balances.
- Employees.
- Suppliers.
- Drivers.
- Vehicles.
- Raw-material units.
- Reorder levels.
- Company document details.

Safe demo data may be used in development. Real data will be entered during production setup.

**Amendment (2026-08-02):** New confirmed company information changed several
approved workflow assumptions after Phases 3–6B were built. See
`docs/decisions/business-workflow-update-2026-08-02.md` for the authoritative
record. Sections below marked "(2026-08-02)" reflect this update. Some code
built under the earlier assumptions (Quotations; `Order.paymentType`/
`sourceQuotationId`; `Vehicle.ownershipType`/`hireCost`) still exists in the
current codebase and has not yet been removed or reworked — that is tracked as
future sub-phases in `docs/implementation-plan.md` (Phase 6C onward).

---

# 1. Final Repository Structure

## 1.1 Recommended repository type

Use one monorepo containing:

- Frontend application.
- Backend application.
- Documentation.
- Shared development scripts.

A `pnpm` workspace is recommended for package management.

The frontend and backend remain separate applications. They must not import internal code directly from each other.

## 1.2 Root structure

- `greenstone-system/`
  - `CLAUDE.md`
  - `README.md`
  - `package.json`
  - `pnpm-workspace.yaml`
  - `pnpm-lock.yaml`
  - `.gitignore`
  - `.editorconfig`
  - `.env.example`
  - `docs/`
    - `business-blueprint.md`
    - `technical-blueprint.md`
    - `permissions-matrix.md`
    - `api-conventions.md`
    - `database-notes.md`
    - `deployment-guide.md`
    - `production-setup-checklist.md`
  - `frontend/`
    - `CLAUDE.md`
    - `package.json`
    - `next.config.ts`
    - `tsconfig.json`
    - `components.json`
    - `postcss.config.mjs`
    - `.env.example`
    - `app/`
    - `components/`
    - `features/`
    - `lib/`
    - `providers/`
    - `hooks/`
    - `styles/`
    - `types/`
    - `public/`
    - `tests/`
    - `e2e/`
  - `backend/`
    - `CLAUDE.md`
    - `package.json`
    - `tsconfig.json`
    - `.env.example`
    - `src/`
    - `prisma/`
    - `storage/`
    - `tests/`
  - `scripts/`
    - Development setup scripts.
    - Database setup scripts.
    - Demo-data removal checks.
    - Production verification scripts.
  - `.github/`
    - `workflows/`
      - Validation and test workflow.
      - Build workflow.

## 1.3 Frontend structure

- `frontend/app/`
  - `(auth)/`
    - Login and authentication pages.
  - `(system)/`
    - Authenticated application layout.
    - Dashboard.
    - Customers.
    - Orders.
    - Production.
    - Curing.
    - Inventory.
    - Purchases.
    - Deliveries.
    - Finance.
    - Employees.
    - Reports.
    - Settings.
  - `layout.tsx`
  - `error.tsx`
  - `not-found.tsx`
  - `loading.tsx`

- `frontend/components/`
  - `ui/`
    - shadcn/ui components.
  - `layout/`
    - Sidebar.
    - Mobile navigation.
    - Header.
    - Page container.
  - `shared/`
    - Reusable application components.
  - `forms/`
    - Shared form controls.
  - `data-display/`
    - Tables.
    - Mobile cards.
    - Status badges.
  - `charts/`
    - Shared Recharts wrappers.

- `frontend/features/`
  - One folder for each business area.
  - Example:
    - `customers/`
      - `api/`
      - `components/`
      - `hooks/`
      - `schemas/`
      - `types/`
      - `utils/`

- `frontend/lib/`
  - API client.
  - Query client.
  - Error helpers.
  - Date formatting.
  - Money formatting.
  - Permission helpers.
  - File-download helpers.
  - Constants.

- `frontend/providers/`
  - TanStack Query provider.
  - Theme provider.
  - Authentication-state provider where needed.

## 1.4 Backend structure

- `backend/src/`
  - `app.ts`
  - `server.ts`
  - `config/`
    - Environment configuration.
    - Security configuration.
    - Storage configuration.
  - `modules/`
    - All business modules.
  - `shared/`
    - `auth/`
    - `audit/`
    - `database/`
    - `errors/`
    - `middleware/`
    - `numbering/`
    - `storage/`
    - `pdf/`
    - `responses/`
    - `validation/`
    - `scheduler/`
    - `constants/`
    - `types/`
    - `utils/`
  - `health/`
    - Health and readiness endpoints.

- `backend/prisma/`
  - `schema.prisma`
  - `migrations/`
  - `seed/`
    - Development demo seed.
    - Production system seed.
    - Demo-data cleanup verification.

- `backend/storage/`
  - Used only for local development files.
  - Must not be treated as permanent production storage.

---

# 2. Frontend Architecture

## 2.1 Main frontend principles

The frontend must be:

- Mobile-first.
- Fully responsive.
- Simple.
- Fast.
- Accessible.
- Easy for non-technical users.

Next.js is responsible for the user interface. It must not duplicate backend business logic.

The Express backend remains the only authority for:

- Permissions.
- Calculations.
- Credit checks.
- Stock checks.
- Document numbers.
- Payment approval.
- Salary approval.
- Audit logging.

## 2.2 Next.js App Router

Use route groups to separate:

- Authentication pages.
- Authenticated system pages.

Use Server Components by default for:

- Layouts.
- Page shells.
- Static configuration.
- Non-interactive content.

Use Client Components only when required for:

- Forms.
- TanStack Query.
- Dialogs.
- Tables with interaction.
- Charts.
- Mobile menus.
- Client-side filters.

Do not convert full pages into Client Components without a clear reason.

## 2.3 Feature-based frontend structure

Each major business area should have a frontend feature folder.

Recommended feature folders:

- `auth`
- `users`
- `customers`
- `products`
- `orders`
- `production`
- `curing`
- `finished-stock`
- `broken-products`
- `raw-materials`
- `suppliers`
- `purchases`
- `purchase-payments`
- `vehicle-owners`
- `vehicles`
- `drivers`
- `deliveries`
- `invoices`
- `customer-payments`
- `receipts`
- `expenses`
- `employees`
- `salaries`
- `notifications`
- `dashboard`
- `reports`
- `settings`
- `audit-logs`

A feature folder may contain:

- API request functions.
- Query and mutation hooks.
- Feature-specific components.
- Frontend validation schemas.
- Frontend types.
- Display utilities.

## 2.4 Data fetching

Use TanStack Query for backend data.

Use it for:

- Lists.
- Details.
- Dashboard values.
- Reports.
- Mutations.
- Cache invalidation.
- Retry handling.

Rules:

- Every API request must pass through one central API client.
- Do not call `fetch` separately inside many components.
- Query keys must follow a consistent structure.
- Successful mutations must invalidate only affected data.
- Sensitive actions must not be automatically retried.
- Filters and pagination should be kept in the URL where practical.

## 2.5 Forms

Use:

- React Hook Form.
- Zod.
- Shared shadcn/ui form controls.

Frontend validation improves the user experience, but backend Zod validation remains mandatory.

Forms must:

- Show field errors clearly.
- Prevent accidental duplicate submission.
- Show calculated values before saving.
- Warn before destructive or sensitive actions.
- Preserve entered information after recoverable errors.
- Use numeric keyboards on mobile for money and quantities.
- Use searchable selectors for customers, products, drivers, vehicles, and suppliers.

## 2.6 State management

Use:

- TanStack Query for server state.
- URL parameters for filters, search, page, and sorting.
- Local React state for temporary interface state.
- React Hook Form for form state.

Do not create a large global state store unless a real need appears.

## 2.7 Authentication handling

The frontend uses the Better Auth client for authentication.

Authentication cookies are HTTP-only and must never be read by browser code.

Rules:

- Use the Better Auth client for sign-in and sign-out.
- Use Better Auth session APIs for current-user state.
- Do not build custom token-refresh logic.
- Do not build a custom session store.
- Do not store authentication data in localStorage or sessionStorage.

The central API client sends credentials with every Greenstone business request
and redirects to login when there is no valid session.

## 2.8 Permission-based interface

The frontend may hide or disable actions based on permissions.

Examples:

- Hide payment approval from Accountant.
- Hide salary reversal from Accountant.
- Show curing release only when the user has permission.
- Show customer-credit override only to Admin and Super Admin.

Frontend permission checks are for interface control only.

The backend must check every permission again.

## 2.9 Responsive data presentation

Desktop:

- Use tables for large data sets.
- Allow filtering, sorting, and pagination.

Mobile:

- Convert important table rows into cards.
- Show only key fields first.
- Put less common actions inside a menu.
- Keep one clear primary action.
- Use bottom action areas for long forms where useful.

## 2.10 UI tools

Use:

- shadcn/ui for reusable controls.
- Tailwind CSS v4 for layout and styling.
- Lucide React for icons.
- Recharts for reports and dashboard charts.
- Sonner for success and error notifications.
- next-themes for light and dark mode.

Icons must not replace important button text.

---

# 3. Backend Modules and Responsibilities

## 3.1 Exact module rule

Every backend business module must contain exactly six files.

Example:

- `customers.routes.ts`
- `customers.controller.ts`
- `customers.service.ts`
- `customers.repository.ts`
- `customers.validators.ts`
- `customers.types.ts`

No extra file may be added inside a business module.

Do not add:

- `customers.module.ts`
- `customers.permissions.ts`
- Module-specific model files.
- Module-specific middleware files.

Shared concerns belong outside business modules.

## 3.2 Dependency flow

The required flow is:

**Routes → Controller → Service → Repository → Prisma**

Rules:

- Routes connect endpoints and middleware only.
- Controllers handle HTTP request and response only.
- Services contain all business logic.
- Repositories contain Prisma and MySQL access only.
- Validators contain Zod schemas.
- Types contain module-specific TypeScript types.
- Controllers must never call repositories.
- Controllers must never call Prisma.
- Services must not use Express request or response objects.
- Repositories must not make business decisions.
- Cross-module operations must call another module’s service.
- Sensitive multi-record actions must use transactions.
- Audit logs must be created from the service layer.

## 3.3 Final backend modules

| Module | Responsibility |
|---|---|
| `auth` | Login, logout, token refresh, password checks and session revocation |
| `users` | User accounts, roles, activation, deactivation and special capability grants |
| `customers` | Customer records, contact details and building-site addresses |
| `customer-credit` | Opening balances, credit status, credit checks and credit overrides |
| `products` | Product master information and initial product definitions |
| `measurement-units` | Configurable raw-material measurement units |
| `orders` | Orders, order items, price snapshots and order progress |
| `production` | Pallets, production quantities, order allocation, excess quantity and material usage coordination |
| `curing` | Two-day and three-day curing, duration changes and product release |
| `finished-stock` | Physical stock, reservations, available stock, movements and adjustments |
| `broken-products` | Broken product records across production, curing, stock and delivery |
| `raw-materials` | Raw-material master records, balances, movements and reorder levels |
| `suppliers` | Supplier records, opening balances and supplier account information |
| `purchases` | Raw-material purchases and purchase items |
| `purchase-payments` | Supplier payments and supplier balance updates |
| `vehicle-owners` | Vehicle owner records and active status (2026-08-02) |
| `vehicles` | Vehicle records and their registered owner (revised 2026-08-02) |
| `drivers` | Driver records and active status |
| `deliveries` | Delivery trips, stock reservation, dispatch and delivery progress |
| `invoices` | Strict order-to-invoice relationship, invoice items and balances |
| `customer-payments` | Customer payment recording, evidence, allocation, approval and reversal |
| `receipts` | Receipt creation, viewing, printing and immutable issued records |
| `expenses` | General business expenses |
| `employees` | Employee records and weekly or monthly salary configuration |
| `salaries` | Salary registration, approval, correction and reversal |
| `notifications` | Internal system alerts |
| `dashboard` | Dashboard summaries and alert counts |
| `reports` | Operational and approved financial reports |
| `audit-logs` | Audit-log searching and viewing |
| `settings` | Company settings and configurable operational values |

**Quotations (removed from the planned system — 2026-08-02):** a `quotations`
module was built in Phase 5A before this update. It is out of scope going
forward — see `docs/decisions/business-workflow-update-2026-08-02.md`. It is
still present in the current codebase; removing it is a future sub-phase
(Phase 6C), not yet done.

## 3.4 Shared backend services

The following do not belong inside business modules:

- Better Auth configuration, adapter, handler, and session helpers.
- Authentication middleware.
- Permission middleware.
- Capability checks.
- Cache access.
- Prisma client.
- Transaction helpers.
- Audit-log writer.
- Document-number generator.
- File-storage provider.
- PDF generator.
- Standard API responses.
- Error classes.
- Request ID middleware.
- Logging.
- Rate limiting.
- Security headers.
- Scheduled alert checks.

---

# 4. Database Entities and Relationships

## 4.1 General database standards

Use MySQL with Prisma.

Redis is used for caching only. It must never be the source of truth for
business data, balances, stock, or document numbers. Losing Redis must not lose
or corrupt business information.

Authentication tables are owned by Better Auth and generated with its CLI. The
standards below apply to Greenstone business tables.

Recommended standards:

- Use UUID identifiers for business records.
- Keep document numbers separate from internal IDs.
- Store money using `DECIMAL`, never floating-point values.
- Store piece quantities as whole numbers.
- Store raw-material quantities using decimal values.
- Store timestamps in UTC.
- Display dates and times using the Africa/Nairobi timezone.
- Use database uniqueness constraints for important business rules.
- Use transactions for stock, payments, balances, approvals, and numbering.

Transactional records must not use normal permanent deletion.

## 4.2 Authentication and users

Authentication tables are owned and generated by Better Auth. Do not hand-write
them, and do not edit them directly from controllers or repositories.

### User

Owned by Better Auth. Generated with the Better Auth CLI.

Stores:

- Name.
- Email, used as the login identifier.
- Role.
- Active status, expressed through the Admin plugin.
- Created and updated information.

The password hash is stored by Better Auth in its own account table.

Relationships:

- Has many sessions.
- Has many capability grants.
- Has many audit logs.
- Creates many business records.

### Session

Owned by Better Auth. Database-backed, so revocation is immediate.

Stores the user, session token, expiry, and device information.

There is no refresh-token model. Do not create one.

### User Capability Grant

Used for approved user-specific permissions, such as:

- Accountant curing release.
- Accountant salary registration.

Stores:

- User.
- Capability.
- Granted by.
- Granted date.
- Revoked date.

The MVP does not require a custom role builder.

Roles remain:

- Super Admin.
- Admin.
- Accountant.

## 4.3 Customers and credit

### Customer

Has many:

- Addresses.
- Orders.
- Invoices through orders.
- Customer payments.
- Opening-balance records.
- Credit overrides.

### Customer Address

Belongs to one customer.

One address can be used by several orders and deliveries.

### Customer Opening Balance

Stores:

- Customer.
- Opening amount.
- Effective date.
- Reason.
- Entered by.
- Audit reference.

It is not an invoice.

### Customer Credit Override

Stores:

- Customer.
- Related order or delivery.
- Previous credit status.
- Written reason.
- Approved by Admin or Super Admin.
- Date and time.

## 4.4 Products and pricing snapshots

### Product

Stores:

- Product name.
- Category.
- Size.
- Optional description.
- Active status.
- `operationalName` (2026-08-02) — a separate, configurable short name staff
  use day to day (e.g. "4-inch" for Hollow Blocks 4 × 9). Optional; left empty
  until confirmed for a given product. Does not replace the official product
  name. Unique when present (`operationalNameNormalized`, confirmed
  2026-08-02 second round — same dual-column pattern as
  `Customer.emailNormalized`).
- `piecesPerPallet` (2026-08-03, Phase 6D — COMPLETED) — a configurable
  positive whole number, or empty when not yet confirmed for a given
  product: the confirmed pieces one pallet of that product holds.
  **Replaces the old global "one pallet is always 12 pieces" rule**
  (business-blueprint section 2.7) — Production now reads this per-product
  value and refuses to run for a product with no value here.
- `maxPiecesPerTruck` (2026-08-02) — a configurable positive whole number, or
  empty when not yet known: the maximum pieces of this single product one
  truck can carry. Used only for single-product delivery trip calculation
  (`requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)`, see section
  4.11). An authorised user may update it later; already-recorded deliveries
  must keep the capacity value in effect at dispatch time as a snapshot, never
  recalculated retroactively.

**Pending identification — 230MM (2026-08-03):** the company confirmed it
uses the label "230MM," but the exact product it identifies is not yet
confirmed. No `Product` row exists for it, it must not be assumed to be
Hollow Pot 380 × 200 × 300 mm ("300mm") or any other existing product, and no
existing product may be renamed to it. See
`docs/decisions/business-workflow-update-2026-08-02.md` section 13. This does
not block development.

It does not require a fixed selling price.

**Quotations removed (2026-08-02):** Quotations are not part of the planned
system — see `docs/decisions/business-workflow-update-2026-08-02.md`. The
"Quotation Item" entity previously defined here is out of scope going forward.
It still exists in the current codebase (Phase 5A); removal is a future
sub-phase.

### Order Item

Belongs to:

- One order.
- One product.

Stores:

- Ordered quantity.
- Agreed unit-price snapshot.
- Produced quantity.
- Allocated quantity.
- Delivered quantity.
- Remaining quantity.

### Invoice Item

Belongs to:

- One invoice.
- One order item.
- One product.

Stores:

- Quantity.
- Unit-price snapshot copied from the order.
- Item total.

Historical prices must never depend on the current product master.

## 4.5 Orders and invoices (revised 2026-08-02)

**Quotations removed:** the workflow now begins directly with an Order — there
is no "convert an accepted quotation into an order" step. The `Quotation`
entity previously defined here is out of scope going forward; it still exists
in the current codebase (Phase 5A) and is removed in a future sub-phase (see
`docs/decisions/business-workflow-update-2026-08-02.md`).

### Order

Belongs to:

- One customer.
- One customer address.

Has many:

- Order items.
- Production allocations.
- Deliveries.

Has exactly one invoice.

Stores:

- `paymentArrangement` — `PREPAID` or `CREDIT` (2026-08-02, renamed from
  `paymentType`'s `CASH`/`CREDIT`). Cash is a payment method (section 4.13 /
  business-blueprint 2.23), not an order-level arrangement — `PREPAID` must
  never be called "CASH." A `PREPAID` order must be fully paid through
  approved payments before dispatch.
- `status` — system-controlled, not user-writable. Every new order is created
  as `PENDING` automatically. The full status lifecycle between `PENDING` and
  order completion (after full delivery) is **not yet confirmed** — do not
  implement additional statuses beyond what is already built until confirmed.

The current codebase's `Order.sourceQuotationId` / `sourceQuotationItemId`
columns and the quotation-to-order conversion flow are removed together with
Quotations in the same future sub-phase (Phase 6C), since both exist only to
serve quotations.

### Invoice

Belongs to exactly one order.

The order reference must have a unique database constraint.

One order cannot have several invoices.

An invoice cannot exist without an order.

## 4.6 Production and curing

### Production Batch

Stores:

- Production number.
- Date.
- Production purpose.
- Optional related order.
- Status.
- Created by.

Has many:

- Production items.
- Raw-material usage records.

### Production Item

Stores:

- Product.
- Pallets.
- Produced quantity.
- Broken quantity.
- Usable quantity.
- Order-allocated quantity.
- Excess quantity.

### Production Order Allocation

Connects:

- Production item.
- Order item.

Stores the exact quantity allocated to the order.

### Curing Record

Belongs to a production item.

Stores:

- Product.
- Quantity entering curing.
- Original duration.
- Current duration.
- Start date and time.
- Planned completion.
- Actual release.
- Broken quantity.
- Released quantity.
- Duration-change reason.
- Changed by.
- Released by.

## 4.7 Finished-product stock

### Finished Stock Balance

One balance record per product.

Stores:

- Physical quantity.
- Reserved quantity.
- Available quantity.
- Record version.

The balance is updated transactionally.

### Finished Stock Movement

The stock ledger is the main history.

Movement types include:

- Opening stock.
- Curing release.
- General-stock production release.
- Delivery dispatch.
- Broken product.
- Positive adjustment.
- Negative adjustment.
- Correction.

### Stock Reservation

Belongs to:

- Product.
- Delivery.
- Delivery item.

Stores:

- Reserved quantity.
- Reservation status.
- Reserved date.
- Released date.
- Consumed date.
- User.

### Stock Correction

Stores:

- Related stock movement or delivery.
- Previous quantity.
- Corrected quantity.
- Written reason.
- Authorised user.
- Date and time.

## 4.8 Broken products

### Broken Product Record

Belongs to a product.

May reference:

- Production item.
- Curing record.
- Stock movement.
- Delivery.

Stores:

- Quantity.
- Stage.
- Reason.
- User.
- Date and time.

## 4.9 Raw materials

### Measurement Unit

Stores:

- Name.
- Optional symbol.
- Active status.

### Raw Material

Belongs to one measurement unit.

Stores:

- Name.
- Optional reorder level.
- Active status.

### Raw-Material Stock Balance

One current balance per raw material.

Stores:

- Current quantity.
- Record version.

### Raw-Material Movement

Movement types include:

- Opening quantity.
- Purchase receipt.
- Production usage.
- Positive adjustment.
- Negative adjustment.
- Correction.

### Raw-Material Usage

Belongs to:

- Production batch.
- Raw material.
- Measurement unit.

Stores the actual quantity used.

No fixed formula is stored.

## 4.10 Suppliers, purchases, and purchase payments

### Supplier

Has many:

- Purchases.
- Purchase payments.
- Opening balances.

### Supplier Opening Balance

Stores:

- Supplier.
- Amount.
- Effective date.
- Reason.
- Entered by.
- Audit reference.

It is not a purchase or expense.

### Purchase

Belongs to one supplier.

Has many purchase items.

### Purchase Item

Belongs to:

- One purchase.
- One raw material.
- One measurement unit.

Stores:

- Quantity.
- Unit cost.
- Total cost.

**Pumice (2026-08-02):** Pumice is purchased and costed by volume, not weight
or bag count. In addition to the generic fields above, a Pumice purchase item
snapshots:

- Length, width, height.
- Volume per load (`length × width × height`).
- Number of loads.
- Total volume (`volumePerLoad × numberOfLoads`).
- Rate per cubic metre.
- Total cost (`totalVolume × ratePerCubicMetre`).

Current rate: KES 1,100 per cubic metre. This must be configurable later; old
purchases keep the rate used at creation. This value must never be confused
with the unrelated `Vehicle.calculationFactor` default of `1100` (kilograms
per cubic metre) — see the conflict note in section 4.11.

**Cement (2026-08-02; unit name confirmed 2026-08-03):** Cement's
measurement unit is **"Sack"** (company-facing name — corrects the earlier
"Bag" wording; `MeasurementUnit` is a configurable table, not a fixed enum,
per section 4.9).
`totalCost = numberOfSacks × unitCost`, using the generic quantity × unit-cost
shape above — Cement needs **no** additional schema fields. Current known
unit cost: KES 850 per sack, a reference figure only, stored as the existing
unit-cost snapshot (never hard-coded). The reference figure of 170–190 sacks
used per day is informational only; production must record the actual
number of sacks used via the existing `RawMaterialUsage` entity (section
4.9), never an automatic 170 or 190, and never a formula-derived value.
Cement stock is the existing generic `RawMaterialStockBalance`/
`RawMaterialMovement` ledger (section 4.9) — opening stock + purchased sacks
− actual sacks used ± adjustments — not an independent model. See
`docs/decisions/business-workflow-update-2026-08-02.md` section 14.

### Purchase Payment

Belongs to one supplier.

Stores:

- Payment number.
- Amount.
- Payment method.
- Reference.
- Payment date.
- Evidence.
- Status.

Purchase payments remain separate from expenses.

### Purchase Payment Allocation

May connect a purchase payment to purchase records.

It allows payment history to remain traceable without changing the purchase itself.

## 4.11 Deliveries, vehicles, vehicle owners, and drivers (revised 2026-08-02)

### Vehicle Owner (new — 2026-08-02)

Master-data entity. Stores:

- Name.
- Phone number.
- Optional national ID.
- Active status.

### Vehicle (revised 2026-08-02)

Stores:

- Registration number.
- Vehicle type.
- Vehicle Owner (replaces `ownershipType`/`hireCost` entirely — every vehicle
  now has a registered owner instead of an ownership category).
- Active status.

If the Driver owns the Vehicle, the Driver is also registered as a separate
Vehicle Owner record (not automatically linked or merged with the Driver
record). A Driver is never permanently attached to one Vehicle — the actual
Driver and Vehicle are selected on every Delivery trip.

**Conflict with the existing volumetric calculation:** Phase 4C added a
vehicle-level truck-capacity model (`truckLengthM`, `truckWidthM`,
`truckHeightM`, `calculationFactor` defaulting to `1100` kilograms per cubic
metre, `calculatedLoadKg`, `calculatedLoadTonnes`) that this document did not
originally describe. The new per-product `maxPiecesPerTruck` (section 4.4)
conflicts with it in two ways: the value `1100` also appears as the Pumice
purchase rate (KES per cubic metre, section 4.10) — a different unit that
must never be confused with `calculationFactor` — and the per-product model
may make the entire volumetric Vehicle calculation redundant for
delivery-trip planning. Whether to remove the volumetric fields is **not yet
confirmed** — see `docs/decisions/business-workflow-update-2026-08-02.md`.

### Driver

Stores:

- Name.
- Phone number.
- National ID.
- Active status.

### Delivery (revised 2026-08-02)

Belongs to:

- One order.
- One customer address.
- One vehicle.
- One driver.

Has many delivery items.

Snapshots at creation: driver, vehicle, vehicle owner, transport rate, number
of trips, total transport cost, and payee (the Vehicle Owner — the Driver, if
they own the vehicle). `totalTransportCost = numberOfTrips × transportRate`.
Current transport rate: KES 8,500 per trip. Transport cost must never be
counted a second time as a general expense, and Vehicle must never store one
permanent hire cost (already true since Phase 4C removed `hireCost`).

For single-product deliveries, `requiredTrips = ceiling(deliveryQuantity /
maxPiecesPerTruck)` using the product's `maxPiecesPerTruck` (section 4.4),
snapshotted onto the delivery record so a later change to the product's
capacity never recalculates an already-recorded delivery. Mixed-product
truck-load calculation is **not yet confirmed** — do not implement it.

### Delivery Item

Belongs to:

- One delivery.
- One order item.
- One product.

Stores:

- Planned quantity.
- Reserved quantity.
- Dispatched quantity.
- Delivered quantity.

## 4.12 Customer payments and receipts

### Customer Payment

Belongs to one customer.

Stores:

- Payment number.
- Method.
- Amount.
- Payment date.
- Method-specific information.
- Status.
- Recorded by.
- Approved by.
- Reversed by.

### Customer Payment Allocation

Connects:

- Customer payment.
- Invoice.

One payment may be allocated across several invoices.

One invoice may receive several payments.

### Payment Evidence

Stores method-specific evidence such as:

- M-Pesa code.
- Bank reference.
- Cheque details.
- Cash information.
- Uploaded proof.

### Receipt

Belongs to one approved customer payment.

Stores:

- Receipt number.
- Issue date.
- Customer.
- Total payment amount.
- Remaining customer balance.

Issued receipts are immutable.

## 4.13 Expenses, employees, and salaries

### Expense

Stores:

- Expense number.
- Category.
- Description.
- Amount.
- Payment method.
- Date.
- Reference.
- Optional file evidence.

### Employee

Stores:

- Name.
- Phone number.
- Optional Kenyan ID number.
- Job title.
- Salary frequency.
- Salary amount.
- Payment method.
- Active status.

### Salary Payment

Belongs to one employee.

Stores:

- Salary-payment number.
- Salary period.
- Amount.
- Payment method.
- Status.
- Registered by.
- Approved by.
- Reversal or correction information.

## 4.14 Numbering, files, notifications, and audit

### Document Sequence

Stores:

- Document type.
- Calendar year.
- Last sequence number.

Document type and year must be unique together.

### Stored File

Stores:

- Storage key.
- Original file name.
- MIME type.
- File size.
- File checksum.
- Uploaded by.
- Created date.
- Retention type.

### File Relation Tables

Use explicit relation tables for:

- Customer payment attachments.
- Purchase payment attachments.
- Expense attachments.
- Generated PDF documents.

### Generated Document

Stores:

- Document type.
- Related business record.
- Document number.
- PDF file.
- Version.
- Generated date.
- Checksum.

### Notification

Stores:

- Notification type.
- Related entity.
- Target user or role.
- Read status.
- Created date.

### Audit Log

Stores all sensitive action history.

---

# 4A. Caching with Redis

## 4A.1 Purpose

Redis is used to make the system fast by avoiding a database query for every
read. It is a performance layer only.

Redis is never the source of truth. Losing Redis must not lose or corrupt any
business information. If Redis is unavailable, every request must still succeed
by reading from MySQL.

## 4A.2 What may be cached

Read-heavy data that users look at:

- Dashboard summary values.
- Report results.
- List and pagination results.
- Master-data lookups used by selectors, such as products, measurement units,
  customers, suppliers, drivers, and vehicles.
- Notification and alert counts.
- Reference data that rarely changes.

## 4A.3 What must never be cached

Any value used to make a business decision must be read from the database,
inside the transaction that uses it:

- Better Auth sessions.
- Passwords and authentication secrets.
- Permissions used for final authorisation.
- Customer credit status used during a transaction.
- Customer balances.
- Supplier balances.
- Finished-stock availability during a transaction.
- Raw-material availability during a transaction.
- Stock reservations.
- Document-number sequences.
- Payment approval status.
- Salary approval status.
- Invoice balances.
- Audit logs.

A cached value may be shown on screen. It must never be the value a transaction
acts on. The database, inside a transaction with the appropriate locking, is
always the authority for stock, balances, credit, numbering, and approvals.

## 4A.4 Cache invalidation

Caching without invalidation produces wrong numbers on screen.

Rules:

- Every mutation invalidates the cache entries it affects.
- Invalidation happens in the service layer that performs the write.
- Invalidation happens **after** the database transaction commits, never before.
- A failed transaction must not invalidate anything.
- Prefer invalidating a narrow key set over clearing broadly.
- Every cache entry also has a time-to-live, so a missed invalidation self-heals
  instead of serving stale data forever.

## 4A.5 Key naming

Use a consistent, versioned, namespaced key structure:

```text
greenstone:<version>:<environment>:<module>:<resource>:<identifier>
```

Examples:

```text
greenstone:v1:development:products:list:active
greenstone:v1:production:dashboard:summary
greenstone:v1:test:customers:list:page=1&size=25
```

The environment segment means one Redis instance can serve development, test
and production without their keys ever meeting. Without it, a test run clearing
its keys would also clear development's.

Bumping the version retires every old key at once, which is the safe way to
handle a shape change.

Keys are built in one place, `backend/src/shared/cache/cache-keys.ts`, which
rejects any segment containing the separator or whitespace.

## 4A.6 Time-to-live guidance

| Data | Suggested TTL |
|---|---|
| Dashboard summaries | 30 to 60 seconds |
| List and pagination results | 60 seconds |
| Reports | 5 minutes |
| Master-data lookups | 5 minutes |

Financial and stock figures shown to users should use the shorter end of the
range.

## 4A.7 Failure behaviour

Redis is optional. The application must work correctly without it.

| Situation | Behaviour |
|---|---|
| `REDIS_URL` empty | Caching is disabled. Every read goes to MySQL. |
| Redis unreachable | Read failure is a cache miss. Write and delete failures are logged and ignored. |
| Redis slow | The command is abandoned after a short timeout and treated as a miss. |
| Liveness | Never affected. It does not touch Redis. |
| Readiness | Reports the cache as `ok`, `degraded` or `disabled`, and stays **ready** as long as the database is available. |

Readiness deliberately excludes the cache from its decision. Without Redis the
system still answers every request correctly, only more slowly, so failing
readiness would remove a working server from rotation and turn a minor
degradation into an outage.

- Never store the only copy of anything in Redis.
- Do not store passwords, session tokens, or payment evidence in Redis.

## 4A.8 Client and location

Use the official `redis` package (node-redis). Do not add ioredis.

Cache access belongs in `backend/src/shared/cache/`. Business modules use the
shared cache service from their service layer. Controllers and repositories must
not read or write the cache directly.

Two client settings exist specifically to protect the rules above:

- The offline command queue is disabled, so a command fails immediately when
  Redis is down rather than waiting for a reconnection that may never come.
- An error listener is always attached. node-redis is an EventEmitter, and an
  unhandled error event would terminate the process — turning a brief network
  problem into a backend outage.

---

# 5. API Conventions and Response Format

## 5.1 API base path

Greenstone business endpoints use:

**`/api/v1`**

Examples:

- `/api/v1/customers`
- `/api/v1/orders`
- `/api/v1/production`
- `/api/v1/invoices`

Better Auth owns a separate base path:

**`/api/auth`**

The conventions in this section apply to `/api/v1` only. Better Auth defines its
own request and response formats, and they must not be wrapped or rewritten.

## 5.2 Route naming

Rules:

- Use plural nouns.
- Use lowercase paths.
- Use hyphens between words.
- Keep routes predictable.
- Use action routes only for real business actions.

Examples of business actions:

- Approve payment.
- Reverse payment.
- Dispatch delivery.
- Release curing record.
- Override customer credit.
- Adjust stock.

## 5.3 HTTP methods

- `GET` — read data.
- `POST` — create records or perform business actions.
- `PATCH` — update allowed fields.
- `DELETE` — only for permitted draft or removable records.

Issued financial, stock, and official documents must not use permanent deletion.

## 5.4 Success response

A successful response should contain:

| Field | Purpose |
|---|---|
| `success` | Always true |
| `data` | Returned record or records |
| `meta` | Optional pagination or summary information |
| `requestId` | Unique request identifier |

## 5.5 Error response

An error response should contain:

| Field | Purpose |
|---|---|
| `success` | Always false |
| `error.code` | Stable application error code |
| `error.message` | Clear user-safe message |
| `error.fieldErrors` | Optional validation details |
| `requestId` | Unique request identifier |

Internal stack traces must never be returned in production.

## 5.6 Standard error codes

Recommended codes include:

- `VALIDATION_ERROR`
- `AUTHENTICATION_REQUIRED`
- `INVALID_CREDENTIALS`
- `SESSION_EXPIRED`
- `PERMISSION_DENIED`
- `RESOURCE_NOT_FOUND`
- `RESOURCE_CONFLICT`
- `BUSINESS_RULE_VIOLATION`
- `CUSTOMER_CREDIT_BLOCKED`
- `INSUFFICIENT_FINISHED_STOCK`
- `INSUFFICIENT_RAW_MATERIAL`
- `CURING_NOT_COMPLETE`
- `INVALID_DOCUMENT_STATUS`
- `DUPLICATE_DOCUMENT`
- `FILE_VALIDATION_FAILED`
- `INTERNAL_SERVER_ERROR`

## 5.7 Status codes

- `200` — successful read or update.
- `201` — successful creation.
- `204` — successful operation with no response body.
- `400` — invalid request.
- `401` — authentication required.
- `403` — permission denied.
- `404` — record not found.
- `409` — conflict or invalid business state.
- `422` — validation or business-rule failure.
- `429` — too many requests.
- `500` — unexpected server error.

## 5.8 Pagination

List endpoints should support:

- Page.
- Page size.
- Search.
- Status filters.
- Date range.
- Sorting.

Pagination metadata should include:

- Current page.
- Page size.
- Total records.
- Total pages.

## 5.9 Data formats

- Field names use `camelCase`.
- Enum values use uppercase names.
- Dates use ISO 8601.
- Money is returned as decimal strings.
- Raw-material decimal quantities are returned as decimal strings.
- Piece quantities are returned as integers.
- All records expose internal IDs and human-readable document numbers where applicable.

## 5.10 Request safety

Sensitive creation or action endpoints should support duplicate-request protection.

This is important for:

- Payments.
- Payment approval.
- Salary approval.
- Delivery dispatch.
- Stock adjustments.
- Credit overrides.
- Invoice creation.

---

# 6. Authentication and Permission Architecture

## 6.1 Authentication framework

Better Auth is the only authentication framework for this project.

Use:

- Better Auth with Express.
- The Better Auth Prisma adapter with MySQL.
- Email and password login.
- Better Auth database-backed sessions.
- Secure HTTP-only cookies.
- The Better Auth Admin plugin.
- Custom Better Auth access control.

Do not build:

- Custom JWT access tokens.
- Refresh tokens or refresh-token rotation.
- Custom password hashing.
- Custom session tables.
- Custom authentication cookies.
- Custom authentication endpoints.

Do not enable public registration, social login, magic links, passkeys,
organization or multi-tenant plugins, the JWT plugin, user impersonation, or
automatic authentication emails.

Do not use another authentication provider.

The Better Auth handler is mounted at `/api/auth/*`, which is outside the
`/api/v1` Greenstone base path. Better Auth owns those endpoints, their request
and response formats, and their cookies.

Recommended cookie rules in production:

- `HttpOnly`.
- `Secure`.
- Same-site protection.
- Clear expiration.

## 6.2 Session management

Sessions are stored in the database, so revocation takes effect immediately.
There is no window in which a revoked session remains valid.

Sessions must be revoked when:

- A user signs out.
- A user is deactivated.
- A user's role changes.
- An authorised user forces a sign-out.

## 6.3 Password security

Password hashing is handled entirely by Better Auth. Do not create a custom
password-hashing system.

Passwords must never be logged or returned.

Login requires:

- Rate limiting.
- Safe error messages that do not reveal whether an account exists.
- Temporary protection after repeated failed attempts.

## 6.4 CSRF protection

Because authentication uses cookies, state-changing requests require CSRF
protection.

Better Auth protects its own `/api/auth/*` endpoints using same-site cookies and
origin checks.

Greenstone `/api/v1` business routes authenticate with the Better Auth session
cookie, so they still require their own CSRF protection:

- Same-site cookies.
- CSRF token validation.
- Origin checks where practical.

## 6.5 Role permissions

The backend uses fixed roles, defined once using Better Auth custom access
control:

| Role | Better Auth name |
|---|---|
| Super Admin | `super_admin` |
| Admin | `admin` |
| Accountant | `accountant` |

Roles and permissions are declared with `createAccessControl` and passed to the
Admin plugin. `super_admin` and `admin` are configured as admin roles.

Permission definitions live in `src/shared/auth/`. The approved role and
permission matrix is recorded in `docs/permissions-matrix.md`.

Do not create separate permission files inside each module.

Better Auth permissions control system access. Greenstone services still
validate business state such as stock, credit, payments, salaries, and status
transitions.

## 6.6 Special capability grants

Use user-specific capability grants only for confirmed conditional actions.

Examples:

- Accountant may release cured products when authorised.
- Accountant may register salary payments when permitted.

Super Admin or Admin may grant or remove these supported capabilities.

Every grant or removal must be audited.

## 6.7 Backend permission flow

For protected requests:

1. Authentication middleware resolves the Better Auth session.
2. Active-user status is checked. Deactivated users have no valid session.
3. Role permission is checked using Better Auth access control.
4. Special capability is checked where required.
5. The service checks business conditions.
6. The action is completed inside a transaction when sensitive.
7. An audit log is created.

Controllers must never call Better Auth directly. Services call Better Auth
server APIs, receiving request headers as a plain value rather than an Express
request object.

---

# 7. Audit-Log Architecture

## 7.1 Audit-log principles

Audit logs must be:

- Append-only.
- Permanent.
- Searchable.
- Read-only from normal application actions.
- Created by backend services.
- Connected to the business record.

Users must not manually create or edit audit logs.

## 7.2 Audit-log fields

Each audit record should store:

- Audit ID.
- User ID.
- User name snapshot.
- User role snapshot.
- Action.
- Module.
- Entity type.
- Entity ID.
- Document number where available.
- Previous information.
- Updated information.
- Written reason where required.
- Request ID.
- IP address where available.
- User-agent information.
- Date and time.

Before and after information may be stored using MySQL JSON fields.

Sensitive secrets and passwords must never be stored in audit logs.

## 7.3 Actions requiring audit logs

Audit logs are mandatory for:

- User creation.
- Role change.
- User activation or deactivation.
- Capability grants.
- Settings changes.
- Curing-duration changes.
- Curing release.
- Production allocation.
- Broken-product recording.
- Opening stock.
- Stock adjustment.
- Stock correction.
- Delivery dispatch.
- Dispatched-delivery correction.
- Customer opening balance.
- Supplier opening balance.
- Credit override.
- Invoice issue or void.
- Customer payment approval.
- Customer payment reversal.
- Purchase payment correction or reversal.
- Receipt issue.
- Salary approval.
- Salary correction.
- Salary reversal.
- Permanent file upload.
- Any attempted sensitive action that is rejected for a major business rule.

## 7.4 Transaction rule

When an action changes business data and creates an audit record, both should be completed in the same database transaction where possible.

The business change must not succeed while its required audit record fails.

---

# 8. File Upload and Permanent Storage Plan

## 8.1 Files included in the MVP

File storage is needed for items such as:

- Customer payment evidence.
- Purchase payment evidence.
- Expense evidence.
- Generated invoice PDFs.
- Generated receipt PDFs.

## 8.2 Storage architecture

Use a storage abstraction.

The backend business modules must not depend directly on a specific storage provider.

Recommended environments:

- Development: private local filesystem.
- Test: temporary isolated storage.
- Production: private S3-compatible object storage.

The exact production storage provider may be selected during deployment.

## 8.3 Security rules

Uploaded files must:

- Use generated storage keys.
- Never trust the original file name.
- Be stored outside the public web directory.
- Require authentication and permission before access.
- Be checked using MIME type and file signature.
- Use an approved file-type list.
- Use a configured maximum file size.
- Reject executable files.
- Store a checksum.
- Store the uploader and upload time.

## 8.4 File access

Do not expose private storage paths directly.

Files should be accessed using:

- Short-lived signed URLs, or
- An authenticated backend download endpoint.

Access must follow the permission of the related business record.

## 8.5 Permanent evidence

Customer payment evidence must be permanent.

Permanent files:

- Cannot be physically deleted through normal application actions.
- May be marked as replaced or inactive only when a controlled correction exists.
- Must remain included in backups.
- Must keep their audit history.

## 8.6 Database metadata

The database stores file metadata.

The actual file binary stays in the selected storage system.

Do not store large file binaries directly in MySQL.

## 8.7 Backup rules

Production file storage must have:

- Regular backups or storage versioning.
- Restore testing.
- Restricted access credentials.
- Separate production and development locations.

---

# 9. PDF Document Plan

## 9.1 Confirmed PDF documents

The MVP requires official PDFs for:

- Invoices.
- Receipts.

**Quotations removed (2026-08-02):** Quotations are not part of the planned
system — see `docs/decisions/business-workflow-update-2026-08-02.md`. A
Quotation PDF was built in Phase 5A; it is out of scope going forward and
removed in a future sub-phase.

Other PDFs must not be added unless approved.

## 9.2 Generation location

PDFs must be generated by the backend.

The frontend must not create official financial PDFs from browser-only data.

The backend must load the official record from the database before generating the PDF.

## 9.3 Recommended PDF method

Use a backend HTML-to-PDF renderer.

A Playwright-based renderer is recommended because it supports:

- A4 pages.
- HTML and CSS layouts.
- Headers and footers.
- Consistent fonts.
- Print styling.
- Multi-page documents.

## 9.4 Draft and issued documents

Draft preview:

- May be generated temporarily.
- Does not become the official permanent document.

Issued document:

- Uses the official document number.
- Uses database price snapshots.
- Is generated from saved business data.
- Is stored permanently.
- Receives a checksum.
- Must not silently change.

## 9.5 PDF template data

PDF templates use configurable company settings such as:

- Company name.
- Logo.
- Address.
- Phone number.
- Email.
- Payment details.
- Footer notes.

Unknown real company data must not block development.

Development may use clearly marked demo company information.

Real information will be entered during production setup.

## 9.6 PDF history

If an allowed business correction changes an official document:

- The old PDF must remain traceable.
- A new generated version may be stored.
- The correction must be audited.
- Existing document numbers must not be reused.

Issued receipts remain immutable until a future correction process is approved.

---

# 10. Document-Numbering Architecture

## 10.1 Formats

| Document | Format |
|---|---|
| Order | `ORD-YYYY-0001` |
| Production | `PRD-YYYY-0001` |
| Delivery | `DEL-YYYY-0001` |
| Invoice | `INV-YYYY-0001` |
| Receipt | `RCP-YYYY-0001` |
| Purchase | `PUR-YYYY-0001` |
| Customer Payment | `PAY-YYYY-0001` |
| Purchase Payment | `PPY-YYYY-0001` |
| Salary Payment | `SAL-YYYY-0001` |
| Expense | `EXP-YYYY-0001` |

**Quotation removed (2026-08-02):** the `QUO-YYYY-0001` format previously
listed here is out of scope going forward — quotations still exist in the
current codebase but are removed in a future sub-phase.

## 10.2 Central numbering service

Number generation belongs in:

- `backend/src/shared/numbering/`

Business modules call the shared numbering service from their service layer.

Controllers and routes must never generate numbers.

## 10.3 Database locking

Use the `DocumentSequence` table.

For every number:

1. Start a database transaction.
2. Lock the sequence row for document type and year.
3. Create the row if the year has no sequence yet.
4. Increase the sequence.
5. Format the official number.
6. Create the business document.
7. Commit the transaction.

This prevents two simultaneous requests from receiving the same number.

## 10.4 Numbering rules

- Every document type has its own sequence.
- Sequences restart each calendar year.
- Use Africa/Nairobi calendar year for sequence selection.
- Numbers must be unique.
- Numbers must not be manually edited.
- Cancelled or voided numbers are not reused.
- Gaps are allowed.
- A number must never move to another record.
- Unique database constraints must protect every official number.

---

# 11. Error Handling and Validation Standards

## 11.1 Validation layers

Use validation in three places:

1. Frontend Zod validation for user experience.
2. Backend Zod validation for security.
3. Database constraints for final data protection.

The backend must never trust frontend validation.

## 11.2 Backend validation

Zod validators must validate:

- Route parameters.
- Query parameters.
- Request bodies.
- File metadata.
- Enum values.
- Money and quantity formats.
- Date relationships.

Examples:

- Due date cannot be before invoice date.
- Broken quantity cannot exceed produced quantity.
- Allocation cannot exceed remaining order quantity.
- Delivery cannot exceed reserved stock.
- Credit override requires a reason.

## 11.3 Business validation

Business rules belong in services.

Examples:

- Credit status calculation.
- Stock availability.
- Curing completion.
- Invoice-to-order relationship.
- Payment allocation.
- Approval permission.
- Document status transition.
- Duplicate salary-period checks.

Repositories must not contain these decisions.

## 11.4 Central error handling

Use one global Express error handler.

It must:

- Convert known application errors into safe API responses.
- Add the request ID.
- Log unexpected errors.
- Hide internal details in production.
- Return consistent status codes.

## 11.5 Logging

Use structured server logs.

Logs should include:

- Request ID.
- Method.
- Path.
- Status.
- Duration.
- User ID where available.
- Error code.

Do not log:

- Passwords.
- Session tokens.
- Authentication cookies.
- Full payment evidence.
- Sensitive file contents.

## 11.6 Conflict prevention

Use database transactions and row locking for:

- Finished stock.
- Raw-material stock.
- Customer balances.
- Supplier balances.
- Document numbering.
- Payment approval.
- Salary approval.
- Delivery dispatch.

Use a record version where useful to reject stale updates.

---

# 12. Development and Production Environments

## 12.1 Required environments

Use four separate environments:

- Development.
- Test.
- Staging.
- Production.

## 12.2 Development

Development environment uses:

- Local frontend.
- Local backend.
- Local MySQL database.
- Local private file storage.
- Demo seed data.
- Demo company settings.
- Development-only credentials.

Development may include demo:

- Customers.
- Employees.
- Suppliers.
- Drivers.
- Vehicles.
- Products.
- Stock.
- Balances.

## 12.3 Test

The test environment uses:

- A separate test database.
- Temporary file storage.
- Automated database cleanup.
- Controlled test data.

Tests must never use the development or production database.

## 12.4 Staging

Staging should be close to production.

Use:

- Separate database.
- Separate file storage.
- Test users.
- No real payment evidence.
- No production credentials.
- No automatic demo insertion after initial setup.

Staging is used for final acceptance testing.

## 12.5 Production

Production must use:

- HTTPS.
- Production MySQL.
- Production-only storage.
- Strong secret values.
- No demo business data.
- Real company settings.
- Backups.
- Monitoring.
- Restricted server access.

## 12.6 Environment variables

Separate frontend and backend environment files.

Backend configuration includes:

- Application environment.
- Port.
- Database connection.
- Redis connection.
- Better Auth secret.
- Better Auth base URL.
- Session lifetime.
- Cookie settings.
- Frontend origin.
- Storage provider.
- Storage credentials.
- PDF configuration.
- File limits.
- Logging level.

There are no JWT secrets and no access or refresh token lifetimes. Better Auth
manages session lifetime.

Frontend configuration includes only values safe for browser exposure.

Secrets must never use a public frontend prefix.

## 12.7 Production seed

Production seed may create only:

- Fixed roles.
- Permission definitions.
- Required statuses.
- Required system configuration.
- Confirmed initial products.
- Initial Super Admin when safely configured.

It must not create demo:

- Customers.
- Employees.
- Suppliers.
- Drivers.
- Vehicles.
- Balances.
- Stock quantities.
- Payments.
- Expenses.

---

# 13. Deployment Architecture

## 13.1 Recommended production layout

Use one main domain with the API behind the same origin.

Nginx is a deployment concern only. It is not used during local development.

Example architecture:

- Nginx receives HTTPS traffic.
- `/` routes to Next.js.
- `/api/v1` routes to Express.
- `/api/auth` routes to Express.
- MySQL is private.
- Redis is private.
- File storage is private.
- Only Nginx is publicly exposed.

Both `/api/v1` and `/api/auth` must reach Express. Routing only `/api/v1` would
leave authentication unreachable in production.

This simplifies:

- Secure cookies.
- CORS.
- CSRF protection.
- Mobile browser access.

## 13.2 Application processes

Recommended VPS process layout:

- Next.js production process.
- Express API process.
- Optional scheduled-task process when separated later.

Use a process manager such as PM2.

Each process must:

- Restart after failure.
- Start after server reboot.
- Write controlled logs.
- Use production environment variables.

## 13.3 Nginx

Nginx is responsible for:

- HTTPS termination.
- Redirecting HTTP to HTTPS.
- Routing frontend traffic.
- Routing API traffic.
- Request-size limits.
- Security headers.
- Compression.
- Static asset caching.

Private uploaded files must not be exposed as a normal public directory.

## 13.4 Database security

MySQL must:

- Not be publicly exposed.
- Use a dedicated application user.
- Use strong credentials.
- Allow only required privileges.
- Receive regular backups.
- Keep migration history.

## 13.5 Health endpoints

Provide:

- Liveness endpoint.
- Readiness endpoint.

Readiness may check:

- Database availability.
- Required configuration.
- Storage connection where practical.

Health endpoints must not expose secrets.

## 13.6 Scheduled internal alerts

MVP internal alert checks may run through a scheduled backend process for:

- Curing completion.
- Overdue invoices.
- Low raw-material stock.
- Customer credit status.

Scheduled tasks must avoid creating duplicate notifications.

## 13.7 Backups

Production requires:

- Daily MySQL backups.
- File-storage backup or versioning.
- Backup retention policy.
- Encrypted backup transfer where used.
- Regular restore testing.
- A documented recovery process.

## 13.8 Deployment steps

A production deployment should:

1. Back up the current database.
2. Pull or upload the approved release.
3. Install locked dependencies.
4. Run validation and tests.
5. Run Prisma migrations.
6. Build backend.
7. Build frontend.
8. Restart application processes.
9. Check health endpoints.
10. Verify login and a safe read-only workflow.
11. Review logs.

---

# 14. Testing Strategy

## 14.1 Backend unit tests

Focus on service-layer business rules.

Critical tests include:

- Pallet-to-piece calculation.
- Broken and usable quantities.
- Production allocation.
- Excess production.
- Two-day curing restriction.
- Three-day-to-two-day change.
- Credit thresholds.
- Credit override.
- Stock reservation.
- Dispatch reduction.
- Stock adjustment.
- Supplier balance.
- Customer balance.
- Price snapshots.
- One-order-to-one-invoice rule.
- Payment allocation.
- Salary approval.

## 14.2 Repository integration tests

Use a real isolated MySQL test database.

Test:

- Prisma queries.
- Unique constraints.
- Transactions.
- Row locking.
- Document-number concurrency.
- Balance updates.
- Rollbacks.
- Migrations.

Do not replace all database testing with mocks.

## 14.3 API integration tests

Test:

- Authentication.
- Permissions.
- Validation.
- Response format.
- Status codes.
- File upload.
- PDF download.
- Sensitive business actions.

## 14.4 Frontend component tests

Test:

- Forms.
- Validation messages.
- Permission-based actions.
- Status badges.
- Mobile list cards.
- Calculated display values.
- Loading and error states.

## 14.5 End-to-end tests

Use browser-based end-to-end tests for major workflows.

Critical workflows:

1. Customer → order → invoice (2026-08-02 — quotations removed from this
   flow).
2. Order → production → curing → finished stock.
3. Finished stock → reservation → dispatch → delivery.
4. Invoice → payment → approval → receipt.
5. Purchase → raw-material stock → supplier payment.
6. Employee → salary registration → approval.
7. Credit warning → block → Admin override.
8. Stock adjustment with audit history.

## 14.6 Security tests

Test:

- Unauthenticated access.
- Wrong-role access.
- Cookie security.
- CSRF protection.
- Session revocation takes effect immediately.
- Public sign-up is rejected.
- Deactivated users lose access and their sessions are revoked.
- File-type validation.
- Path traversal.
- Rate limiting.
- Sensitive information in errors and logs.

## 14.7 Concurrency tests

Test simultaneous requests for:

- Document numbers.
- Stock reservations.
- Delivery dispatch.
- Customer payment approval.
- Supplier payments.
- Customer balances.
- Stock adjustments.

## 14.8 PDF tests

Test:

- Correct document number.
- Correct customer.
- Correct price snapshots.
- Correct totals.
- A4 layout.
- Multi-page documents.
- Permanent file storage.
- Repeated download.

## 14.9 Seed and environment tests

Test:

- Development seed creates demo data.
- Production seed does not create demo business records.
- Demo cleanup works.
- Production build fails when required secrets are missing.

## 14.10 Mobile acceptance testing

Test on:

- Android phone browsers.
- iPhone Safari.
- Tablet.
- Small laptop.
- Desktop.

Check:

- Navigation.
- Forms.
- Dialogs.
- Tables and cards.
- Numeric input.
- PDF download.
- File upload.
- Slow network behaviour.

---

# 15. Phase-by-Phase Implementation Plan

## Implementation Phase 0 — Documentation and repository foundation

Prepare:

- Monorepo.
- Root documentation.
- Root CLAUDE.md.
- Frontend CLAUDE.md.
- Backend CLAUDE.md.
- Environment examples.
- Formatting and linting.
- CI validation.
- Empty frontend and backend applications.

Completion gate:

- Both applications build.
- Documentation is committed.
- No business code is added yet.

## Implementation Phase 1 — Backend foundation

Build:

- Express application structure.
- Prisma connection.
- Central configuration.
- Central errors.
- Standard API responses.
- Request IDs.
- Logging.
- Security middleware.
- Zod validation middleware.
- Transaction helpers.
- Audit-log infrastructure.
- Document-numbering infrastructure.
- Storage abstraction.
- PDF abstraction.

Completion gate:

- Health endpoints work.
- Test database works.
- Numbering concurrency test passes.

## Implementation Phase 2 — Authentication, users, and permissions

Build:

- Better Auth configuration with the Prisma adapter.
- Email and password login.
- Logout.
- Database-backed sessions.
- Secure cookies.
- Public sign-up disabled.
- User creation by Super Admin and Admin only.
- User activation and deactivation.
- Session revocation.
- Fixed roles through Better Auth access control.
- Special capability grants.
- Permission middleware.
- Authentication audit logs.

Completion gate:

- Role checks pass.
- Deactivated users lose access.
- Token reuse protection works.

## Implementation Phase 3 — Frontend shell and authentication

Build:

- Login page.
- Authenticated layout.
- Desktop sidebar.
- Mobile navigation.
- Header.
- Theme support.
- API client.
- TanStack Query setup.
- Session-expired handling.
- Permission-aware interface helpers.

Completion gate:

- Login works on desktop and mobile.
- Protected pages redirect correctly.

## Implementation Phase 4 — Master data

Build backend and frontend for:

- Customers.
- Customer addresses.
- Products.
- Measurement units.
- Raw materials.
- Suppliers.
- Employees.
- Drivers.
- Vehicle Owners (2026-08-02 — replaces the Company/Hired vehicle split below).
- Vehicles, each with a registered Vehicle Owner (revised 2026-08-02).
- Settings.

Add the development demo seed.

Completion gate:

- All master data can be created and updated.
- Demo data is clearly identified.
- Production seed remains clean.

## Implementation Phase 5 — Orders and customer credit (revised 2026-08-02)

**Quotations removed:** this phase originally began with Quotations and
"orders from quotations." That is out of scope going forward — see
`docs/decisions/business-workflow-update-2026-08-02.md`. Quotations were
still built as part of this phase (Phase 5A) before the change was confirmed;
their removal is tracked separately (`docs/implementation-plan.md` Phase 6C).

Build:

- Direct orders (every order created directly, no quotation step).
- Order items.
- Customer opening balances.
- Credit-status calculation.
- Credit block.
- Admin override.

Completion gate:

- Price changes do not affect history.
- Credit thresholds work.

**Still pending (see Phase 6C–6E in `docs/implementation-plan.md`):**
`Order.paymentArrangement` rename (`PREPAID`/`CREDIT`, replacing
`paymentType`'s `CASH`/`CREDIT`), removal of `sourceQuotationId`/
`sourceQuotationItemId`, and the projected-exposure credit formula that
includes the new order's own total.

## Implementation Phase 6 — Production and curing

Build:

- Production batches.
- Pallet calculations.
- Broken and usable quantities.
- Order allocation.
- Excess production.
- Actual raw-material usage.
- Curing records.
- Two-day and three-day rules.
- Duration-change audit.
- Curing release.

Completion gate:

- Early release is blocked.
- Excess production enters general stock correctly.
- Raw-material usage is traceable.

## Implementation Phase 7 — Raw materials, purchases, and supplier balances

Build:

- Raw-material ledger.
- Opening raw-material quantities.
- Purchase records.
- Purchase items, including Pumice's cubic-metre snapshot fields (length,
  width, height, volume per load, number of loads, total volume, rate per
  cubic metre — 2026-08-02, see section 4.10) and Cement's sack-based
  quantity × unit-cost (no additional fields needed; unit name confirmed
  "Sack" 2026-08-03).
- Purchase numbering.
- Supplier opening balances.
- Purchase payments.
- Supplier balance calculation.
- Low-stock alerts.

Completion gate:

- Purchases increase raw stock.
- Actual production usage reduces stock.
- Supplier balances do not double-count expenses.
- Pumice cost calculates as `volume × rate`, not weight or bag count.

## Implementation Phase 8 — Finished stock and deliveries

Build:

- Finished-stock ledger.
- Opening finished stock.
- Stock reservations.
- Available-stock calculation.
- Stock adjustments.
- Broken-product records.
- Deliveries, snapshotting driver, vehicle, vehicle owner, transport rate,
  number of trips, total transport cost, and payee (2026-08-02, see section
  4.11). Payee is the registered Vehicle Owner (the Driver, if they own the
  vehicle). Current transport rate: KES 8,500 per trip.
- Single-product truck-trip calculation using the product's
  `maxPiecesPerTruck` (2026-08-02): `requiredTrips = ceiling(deliveryQuantity
  / maxPiecesPerTruck)`, snapshotted onto the delivery. Mixed-product truck
  loads are not confirmed — do not implement.
- Partial deliveries.
- Dispatch.
- Pre-dispatch cancellation.
- Post-dispatch correction.

Completion gate:

- Planned delivery does not reduce physical stock.
- Dispatch permanently reduces stock.
- Cancellation releases reservations.
- All corrections are audited.
- A later change to a product's `maxPiecesPerTruck` does not alter an
  already-recorded delivery's trip count.

## Implementation Phase 9 — Invoices, customer payments, and receipts

Build:

- Strict one-to-one order and invoice relationship.
- Invoice item price snapshots.
- Manual due date.
- Invoice PDF.
- Customer payments.
- Method-specific evidence.
- Payment allocation.
- Approval.
- Reversal.
- Receipt creation.
- Receipt PDF.
- Customer statements.

Completion gate:

- One order cannot create two invoices.
- Only approved payments reduce balances.
- Reversal restores balances.
- Receipt is generated from approved payment.

## Implementation Phase 10 — Expenses and salaries

Build:

- General expenses.
- Expense evidence.
- Employees.
- Weekly salaries.
- Monthly salaries.
- Salary registration.
- Approval.
- Correction.
- Reversal.
- Audit history.

Completion gate:

- Salary records stay separate from general expenses.
- Accountant cannot approve or reverse salaries.

## Implementation Phase 11 — Dashboard, reports, and alerts

Build:

- Dashboard summaries.
- Operational reports.
- Approved financial reports.
- Curing-completion alerts.
- Overdue-invoice alerts.
- Credit alerts.
- Low-stock alerts.
- Payment-approval alerts.
- Responsive charts.

Completion gate:

- Accountant sees operational reports only as approved.
- Alerts do not create duplicate records.

## Implementation Phase 12 — Hardening and production preparation

Complete:

- Full automated tests.
- Security testing.
- Mobile testing.
- Performance checks.
- Backup setup.
- Staging deployment.
- Production deployment documentation.
- Demo-data removal verification.
- Production setup screens.
- User training preparation.

Completion gate:

- Production seed contains no demo business records.
- Backup restore test succeeds.
- Critical workflows pass acceptance testing.

---

# 16. Recommended CLAUDE.md Instructions

## 16.1 Root CLAUDE.md

### Project purpose

This repository contains the Greenstone Management System.

The approved business blueprint and technical blueprint are the source of truth.

Read these before making changes:

- `docs/business-blueprint.md`
- `docs/technical-blueprint.md`
- `docs/permissions-matrix.md`
- `docs/api-conventions.md`

### Repository layout

- `frontend/` — Next.js 16 application.
- `backend/` — Express and Prisma API.
- `docs/` — approved project documentation.
- `scripts/` — development and production-support scripts.

### General rules

- Do not invent business requirements.
- Do not change approved workflows without explicit instruction.
- Work in small implementation phases.
- Do not implement future phases early.
- Keep frontend and backend responsibilities separate.
- Do not place real company data in source control.
- Do not mix demo and production data.
- Do not hard-delete issued financial, stock, payment, salary, or audit records.
- Keep sensitive actions traceable.
- Add or update tests for every business-rule change.
- Update documentation when an approved technical decision changes.
- Do not add unnecessary libraries.
- Prefer simple, maintainable solutions.

### Data rules

- Money must use decimal values.
- Product pieces must use whole numbers.
- Raw-material quantities may use decimal values.
- Dates are stored in UTC.
- User-facing dates use Africa/Nairobi.
- Official document numbers are generated only by the backend.
- Historical price snapshots must never depend on current product values.

### Git and delivery rules

- Keep changes focused.
- Do not combine unrelated modules in one change.
- Run validation, tests, and builds before reporting completion.
- Clearly list changed files.
- Clearly report migrations.
- Never run destructive production commands automatically.

## 16.2 Frontend CLAUDE.md

### Technology

Use:

- Next.js 16 App Router.
- TypeScript.
- Tailwind CSS v4.
- shadcn/ui.
- TanStack Query.
- React Hook Form.
- Zod.
- Lucide React.
- Recharts.
- Sonner.
- next-themes.

### Architecture rules

- Use App Router.
- Use Server Components by default.
- Use Client Components only for interaction.
- Keep route pages thin.
- Put feature logic inside `features/`.
- Use one central API client.
- Use TanStack Query for server state.
- Use React Hook Form and Zod for forms.
- Do not place backend business rules in frontend components.
- Do not import backend source files.
- Do not create duplicate business APIs using Next.js route handlers.
- The Express API is the backend source of truth.

### Authentication

- Use the Better Auth client.
- Use email and password on the login page.
- Use Better Auth session APIs for current-user state.
- Authentication uses secure HTTP-only cookies.
- Do not store authentication data in localStorage.
- Do not build custom token-refresh logic.

### Permissions

- Use permission helpers to show or hide interface actions.
- Backend permission checks remain mandatory.
- Do not treat hidden buttons as security.
- Show clear permission-denied messages.

### UI rules

- Design mobile first.
- Keep one main action per page.
- Use cards on small screens instead of wide tables.
- Use clear labels.
- Use large touch targets.
- Do not rely only on colour for status.
- Use Lucide icons with text for important actions.
- Use Sonner for user feedback.
- Support light and dark mode.

### Form rules

- Every form uses React Hook Form and Zod.
- Show field errors below fields.
- Prevent duplicate submission.
- Confirm sensitive actions.
- Use numeric inputs for money and quantities.
- Use searchable selectors for large record lists.

### Data rules

- Display money as KES.
- Do not use JavaScript floating-point calculations for official financial totals.
- Display backend-calculated totals as the source of truth.
- Use URL parameters for filters and pagination where practical.
- Invalidate only affected TanStack Query caches.

### Testing

- Test critical forms.
- Test mobile layouts.
- Test permission-based actions.
- Test loading, empty, and error states.
- Add end-to-end tests for major workflows.

## 16.3 Backend CLAUDE.md

### Technology

Use:

- Node.js.
- Express.js.
- TypeScript.
- Prisma.
- MySQL.
- Redis for caching.
- Zod.
- Better Auth.
- Secure HTTP-only cookies.

### Module architecture

Every business module must contain exactly six files:

- `<module>.routes.ts`
- `<module>.controller.ts`
- `<module>.service.ts`
- `<module>.repository.ts`
- `<module>.validators.ts`
- `<module>.types.ts`

Do not add other files inside a business module.

Do not create:

- `module.ts`
- `permissions.ts`
- Module-specific middleware files.

### Dependency flow

Always follow:

**Routes → Controller → Service → Repository → Prisma**

### File responsibilities

Routes:

- Define Express routes.
- Attach authentication, permissions, validation, and controller functions.
- Do not contain business logic.

Controllers:

- Read validated request data.
- Call services.
- Return standard responses.
- Do not call Prisma or repositories.

Services:

- Contain all business logic.
- Perform calculations.
- Check status transitions.
- Coordinate cross-module services.
- Start sensitive transactions.
- Create audit logs.
- Do not use Express request or response objects.

Repositories:

- Contain Prisma and MySQL access only.
- Do not make business decisions.
- Do not format HTTP responses.

Validators:

- Contain Zod request schemas.

Types:

- Contain module-specific types, filters, DTOs, and service results.

### Cross-module rules

- Cross-module access happens through services.
- A service must not import another module’s repository.
- Shared infrastructure belongs in `src/shared/`.
- Prisma access outside modules is allowed only in dedicated shared infrastructure repositories or transaction helpers.

### Database rules

- Use Prisma migrations.
- Never edit production data through seed files.
- Use transactions for sensitive operations.
- Use row locking for balances, stock, and numbering.
- Use database uniqueness constraints.
- Store money as decimals.
- Never use floating-point money.
- Keep ledgers for stock and balances.
- Do not hard-delete issued transactional records.

### Authentication rules

- Better Auth is the only authentication framework.
- Never build custom tokens, password hashing, session tables, or
  authentication endpoints.
- Revoke sessions on logout, user deactivation, and role change.
- Use rate limiting on authentication endpoints.
- Use CSRF protection for cookie-authenticated mutations on `/api/v1`.

### Permission rules

- Roles are Super Admin, Admin, and Accountant.
- Permission definitions are shared.
- Do not create module permission files.
- Support only approved user-specific capability grants.
- Check permissions in backend middleware and services.

### Audit rules

- Sensitive actions require audit logs.
- Audit logs are append-only.
- Store previous and updated information.
- Store written reasons where required.
- Complete required audit logs in the same transaction as the business change.

### Numbering rules

- Use the central numbering service.
- Never generate official numbers in controllers or frontend.
- Use separate yearly sequences.
- Never reuse voided or cancelled numbers.
- Protect sequences from simultaneous requests.

### File rules

- Validate MIME type, file signature, and size.
- Store files privately.
- Store metadata in MySQL.
- Store file binaries outside MySQL.
- Keep payment evidence permanently.
- Do not expose private storage paths.

### Error rules

- Use standard application errors.
- Use the global error handler.
- Return safe messages.
- Never expose stack traces in production.
- Include request IDs.
- Do not log secrets.

### Testing rules

- Test service business rules.
- Use a real isolated MySQL database for repository integration tests.
- Test transactions and rollbacks.
- Test document-number concurrency.
- Test permissions.
- Test stock, balances, approvals, and reversals.
- Do not report a phase complete while critical tests fail.

---

# 17. Scope Separation

## 17.1 MVP functionality

The MVP includes:

- Authentication and permissions.
- Customers and addresses.
- Products.
- Orders, with agreed unit-price snapshots per order item (2026-08-02 —
  quotations removed; pricing is agreed directly on the order).
- Production.
- Curing.
- Finished stock.
- Broken products.
- Raw materials.
- Suppliers.
- Purchases.
- Purchase payments.
- Deliveries.
- Drivers and vehicles.
- Invoices.
- Customer payments.
- Receipts.
- Customer credit.
- Expenses.
- Employees.
- Weekly and monthly salaries.
- Internal alerts.
- Reports.
- Audit logs.
- File evidence.
- Official PDFs.
- Document numbering.

## 17.2 Post-MVP Phase 2 features

Not part of the MVP:

- Optional standard product prices.
- Automatic WhatsApp communication.
- Automatic SMS communication.
- Automatic customer emails.
- Website-to-system automation.
- Customer returns.
- Delivery proof uploads.
- Customer signatures.
- Delivery photographs.
- Allowances.
- Salary advances.
- Deductions.
- Overtime.
- Bonuses.
- Discounts.
- VAT and tax calculations.
- Native mobile applications.
- Other advanced financial features not approved in the business blueprint.

## 17.3 Production setup data

Real production data will be entered after the system is built and tested.

This includes:

- Real company name and document details.
- Real users.
- Real customers.
- Real customer addresses.
- Real opening customer balances.
- Real employees.
- Real salaries.
- Real suppliers.
- Real supplier opening balances.
- Real drivers.
- Real company vehicles.
- Real hired vehicles.
- Real raw materials.
- Real measurement units.
- Real reorder levels.
- Real finished opening stock.
- Real raw-material opening stock.

Missing production setup data must not block MVP development.

---

# 18. Final Technical Approval

The technical implementation should now proceed from:

1. Repository and documentation setup.
2. Backend foundation.
3. Authentication and permissions.
4. Frontend application shell.
5. Business modules in the approved implementation order.
6. Testing and staging.
7. Production setup with real company data.

All implementation must preserve:

- The exact six-file backend module structure.
- The required dependency flow.
- Historical price snapshots.
- Strict order-to-invoice relationships.
- Stock and balance ledgers.
- Secure document numbering.
- Permanent payment evidence.
- Immutable issued records.
- Strong audit history.
- Separation of demo and production data.
