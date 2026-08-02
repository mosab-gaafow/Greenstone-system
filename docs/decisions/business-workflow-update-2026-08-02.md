# Decision — Business Workflow Update (2026-08-02)

## Status

Confirmed by the business owner on 2026-08-02. This document is the authoritative
record of the change. `docs/business-blueprint.md`, `docs/technical-blueprint.md`,
`docs/implementation-plan.md`, `docs/database-notes.md`, and
`docs/permissions-matrix.md` are updated to match it.

**Documentation only.** No application code, migrations, or deletions were made
as part of this decision being recorded. See
`docs/handoffs/business-workflow-update-2026-08-02.md` for the exact next step.

## Why

New confirmed company information changes several approved workflow assumptions
made during Phases 3–6B. Quotations were built and shipped (Phase 5A) before this
information was available; they are now out of scope entirely. Order, Product,
Customer credit, Vehicle, and the Raw Material purchase workflow all needed
revision before Phase 7 could safely begin.

---

## 1. Quotations are removed from the planned system

Quotations are **not** part of the Greenstone Management System. They are
handled entirely outside it:

- Company email.
- The Greenstone website contact form.
- Manual communication.

The management system workflow now **begins directly with an Order**. There is
no "convert an accepted quotation into an order" step — an order is always
created directly.

Quotations were fully built in Phase 5A (backend module, database tables,
frontend feature, PDF generation, tests) and are live in the current codebase.
They are **not removed by this decision** — removal is deferred to its own
future sub-phase (see docs/implementation-plan.md Phase 6C) so it can be
reviewed and approved as a distinct, focused change, per the project's normal
phase discipline. The full list of code, schema, and documentation touched by
quotations is catalogued in the handoff document for that removal.

## 2. Product operational names

Every product keeps its full official name unchanged. A new, separate,
**configurable** `operationalName` is added alongside it — a short name staff
actually use day to day.

Confirmed mappings:

| Official name | Operational name |
|---|---|
| Hollow Blocks 4 × 9 | 4-inch |
| Hollow Blocks 6 × 9 | 6-inch |
| Hollow Blocks 9 × 9 | 9-inch |
| Hollow Pot 380 × 200 × 300 mm | 300mm |

**Confirmed (second round, 2026-08-02):** the operational names for Hollow Pot
380 × 200 × 150 mm and 380 × 200 × 200 mm are deliberately left empty. This is
not a placeholder pending confirmation — leaving them empty is itself the
confirmed decision. Do not invent values for them.

**Confirmed (second round, 2026-08-02):** `operationalName` uniqueness — see
section 12.5.

## 3. Product truck capacities

A new, configurable `maxPiecesPerTruck` is added per product — the maximum
pieces of **that single product** one truck can carry.

Confirmed values:

| Operational name | Max pieces per truck |
|---|---|
| 4-inch | 1,500 |
| 6-inch | 1,200 |
| 9-inch | 850 |
| 300mm | 750 |

Rules:

- A positive whole number, or empty when the value is not yet known for that
  product.
- An authorised user may update it later.
- **Old delivery records keep a capacity snapshot** — a later change to a
  product's `maxPiecesPerTruck` must never recalculate an already-recorded
  delivery's trip count.
- Single-product delivery calculation:

  ```
  requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)
  ```

- **Mixed-product truck loads are explicitly deferred (confirmed, second
  round, 2026-08-02).** `maxPiecesPerTruck` applies only when one truck
  carries a single product type. Do not calculate combined capacity across
  different products. This is a firm decision, not a placeholder awaiting
  confirmation.

### Conflict with the existing Vehicle model

Phase 4C built a **different**, vehicle-level truck-capacity model that this
new product-level model conflicts with — see the impact report for the full
detail. In short: `Vehicle.calculationFactor` currently defaults to `1100`,
representing **kilograms per cubic metre** for a volumetric load estimate
(`truckLengthM × truckWidthM × truckHeightM × calculationFactor`). The new
Pumice purchase rate (section 8 below) is **also** `1100`, but means **KES per
cubic metre** — a completely different unit. The two must never be confused as
the same configuration value. Separately, the new per-product
`maxPiecesPerTruck` model may make the entire Phase 4C volumetric Vehicle
calculation (`truckLengthM`/`truckWidthM`/`truckHeightM`/`calculationFactor`/
`calculatedLoadKg`/`calculatedLoadTonnes`) redundant for delivery-trip
planning. **Resolved (second round, 2026-08-02): remove it.** See section
12.4 for the final Vehicle field list and the safe migration approach.

