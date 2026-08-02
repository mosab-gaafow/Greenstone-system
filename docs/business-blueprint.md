# Greenstone Management System
## Final Approved Business Blueprint

## 1. Blueprint Status

The main Greenstone Management System requirements are approved.

Development may begin after the technical project setup is prepared.

**Amendment (2026-08-02):** confirmed company information changed several
workflow assumptions below — Quotations are removed from the planned system,
Orders are created directly, product operational names and truck capacities
were added, the customer credit formula was split into an accounting balance
and a projected-exposure check, and the Driver/Vehicle model was reworked
around a new Vehicle Owner entity. See
`docs/decisions/business-workflow-update-2026-08-02.md` for the full record.
Sections below are updated to match it; where a section still describes prior
behaviour, the amendment record is authoritative.

Unknown company data will not block MVP development. Safe demo data may be used during development. Real data will be entered during production setup.

The system must remain:

- Mobile-first.
- Fully responsive.
- Simple for non-technical users.
- Secure.
- Fast.
- Suitable for Android, iPhone, tablets, and computers.
- English-only for the MVP.

---

# 2. Final MVP Functionality

## 2.1 Authentication and security

The MVP includes:

- Secure login and logout.
- Better Auth as the only authentication framework.
- Email and password login.
- Database-backed sessions.
- Secure HTTP-only cookies.
- Role-based access control.
- User activation and deactivation.
- Audit logs.
- Secure backend validation.
- Database transactions for sensitive operations.
- Permanent history for important financial and stock actions.

Confirmed roles:

- Super Admin.
- Admin.
- Accountant.

---

## 2.2 Customers

The system must support:

- Customer registration.
- Customer phone number.
- Customer email when available.
- Multiple building-site addresses.
- Customer orders.
- Customer invoices.
- Customer payments.
- Customer outstanding balances.
- Customer credit status.
- Customer operational history.
- Opening customer balances during production setup.

Quotations are not part of the management system — see section 2.5.

### Customer filters (2026-08-02)

Independent of active status and credit status, the customer list supports:

- All customers.
- No outstanding balance (accounting outstanding balance = 0).
- Has outstanding balance (accounting outstanding balance > 0).

The accounting outstanding balance is the one defined in section 2.24, not the
projected credit-risk exposure used only for new credit-order decisions.

---

## 2.3 Products

The initial products are:

### Hollow blocks

- Hollow Blocks 6 × 9
- Hollow Blocks 4 × 9
- Hollow Blocks 9 × 9

### Hollow pots

- Hollow Pot 380 × 200 × 150 mm
- Hollow Pot 380 × 200 × 200 mm
- Hollow Pot 380 × 200 × 300 mm

The product master must contain:

- Product name (the full official name — never renamed or removed).
- Product category.
- Product size.
- Product description when needed.
- Active or inactive status.
- Configurable operational name (2026-08-02) — the short name staff use day to
  day, separate from the official name.
- Configurable maximum pieces per truck (2026-08-02) — see below.

A fixed selling price is not required in the product master.

### Operational names (2026-08-02)

| Official name | Operational name |
|---|---|
| Hollow Blocks 4 × 9 | 4-inch |
| Hollow Blocks 6 × 9 | 6-inch |
| Hollow Blocks 9 × 9 | 9-inch |
| Hollow Pot 380 × 200 × 300 mm | 300mm |

The operational names for Hollow Pot 380 × 200 × 150 mm and 380 × 200 × 200 mm
are **not confirmed**. Leave the field empty for those two until confirmed.

### Truck capacity (2026-08-02)

Each product may have a configurable maximum pieces one truck can carry of
that single product:

| Operational name | Max pieces per truck |
|---|---|
| 4-inch | 1,500 |
| 6-inch | 1,200 |
| 9-inch | 850 |
| 300mm | 750 |

Rules:

- A positive whole number, or empty when not yet known.
- An authorised user may update it later.
- Old delivery records keep a capacity snapshot — a later change must never
  recalculate an already-recorded delivery.