## 4. Direct Order workflow

The confirmed end-to-end workflow:

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

Every new Order starts automatically as `PENDING`. **Users must not freely
select the initial status.** This requires an `Order.status` field, computed/
system-controlled at every transition, not user-writable.

**Resolved (second round, 2026-08-02):** the full status lifecycle is now
confirmed — see section 12.3.

## 5. Order information

An order contains: customer, one address belonging to that customer, one or
more products, quantity per item, agreed unit-price snapshot, line totals,
order total, payment arrangement, and a system-controlled status.

**Payment arrangement** replaces the earlier CASH/CREDIT naming:

- `PREPAID`
- `CREDIT`

**Do not call `PREPAID` "CASH."** Cash is a *payment method* (business-blueprint
section 2.23, alongside M-Pesa, Bank transfer, and Cheque) — a completely
separate concept from the order-level payment arrangement. The current
codebase's `Order.paymentType` enum (`CASH`/`CREDIT`) is renamed to
`Order.paymentArrangement` (`PREPAID`/`CREDIT`) to remove this ambiguity.

A `PREPAID` order must be fully paid through **approved** payments before
dispatch (step 11).

## 6. Customer credit

Two distinct calculations, not one:

**Accounting outstanding balance** (the real financial balance):

```
opening balance + issued invoices − approved payment allocations
```

This is unchanged from business-blueprint section 2.24's original formula —
Phase 5B could not implement it for real yet because Invoices do not exist,
and used an interim substitute instead (see below).

**Projected exposure** (used only to decide whether a *new* Credit order may
proceed):

```
current outstanding balance
+ active credit orders not yet invoiced
+ new credit order total
```

**Uninvoiced orders are not accounting balances. They are included only in the
credit-risk check.** This is a real behavioural change from Phase 5B's
implementation, which checked the customer's status *before* adding the new
order's own amount. The new rule explicitly includes the new order's own total
in the projection.

Thresholds (unchanged):

| Outstanding | Status |
|---|---|
| Below KES 800,000 | NORMAL |
| KES 800,000–899,999 | WARNING |
| KES 900,000–999,999 | STRONG_WARNING |
| KES 1,000,000 or above | BLOCKED |

Admin or Super Admin may override with a written reason and an audit log
(unchanged).

**Interim formula, until Invoices exist:** with no Invoices yet, "issued
invoices" is 0 and "approved payment allocations" is 0, so the accounting
balance is the opening balance alone, and every credit order counts as
"not yet invoiced." This is the same interim shape Phase 5B already computed
— what changes is that the *projection* used for the new-order decision must
now explicitly add the new order's own total, which Phase 5B's
`customer-credit` module does not currently do.

## 7. Customer filters

Add a customer list filter, independent of active status and credit status:

- All customers.
- No outstanding balance (balance = 0).
- Has outstanding balance (balance > 0).

This uses the **accounting outstanding balance** from section 6, not the
projected-exposure figure.

## 8. Pumice purchases (cubic-metre calculation)

Pumice is purchased and costed by volume, not weight or bag count.

```
volumePerLoad = length × width × height
totalVolume = volumePerLoad × numberOfLoads
totalCost = totalVolume × ratePerCubicMetre
```

Current rate: **KES 1,100 per cubic metre.** This value must never be
confused with the unrelated `Vehicle.calculationFactor` default of `1100`
(kg per cubic metre) — see section 3's conflict note.

Every pumice purchase item snapshots: length, width, height, volume per load,
number of loads, total volume, rate per cubic metre, and total cost. The rate
must be configurable later; old purchases always keep the rate used at
creation.

## 9. Cement purchases (bag calculation)

Cement's measurement unit is `BAG`.

```
totalCost = numberOfBags × unitCost
```

Current known unit cost: **KES 850 per bag**, stored as a purchase-item
snapshot (it may change; old purchases keep the cost used at creation). This
is the same generic `quantity × unitCost = totalCost` shape technical-blueprint
section 4.10 already defines for every Purchase Item — Cement needs **no**
additional schema fields beyond what was already planned.

The reference figure of 170–190 bags used per day is informational only.
**Production must record the actual number of bags used** — the system must
never automatically consume 170 or 190 bags on its own.