- Single-product delivery calculation:
  `requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)`.
- Mixed-product truck loads are **not** calculated yet — that rule is not
  confirmed.

See `docs/decisions/business-workflow-update-2026-08-02.md` section 3 for how
this interacts with the existing Vehicle truck-load calculation.

---

## 2.4 Product pricing

Greenstone may give different prices to different customers.

The agreed unit price must be entered on each direct order item — there is no
quotation step (see section 2.5).

The agreed order price must be copied to the invoice item.

Every order and invoice item must store its own price snapshot.

Changing a price for a future customer must not change:

- Old orders.
- Old invoices.

The system must not include:

- Item discounts.
- Order discounts.
- Invoice discounts.
- Percentage discounts.
- Fixed discounts.
- VAT calculations.
- Tax calculations.

An optional suggested or standard product price may be added later.

---

## 2.5 Quotations (removed — 2026-08-02)

Quotations are **not part of the Greenstone Management System.** They are
handled entirely outside it, through:

- Company email.
- The Greenstone website contact form.
- Manual communication.

The management system workflow begins directly with an Order (section 2.6).
There is no quotation module, no "convert an accepted quotation into an
order" step, and no quotation PDF.

Quotations were built in an earlier phase before this was confirmed. Removing
the already-built code is tracked separately — see
`docs/decisions/business-workflow-update-2026-08-02.md` and
`docs/implementation-plan.md` Phase 6C.

---

## 2.6 Orders

Every order is created **directly** (2026-08-02) — there is no quotation step
(section 2.5) and no "accepted quotation becomes an order" conversion. The
agreed price is entered on the order item.

The order module must support:

- Several product types and sizes.
- Customer-specific agreed prices.
- A selected customer building-site address.
- Credit orders.
- Prepaid orders (fully paid before dispatch — see the payment arrangement
  rule below; do not call this "cash," which is a payment method, section
  2.23).
- Partial production.
- Excess production.
- Partial deliveries.
- Several delivery trips.
- Ordered quantity tracking.
- Produced quantity tracking.
- Quantity allocated to the order.
- Delivered quantity.
- Remaining quantity.
- Credit-limit validation.

### Order status (2026-08-02)

Every new order starts automatically as `PENDING`. Users must not freely
select the initial status — it is system-controlled. The full status
lifecycle between `PENDING` and the order's completion (after full delivery,
section 2.6's workflow step 13 in the amendment record) is **not yet
confirmed**.

### Payment arrangement (2026-08-02)

Every order has a payment arrangement:

- `PREPAID`
- `CREDIT`

A `PREPAID` order must be fully paid through approved payments before
dispatch. Do not call this arrangement "cash" — cash is a payment *method*
(section 2.23), a separate concept from the order-level payment arrangement.

### Confirmed direct-order workflow (2026-08-02)

1. Register Products.
2. Register Customers.
3. Add Customer Addresses.
4. Create an Order directly.
5. Check customer activity and credit.
6. Use ready finished stock when available.
7. Register Production when stock is insufficient.
8. Register Curing separately for newly produced products.
9. Create Invoice.
10. Record and approve Payment.
11. Prepare and dispatch Delivery.
12. Create Receipt from approved payment.
13. Complete the Order after full delivery.

---

## 2.7 Production

Production may be created for:

- A customer order.
- General finished stock.

One pallet always contains:

**12 pieces**

Calculation:

**Produced quantity = Number of pallets × 12**

The system must display:

- Ordered quantity.
- Produced quantity.
- Broken quantity.
- Usable quantity.
- Quantity allocated to the order.
- Excess quantity.

Calculations:

**Usable quantity = Produced quantity − Broken quantity**

**Excess quantity = Usable quantity − Quantity allocated to the order**

Only the required quantity is allocated to the order.

Any extra usable quantity moves into general finished stock after curing.

The system must also record the actual raw-material quantity used during production.

---

## 2.8 Curing

Every curing record must use one selected duration:

- 2 days.
- 3 days.

The system must store:

- Curing start date and time.
- Selected curing duration.
- Planned completion date and time.
- Actual release date and time.
- Quantity entering curing.
- Broken quantity during curing.
- Released quantity.
- User who created the record.
- User who released the products.

Products cannot be released before completing at least two full days.

When a three-day curing record must be changed to two days:

- An authorised user must make the change.
- A written reason is required.
- The previous duration must remain traceable.
- The user and date must be recorded.
- An audit log must be created.

After curing:

- Order-allocated products become available for the order.
- Excess usable products enter general finished stock.

---

## 2.9 Finished-product stock

The system must separately track:

- Physical stock.
- Reserved stock.
- Available stock.
- Broken stock.

Calculation:

**Available stock = Physical stock − Active reserved stock**

Stock is reserved when the delivery reaches the configured preparation or confirmation stage.

While reserved:

- The products remain physically in stock.
- Other deliveries cannot use them.

A planned delivery must not permanently reduce stock.

Finished stock is permanently reduced when the delivery becomes:

**Dispatched**

If a delivery is cancelled before dispatch:

- Reserved stock is released.
- Physical stock remains unchanged.

A correction after dispatch requires:

- An authorised user.
- Written reason.
- Previous quantity.
- Corrected quantity.
- Stock-correction record.
- Audit log.

---

## 2.10 Opening finished stock

Real opening finished-stock quantities are not required during development.

During development:

- Safe demo stock may be used.
- Demo stock must be clearly separated from production data.

During production setup:

- An authorised user enters the real opening stock.
- Every opening quantity creates a stock movement.
- Every opening quantity creates an audit-log record.
- The user and entry date must remain traceable.

Opening stock must not be entered silently.

---

## 2.11 Broken products

Broken products must be recorded during:

- Production.
- Curing.
- Finished-stock handling.
- Delivery handling where applicable.

Each broken-product record must contain:

- Product.
- Quantity.
- Business stage.
- Date and time.
- Reason or notes.
- Related production, curing, stock, or delivery record.
- User who recorded it.

Broken quantities must reduce usable stock.

---

## 2.12 Raw materials

The raw-material module must support materials such as:

- Cement.
- Dust.
- Pumice.
- Other configured materials.

Each raw material must contain:

- Name.
- Configurable measurement unit.
- Configurable reorder level.
- Current quantity.
- Active or inactive status.

Raw-material usage must be entered using the actual quantity used.

The system must not calculate material usage using a fixed product formula.

---

## 2.13 Raw-material units

Measurement units must be configurable.

An authorised user may create units such as:

- Bag.
- Kilogram.
- Tonne.
- Load.
- Cubic metre.
- Another configured unit.

Each raw material must be connected to one configured measurement unit.

Development may use safe demo units.

The real Greenstone measurement units will be entered later.

Missing real units must not block development.

---

## 2.14 Raw-material reorder levels

Each raw material may have its own reorder level.

The reorder level:

- Must be configurable.
- May remain empty.
- Can be entered or updated later by an authorised user.

A low-stock alert must only activate when a reorder level has been entered.

If the reorder level is empty:

- No low-stock alert is generated.
- Raw-material usage and stock tracking continue normally.

---

## 2.15 Opening raw-material stock

Real opening raw-material quantities are not required during development.

During development:

- Safe demo quantities may be used.

During production setup:

- An authorised user enters the real opening quantities.
- Every opening quantity creates a raw-material stock movement.
- Every opening quantity creates an audit-log record.
- The entry must remain traceable.

---

## 2.16 Suppliers and purchases

The system must allow supplier registration.

Supplier information may include:

- Supplier name.
- Phone number.
- Email when available.
- Address when available.
- Active or inactive status.

The purchase module must support:

- Supplier.
- Purchase date.
- Raw materials purchased.
- Quantity.
- Measurement unit.
- Unit cost.
- Total cost.
- Purchase reference.
- Due amount where applicable.
- Purchase-payment history.