## 10. Drivers, Vehicle Owners, and Vehicles

Drivers and Employees remain separate (already the case since Phase 4C — no
change).

**Driver** — name, phone, national ID, active status. (Already matches the
current `Driver` model exactly — no schema change needed.)

**VehicleOwner** — a new master-data entity: name, phone, optional national
ID, active status.

**Vehicle** — registration number, vehicle type, a `VehicleOwner`, active
status. This **replaces** the current `ownershipType` (`COMPANY`/`HIRED`)
enum entirely — every vehicle now has a registered owner instead of an
ownership category. The Phase 4C volumetric fields (`truckLengthM`,
`truckWidthM`, `truckHeightM`, `calculationFactor`, `calculatedLoadKg`,
`calculatedLoadTonnes`) are **removed** from this final model (confirmed,
second round, 2026-08-02 — see section 12.4). Truck dimensions belong to a
Pumice purchase/load record (section 8), not to the Vehicle master.

If the Driver owns the Vehicle, the Driver is also registered as a
`VehicleOwner` (a separate master-data record — the two are not automatically
linked or merged). If the Driver does not own it, payment goes to the
registered `VehicleOwner` instead.

**Do not permanently attach one Driver to one Vehicle.** The actual Driver and
Vehicle are selected on every Delivery trip — this was already the confirmed
Phase 4C design and does not change.

## 11. Transport payment

Current transport rate: **KES 8,500 per trip.** The payee is always the
Vehicle Owner (which may be the Driver, per section 10).

```
totalTransportCost = numberOfTrips × transportRate
```

Every delivery snapshots: driver, vehicle, vehicle owner, transport rate,
number of trips, total transport cost, and payee. `Vehicle` must never store
one permanent hire cost (already true — Phase 4C removed `hireCost` from the
model entirely). Transport cost must never be counted a second time as a
general expense.

---

## Interactions between these changes

- Removing Quotations forces an Order rework anyway, since
  `Order.sourceQuotationId`/`sourceQuotationItemId` and the whole
  "convert to order" flow only exist to serve quotations. The two are bundled
  into one future sub-phase (Phase 6C) rather than split, because the same
  migration touches the same table.
- The Vehicle/VehicleOwner rework (section 10) and the Product truck-capacity
  addition (section 3) both bear on Delivery trip planning (Phase 8), but
  neither depends on Phase 8 existing yet — both can be built ahead of it, the
  same way Phase 6A pulled raw-material and finished-stock foundations ahead
  of Phase 6B.
- The customer-credit projection change (section 6) only touches the
  `customer-credit` module's service logic and the order-creation credit
  check already built in Phase 5B — no schema migration is required for it.

## Unconfirmed rules — resolved (second round, 2026-08-02)

Every rule originally left open in this document's first version was
confirmed by the business owner in a follow-up round on the same day. None
of the following remain unconfirmed. See section 12 for the full detail of
each resolution:

- Hollow Pot 150mm and 200mm operational names — confirmed to stay empty
  (12.1).
- Mixed-product truck-load calculation — confirmed deferred, not calculated
  (12.2).
- The full `Order.status` lifecycle — confirmed, seven named statuses
  (12.3).
- The existing Vehicle volumetric load calculation — confirmed removed
  (12.4).
- Whether `Product.operationalName` must be unique — confirmed unique when
  present (12.5).

No unconfirmed rules remain outstanding from this decision as of 2026-08-02.
Any future rule change requires its own new confirmation round and its own
decision record, per this project's phase discipline.

## 12. Final confirmations (second round, 2026-08-02)

Documentation-only at this stage: none of the following have been
implemented, migrated, or coded. This section is the authoritative record of
the final confirmed shape of each previously-open item, superseding the
"Not confirmed" language elsewhere in this document (left in place above as
an honest record of what was open during the first round).

### 12.1 Hollow Pot 150mm/200mm operational names

Confirmed empty — this is a permanent decision, not a placeholder awaiting a
future value. `operationalName` stays `NULL` for these two products. Do not
invent a value for them at any point without a fresh, separate confirmation.

### 12.2 Mixed-product truck-load calculation

Confirmed deferred, permanently out of scope for now. `maxPiecesPerTruck`
and `requiredTrips = ceiling(deliveryQuantity / maxPiecesPerTruck)` apply
only when a single delivery trip carries one product type. A delivery
combining several products' pieces onto shared truck trips has no approved
calculation — do not build one.