Purchases must increase raw-material stock when received.

### Pumice — cubic-metre calculation (2026-08-02)

Pumice is purchased and costed by volume, not weight or bag count:

```
volumePerLoad = length × width × height
totalVolume = volumePerLoad × numberOfLoads
totalCost = totalVolume × ratePerCubicMetre
```

Current rate: **KES 1,100 per cubic metre.** This is unrelated to, and must
never be confused with, the existing Vehicle truck-load calculation's
`calculationFactor` (also defaulted to `1100`, but meaning kilograms per
cubic metre — see section 2.20 and
`docs/decisions/business-workflow-update-2026-08-02.md`).

Every pumice purchase item snapshots: length, width, height, volume per load,
number of loads, total volume, rate per cubic metre, and total cost. The rate
must be configurable later; old purchases keep the rate used at creation.

### Cement — bag calculation (2026-08-02)

Cement's measurement unit is `BAG`:

```
totalCost = numberOfBags × unitCost
```

Current known unit cost: **KES 850 per bag**, stored as a purchase-item
snapshot (it may change; old purchases keep the cost used at creation).

The reference figure of 170–190 bags used per day is informational only.
Production must record the actual number of bags used — the system must
never automatically consume 170 or 190 bags.

---

## 2.17 Supplier balances

The system must track:

- Total supplier purchases.
- Total supplier payments.
- Current outstanding balance.
- Purchase-payment history.
- Due amounts where applicable.
- Supplier transaction history.

Calculation:

**Supplier outstanding balance = Supplier opening balance + Purchases − Valid purchase payments**

Reversed payments must not reduce the balance.

Purchase payments must remain separate from:

- General expenses.
- Salary payments.
- Customer payments.

A purchase must not be counted again as a general expense.

---

## 2.18 Supplier opening balances

Real supplier opening balances are not required during development.

During development:

- Zero balances or demo balances may be used.

During production setup:

- Real opening balances may be entered.
- The opening balance must remain traceable.
- An audit log must be created.
- It must not be recorded as a new purchase.
- It must not be recorded as a general expense.

---

## 2.19 Deliveries

One order may be delivered through several trips.

Every delivery must contain:

- Order.
- Customer.
- One building-site address.
- Delivery products.
- Delivery quantities.
- Registered driver.
- Registered vehicle.
- Delivery date.
- Delivery status.

The delivery workflow must support:

- Planned delivery.
- Stock reservation.
- Dispatch.
- Delivery completion.
- Pre-dispatch cancellation.
- Controlled post-dispatch correction.

One delivery trip cannot contain several delivery locations.

The MVP does not require:

- Customer signature.
- Delivery photograph.
- Delivery-note upload.
- Proof-of-delivery file.

### Truck capacity and trip count (2026-08-02)

For a delivery of a single product:

```
requiredTrips = ceiling(deliveryQuantity / product.maxPiecesPerTruck)
```

using the product's configured truck capacity (section 2.3). Mixed-product
truck loads are not calculated yet — that rule is not confirmed. Every
delivery keeps a capacity snapshot, so a later change to a product's truck
capacity never recalculates an already-recorded delivery.

### Transport payment (2026-08-02)

Current transport rate: **KES 8,500 per trip.** The payee is always the
Vehicle Owner (section 2.20) — which may be the Driver, if the Driver owns
the vehicle used.

```
totalTransportCost = numberOfTrips × transportRate
```

Every delivery snapshots: driver, vehicle, vehicle owner, transport rate,
number of trips, total transport cost, and payee. A vehicle never stores one
permanent hire cost. Transport cost must never be counted a second time as a
general expense.

---

## 2.20 Drivers, Vehicle Owners, and vehicles (revised 2026-08-02)

The system must allow registration of:

### Drivers

- Driver name.
- Phone number.
- National ID.
- Active or inactive status.
- Delivery history.

### Vehicle Owners (2026-08-02)

A vehicle owner is a separate master-data record from a driver, even when the
same person is both:

- Name.
- Phone number.
- National ID when available.
- Active or inactive status.

### Vehicles (revised 2026-08-02)

- Registration number.
- Vehicle type.
- Registered Vehicle Owner.
- Active or inactive status.
- Delivery history.

A vehicle no longer has an ownership-type category (`Company`/`Hired`) or a
permanent hire cost — every vehicle has a registered owner instead, and
transport cost is recorded per delivery trip (section 2.19), never stored
once on the vehicle.

Do not permanently attach one Driver to one Vehicle. The actual Driver and
Vehicle are selected on every delivery trip.

Safe demo records may be used during development.

Real records will be entered during production setup.

---

## 2.21 Invoice relationship

The relationship between orders and invoices is strictly one-to-one.

Rules:

- One order has exactly one invoice.
- One invoice belongs to exactly one order.
- One order cannot create several invoices.
- One invoice cannot combine several orders.
- An invoice cannot exist without an order.
- Invoice items must come from the selected order.
- One invoice may contain several products and sizes from its order.

The agreed order prices must be copied to invoice items.

---

## 2.22 Invoice due date

The invoice due date must be entered manually.

Rules:

- The system must not assume a default credit period.
- The due date cannot be earlier than the invoice date.
- The due date is used for overdue-invoice alerts.
- A credit invoice must contain a due date.

A default credit period may be configured later.

---

## 2.23 Customer payments

Supported methods:

- M-Pesa.
- Cash.
- Bank transfer.
- Cheque.

Each payment must store payment-method-specific information.

Examples include:

### M-Pesa

- Transaction code.
- Payment date.
- Amount.

### Bank transfer

- Transfer reference.
- Payment date.
- Amount.
- Uploaded document when used.

### Cheque

- Cheque number.
- Cheque details.
- Payment date.
- Amount.

### Cash

- Cash payment information.
- Payment date.
- Amount.
- User who received or recorded the payment.

Every payment must contain valid proof or payment information.

Proof files must be permanently retained.

Only Super Admin and Admin may:

- Approve payments.
- Reverse payments.

The Accountant may record payments but cannot approve or reverse them.

---

## 2.24 Customer credit

The confirmed customer credit limit is:

**KES 1,000,000**

Credit levels:

| Outstanding balance | Credit status |
|---|---|
| Below KES 800,000 | NORMAL |
| KES 800,000–899,999 | WARNING |
| KES 900,000–999,999 | STRONG_WARNING |
| KES 1,000,000 or above | BLOCKED |

### Two calculations, not one (2026-08-02)

**Accounting outstanding balance** — the real financial balance:

**Outstanding balance = Opening balance + Issued invoices − Approved payment allocations**

**Projected exposure** — used only to decide whether a *new* Credit order may
proceed:

**Projected exposure = Current outstanding balance + Active credit orders not yet invoiced + New credit order total**

Uninvoiced orders are not accounting balances. They are included only in the
credit-risk check above — the new order's own total is explicitly part of
that projection, unlike the interim rule used before Invoices existed.

The credit-level thresholds apply to whichever calculation the workflow step
requires: the accounting balance for reporting and the customer filters
(section 2.2), the projected exposure for a new Credit order's decision.

When the projected exposure is blocked:

- The new credit order is blocked.
- New deliveries are blocked.
- Prepaid orders may continue.
- Super Admin or Admin may override the restriction.

Every override requires:

- Written reason.
- User who approved the override.
- Date and time.
- Related order or delivery.
- Audit log.

The KES 1,000,000 credit limit is a fixed business limit.

It must not be confused with a customer's opening balance.

---

## 2.25 Customer opening balances

Real opening customer balances are not required during development.

During development:

- Zero balances or demo balances may be used.

During production setup:

- An authorised user enters the real opening balance.
- The opening balance must remain traceable.
- An audit log must be created.
- The customer credit status must be recalculated immediately.