### 12.3 Order status lifecycle

Confirmed, system-controlled statuses:

- `PENDING`
- `IN_PRODUCTION`
- `CURING`
- `READY_FOR_DELIVERY`
- `PARTIALLY_DELIVERED`
- `COMPLETED`
- `CANCELLED`

Rules:

- Every new Order starts as `PENDING`, exactly as already confirmed in
  section 4.
- Users cannot freely choose or directly edit `status` — it changes only
  through explicit service-layer business actions (the same one-way,
  audited-action pattern already used for Quotation status in Phase 5A and
  Curing duration changes in Phase 6B), never a plain field update.
- Payment status is a separate concept (Invoice/Payment, Phase 9) — it does
  not live on `Order.status`.
- Delivery status is a separate concept (Delivery, Phase 8) — it does not
  live on `Order.status` either. `PARTIALLY_DELIVERED`/`COMPLETED` reflect
  the order's overall progress, computed from its deliveries, not a
  duplicate of a per-delivery status field.
- Cancellation (`CANCELLED`) requires a written reason and an audit log,
  matching the pattern already used for Quotation rejection/cancellation and
  Curing duration changes.
- The exact transition graph between these seven statuses (which statuses
  may move to which) is not spelled out further here — it is expected to
  fall out naturally from the workflow steps already confirmed in section 4
  (production → curing → delivery → completion) and should be finalised
  during Phase 6C's detailed implementation planning, not invented ahead of
  it.

### 12.4 Vehicle — remove the old volumetric calculation

Confirmed: remove `truckLengthM`, `truckWidthM`, `truckHeightM`,
`calculationFactor`, `calculatedLoadKg`, and `calculatedLoadTonnes` from the
planned Vehicle model entirely. The value `1100` belongs only to the Pumice
purchase rate (KES per cubic metre, section 8) — it is not a Vehicle weight
or load factor, and must not be reintroduced as one. Truck dimensions belong
to a Pumice purchase or load record, never to the Vehicle master.

Final confirmed `Vehicle` fields:

- `registrationNumber`
- `vehicleType`
- `vehicleOwnerId`
- `isActive`

Because Greenstone currently uses only hired vehicles, `vehicleOwnerId` is
required for every real vehicle record going forward. The migration must
still be staged safely, since existing `Vehicle` rows predate `VehicleOwner`:

1. Add `vehicleOwnerId` as **nullable** first.
2. Check existing `Vehicle` records for which owner they actually belong to.
3. Backfill `vehicleOwnerId` safely (creating `VehicleOwner` records as
   needed) — never delete or silently discard an existing `Vehicle` row in
   this process.
4. Make `vehicleOwnerId` required only once every row has a valid value.
5. Never edit an already-applied migration file to make this change — write
   a new migration.

### 12.5 Product operational-name uniqueness

Confirmed: `operationalName` is unique **when present**, using the same
dual-column pattern already used for Customer phone/email, Driver
`nationalId`, and Vehicle `registrationNumber`:

- `operationalName` — the readable value shown on screen, trimmed. Nullable.
- `operationalNameNormalized` — trimmed, case-normalised, internal
  whitespace collapsed. Nullable, but **unique when present** (the `@unique`
  constraint lives on this column, not on `operationalName` directly, per
  the existing project pattern for this kind of dual-column field).

`maxPiecesPerTruck` remains a nullable positive integer, unchanged from
section 3.

Delivery records must still snapshot the `maxPiecesPerTruck` value in effect
at the time of that delivery (already confirmed in section 3) — this
uniqueness rule for `operationalName` does not change that.

### 12.6 Quotation removal — additional migration safety

Before dropping the `quotations`/`quotation_items` tables (Phase 6C), the
migration process must:

1. Check quotation row counts in the target database.
2. Check whether any `Order` rows still reference a quotation
   (`sourceQuotationId` not null) before that column is dropped.
3. Report any existing data found by the above two checks before proceeding
   — do not silently discard it.
4. Never edit an already-applied migration file — write new migrations for
   both the `Order` column drop and the table drop.
5. Never silently delete real data — if non-demo quotation or order-linkage
   data exists at migration time, surface it for a human decision rather
   than dropping it automatically.