An opening balance is not a new invoice.

---

## 2.26 Receipts

A receipt is created from an approved customer payment.

An issued receipt:

- Cannot be permanently deleted.
- Cannot be silently edited.
- Must remain traceable when incorrect.

Receipt correction may use a controlled process during later financial improvements.

---

## 2.27 Expenses

General expenses must remain separate from:

- Supplier purchases.
- Purchase payments.
- Salary payments.
- Customer payments.

An expense must contain:

- Expense number.
- Category.
- Description.
- Amount.
- Date.
- Payment method.
- Reference.
- Proof document where available.
- User who recorded it.

Combined reports may show purchases, salaries, and expenses together, but every record must keep its original source.

---

## 2.28 Employees

The MVP must allow employee registration.

Each employee must contain:

- Employee name.
- Phone number.
- Kenyan ID number, optional.
- Job title.
- Weekly or monthly salary type.
- Salary amount.
- Payment method.
- Active or inactive status.

Typical weekly workers include:

- Production workers.
- Block producers.
- Pot producers.
- Curing workers.

Typical monthly employees include:

- Accountant.
- Watchman or security guard.
- Other office employees.

Safe demo employee records may be used during development.

Real employees will be entered before production use.

---

## 2.29 Salaries

The MVP must support simple:

- Weekly salary payments.
- Monthly salary payments.

The MVP does not include:

- Allowances.
- Salary advances.
- Deductions.
- Overtime.
- Bonuses.

Only Super Admin and Admin may:

- Approve salary payments.
- Correct salary payments.
- Reverse salary payments.

The Accountant may register salary-payment information when permission is provided.

Every salary correction or reversal requires:

- Written reason.
- Previous information.
- Updated information.
- User.
- Date and time.
- Audit log.

---

## 2.30 Internal alerts

The MVP includes internal alerts for:

- Low raw-material stock.
- Customer credit warning.
- Customer credit strong warning.
- Customer credit block.
- Payment waiting for approval.
- Curing completion.
- Overdue invoices.

External communication automation is not part of the MVP.

---

# 3. Document Numbering Rules

Use the following formats:

| Document | Format |
|---|---|
| Order | ORD-YYYY-0001 |
| Production | PRD-YYYY-0001 |
| Delivery | DEL-YYYY-0001 |
| Invoice | INV-YYYY-0001 |
| Receipt | RCP-YYYY-0001 |
| Purchase | PUR-YYYY-0001 |
| Customer Payment | PAY-YYYY-0001 |
| Purchase Payment | PPY-YYYY-0001 |
| Salary Payment | SAL-YYYY-0001 |
| Expense | EXP-YYYY-0001 |

Examples:

- QUO-2026-0001
- ORD-2026-0001
- INV-2026-0001

Rules:

1. Numbers are generated automatically by the backend.
2. Every document type has its own sequence.
3. The sequence restarts every calendar year.
4. Generated numbers must be unique.
5. Issued document numbers cannot be edited.
6. Deleted, cancelled, reversed, or voided numbers cannot be reused.
7. A failed business transaction must not create duplicate numbers.
8. Number generation must be safe during simultaneous requests.
9. Users must not manually choose official document numbers.
10. Audit logs must preserve the document number for sensitive actions.

---

# 4. Demo Data and Production Data Rules

## 4.1 Development demo data

Safe demo data may be created for:

- Employees.
- Customers.
- Suppliers.
- Drivers.
- Vehicles.
- Products.
- Finished stock.
- Raw materials.
- Customer balances.
- Supplier balances.

Demo data must be created through a clear development seed process.

Demo data must:

- Be clearly marked as demo or test data.
- Be easy to remove.
- Not depend on real company information.
- Not be mixed with production records.
- Not be automatically inserted during production deployment.

## 4.2 Production data

Production deployment must start without demo business records.

Real company data will be entered during production setup.

This includes:

- Employees.
- Customers.
- Suppliers.
- Drivers.
- Vehicles.
- Raw materials.
- Measurement units.
- Reorder levels.
- Finished opening stock.
- Raw-material opening stock.
- Customer opening balances.
- Supplier opening balances.

## 4.3 Environment separation

Development and production must use separate:

- Environment configuration.
- Databases.
- Seed processes.
- Uploaded files.
- Credentials.

A production seed must contain only required system information, such as:

- Roles.
- Permissions.
- Required system settings.
- Confirmed initial product definitions where approved.
- Required status values.

It must not insert demo customers, employees, balances, vehicles, or stock.

---

# 5. Confirmed Permissions

## 5.1 Super Admin

Super Admin has full system access.

Super Admin may:

- Manage users.
- Activate and deactivate users.
- Change settings.
- Manage all business modules.
- Approve and reverse customer payments.
- Approve, correct, and reverse salary payments.
- Override customer credit blocks.
- Perform stock adjustments.
- View audit logs.

## 5.2 Admin

Admin may:

- Manage users.
- Activate and deactivate users.
- Change settings.
- Manage operational modules.
- Approve and reverse customer payments.
- Approve, correct, and reverse salary payments.
- Override customer credit blocks.
- Perform stock adjustments.
- View audit logs.

## 5.3 Accountant

Accountant may:

- Create and edit customers.
- Manage customer addresses.
- Create orders.
- Register production.
- Register curing information.
- Release products when authorised.
- View and record stock information.
- Register broken products.
- Record raw-material usage.
- Record purchases.
- Record general expenses.
- Create deliveries.
- Manage vehicles and drivers.
- Create invoices.
- Record customer payments.
- View and print receipts.
- Register salary-payment information when permitted.
- View operational reports.
- Perform stock adjustments.

Accountant cannot:

- Approve customer payments.
- Reverse customer payments.
- Approve salary payments.
- Correct salary payments.
- Reverse salary payments.
- Override customer credit blocks.
- Manage system-wide security settings.
- Permanently delete financial records.

---

# 6. MVP Modules

The MVP includes:

- Authentication.
- Users.
- Customers.
- Customer addresses.
- Customer credit.
- Products.
- Orders.
- Production.
- Curing.
- Finished stock.
- Broken products.
- Raw materials.
- Measurement units.
- Suppliers.
- Purchases.
- Purchase payments.
- Vehicle owners.
- Vehicles.
- Drivers.
- Deliveries.
- Invoices.
- Customer payments.
- Receipts.
- Expenses.
- Employees.
- Salaries.
- Notifications.
- Dashboard.
- Reports.
- Audit logs.
- Settings.

---

# 7. Development Phases

## Phase 1 — Foundation and security

Build:

- Project foundation.
- Authentication.
- Secure tokens and cookies.
- Users.
- Roles.
- Permissions.
- Audit logs.
- System settings.
- Document-numbering service.
- Internal notification foundation.

## Phase 2 — Master data and configurable company setup

Build:

- Customers.
- Customer addresses.
- Products.
- Configurable measurement units.
- Raw materials.
- Optional reorder levels.
- Suppliers.
- Employees.
- Drivers.
- Company vehicles.
- Hired vehicles.
- Development demo-seed process.

Unknown real company values will not block this phase.

Safe demo values may be used during development.

## Phase 3 — Orders and pricing snapshots (revised 2026-08-02)

Build:

- Direct orders (no quotation step).
- Customer-specific agreed prices.
- Order items.
- Price snapshots.
- Credit-status calculation.
- Credit warnings.
- Credit blocks.
- Admin override with reason and audit log.

Do not add fixed product pricing, discounts, VAT, or taxes.

Quotations are not part of this system — see section 2.5.

## Phase 4 — Production and curing

Build:

- Production numbering.
- Pallet calculation.
- Broken quantity.
- Usable quantity.
- Order allocation.
- Excess production.
- Actual raw-material usage.
- Two-day and three-day curing.
- Controlled duration changes.
- Curing completion alerts.
- Release to finished stock.

## Phase 5 — Raw materials, purchases, and supplier balances

Build:

- Raw-material movements.
- Opening raw-material movement support.
- Purchases.
- Purchase numbering.
- Supplier balances.
- Supplier opening balances.
- Purchase payments.
- Purchase-payment numbering.
- Low-stock alerts only when reorder levels exist.

## Phase 6 — Finished stock and deliveries

Build:

- Opening finished-stock movement support.
- Physical stock.
- Reserved stock.
- Available stock.
- Delivery preparation.
- Delivery numbering.
- Stock reservation.
- Dispatch stock reduction.
- Delivery correction.
- Vehicle Owners, vehicles, and drivers (revised 2026-08-02 — see section
  2.20).
- Truck-capacity trip calculation and transport-payment snapshots (2026-08-02
  — see section 2.19).
- Partial deliveries.
- Several delivery trips.

## Phase 7 — Invoices, payments, and receipts

Build:

- Strict one-order-to-one-invoice relationship.
- Invoice price snapshots.
- Invoice numbering.
- Manual due dates.
- Customer payments.
- Payment numbering.
- Payment evidence.
- Payment approval.
- Payment reversal.
- Receipt generation.
- Receipt numbering.
- Customer opening balances.
- Customer statements.

## Phase 8 — Expenses and salaries

Build:

- General expenses.
- Expense numbering.
- Employees.
- Weekly salaries.
- Monthly salaries.
- Salary-payment numbering.
- Salary approval.
- Salary correction.
- Salary reversal.
- Separation between expenses, purchases, purchase payments, and salaries.

## Phase 9 — Dashboard, reports, and alerts

Build:

- Operational dashboard.
- Internal alerts.
- Customer credit alerts.
- Overdue invoices.
- Low-stock alerts.
- Curing completion alerts.
- Payment-approval alerts.
- Operational reports.
- Approved financial reports.

## Phase 10 — Testing and production deployment

Complete:

- Security testing.
- Role and permission testing.
- Numbering concurrency testing.
- Stock calculation testing.
- Price snapshot testing.
- Credit threshold testing.
- Credit override testing.
- Opening-balance testing.
- Demo-data removal testing.
- Mobile testing.
- Backup setup.
- Production deployment.

---

# 8. Production Setup Data

The following real information will be entered during production setup:

- Real customers.
- Real customer addresses.
- Real customer opening balances.
- Real suppliers.
- Real supplier opening balances.
- Real employees.
- Real drivers.
- Real company vehicles.
- Real hired vehicles.
- Real raw-material names.
- Real raw-material measurement units.
- Real raw-material reorder levels.
- Real opening raw-material quantities.
- Real opening finished-stock quantities.
- User accounts.
- Employee salary amounts.
- Company details used on printed documents.

Every opening stock or opening balance entry must be traceable and audited.

---

# 9. Phase 2 or Later Features

The following are not required for the MVP:

- Optional standard or suggested product prices.
- External WhatsApp automation.
- External SMS automation.
- Automatic customer emails.
- Automatic website-to-system communication.
- Customer-return workflows.
- Delivery-proof uploads.
- Customer signatures.
- Delivery photographs.
- Advanced salary features.
- Allowances.
- Salary advances.
- Deductions.
- Overtime.
- Bonuses.
- Discounts.
- VAT and tax calculations.
- Advanced financial features not already confirmed.
- Native Android or iPhone applications.

The system may be designed so these can be added later without changing existing historical records.

---

# 10. Final Approval

The Greenstone Management System MVP business requirements are approved.

Development must preserve:

- Configurable company data.
- Safe demo records during development.
- Separate production data.
- Customer-specific price snapshots.
- Strict one-order-to-one-invoice rules.
- Yearly automatic document numbering.
- Traceable opening stocks and balances.
- Confirmed customer credit thresholds.
- Strong audit logs.
- No silent stock or financial changes.

There are no remaining company-data questions that must block MVP development.
