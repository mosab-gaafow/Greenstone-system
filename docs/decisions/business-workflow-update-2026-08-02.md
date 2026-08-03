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

## 9. Cement purchases (sack calculation)

**Corrected (2026-08-03): the company-facing unit name is "Sack," not "Bag."**
See section 14 for the full, current cement rules — this section is left in
place as the original record, but the unit name below is superseded.

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

---

## 13. Pending product identification — 230MM (2026-08-03)

The company confirms it uses the label **230MM** somewhere in its product
line, but has **not yet confirmed** which official product it refers to.

**This is explicitly not resolved. Do not guess.**

- Do not assume 230MM means the confirmed Hollow Pot 380 × 200 × 300 mm
  operational name ("300mm," section 2) — 230MM is a different label and must
  not be treated as a typo or rounding of it.
- Do not create a new `Product` row for 230MM.
- Do not connect 230MM to an existing Hollow Pot or Hollow Block product.
- Do not rename any existing product's `operationalName` to 230MM.
- Record 230MM only as a **pending product identification**, kept traceable
  in documentation (this record and `docs/business-blueprint.md` section 2.3),
  not in application data.

The company will later confirm, for whatever product 230MM turns out to be:

- Its official product name.
- Its product category.
- Its official dimensions.
- Its pieces per pallet.
- Its maximum pieces per truck.

Until then, this pending item must not block development. Phase 6D (Product
operational names and truck capacity) proceeds using only the products and
operational names already confirmed in section 2 — it must not seed, create,
or reserve a placeholder for 230MM.

## 14. Cement measurement unit, usage, and purchase/stock separation (2026-08-03)

### Measurement unit

The company-facing unit name for Cement is **"Sack"** — not "Bag." This
corrects section 9 above, written before this was confirmed. Measurement
units remain fully configurable (`MeasurementUnit`, built in Phase 6A, is a
plain configurable master-data table, not a fixed enum) — "Sack" is simply
the confirmed initial value for Cement's unit, entered like any other
`MeasurementUnit` row.

```
totalCost = numberOfSacks × unitCost
```

This is the same generic `quantity × unitCost = totalCost` shape every
Purchase Item already has (technical-blueprint section 4.10) — no schema
change beyond what was already planned for Cement.

### Cement usage is operational reference only

The company normally uses approximately **170 to 190 sacks per day**. This
figure is informational context, never a calculation input:

- Production must record the **actual** number of cement sacks used for that
  production run — entered, never derived.
- The system must **never** automatically consume 170 or 190 sacks, or any
  other fixed quantity, from cement stock.
- The system must **never** calculate cement usage from a fixed
  product/formula relationship (this already matches business-blueprint
  section 2.12's general raw-material rule).
- The system must **never** block production because recorded usage falls
  below 170 or above 190 sacks — the range is informational, not a
  validation rule.
- The system must **never** automatically create a General Expense from
  daily cement usage — usage is a production/stock record, not a financial
  transaction.
- The 170–190 range may later be surfaced in the interface as helpful
  reference text (e.g. "typical daily usage: 170–190 sacks") alongside the
  actual recorded figure — display only, never a stored default or an
  enforced bound.

### Cement purchases, usage, and stock stay separate concepts

Three distinct records, not one combined figure:

**Cement purchase** — supplier, quantity purchased (sacks), unit cost per
sack, total purchase cost, payment status. This is an ordinary Purchase/
Purchase Item (technical-blueprint section 4.10) — no Cement-specific schema
fields are needed beyond the existing generic quantity × unit-cost shape.

**Cement usage** — a production record: date, actual sacks used. This is the
existing generic `RawMaterialUsage` entry (technical-blueprint section 4.9),
already built in Phase 6A/6B for every raw material — Cement needs no new
usage schema.

**Cement stock** — the current balance, calculated (not stored as an
independent manual figure) as:

```
current stock = opening stock + purchased sacks − actual sacks used ± stock adjustments
```

This is exactly the existing generic `RawMaterialStockBalance`/
`RawMaterialMovement` ledger already built in Phase 6A (`OPENING`,
`PURCHASE_RECEIPT`, `PRODUCTION_USAGE`, `POSITIVE_ADJUSTMENT`,
`NEGATIVE_ADJUSTMENT` movement types) — Cement uses that ledger like any
other raw material, no new stock model is needed.

### Cost reference, not a hard-coded value

The currently known cost of **KES 850 per sack is a reference figure only**:

- Do not permanently hard-code KES 850 anywhere in application code.
- Every Cement purchase stores its **own** unit-cost snapshot at the time of
  that purchase (the existing Purchase Item unit-cost snapshot pattern,
  technical-blueprint section 4.10) — a later cost change must never rewrite
  an old purchase's recorded cost.
- A Cement purchase must never be recorded a second time as a General
  Expense — purchase payments and general expenses stay separate accounts
  (business-blueprint section 2.17, already an established rule for every
  supplier purchase).

### Scope discipline

These clarifications describe confirmed business rules for a **future**
phase (Phase 7 — Purchases and supplier balances, per
`docs/implementation-plan.md`). They do not expand Phase 6D:

- Phase 6D adds only `Product.operationalName`/`Product.piecesPerPallet`/
  `Product.maxPiecesPerTruck` for the already-confirmed products (see
  section 15 for `piecesPerPallet`, confirmed after this section was
  written).
- Phase 6D does not seed 230MM (section 13).
- Phase 6D does not implement Cement, Raw Materials, Purchases, or
  Production cement usage — that work remains Phase 7, unstarted.
- No schema change is made by recording this section — `MeasurementUnit`,
  `RawMaterial`, `RawMaterialStockBalance`, `RawMaterialMovement`, and
  `RawMaterialUsage` already exist from Phase 6A/6B and already support
  everything described above without modification.

## 15. Product pieces per pallet (2026-08-03, implemented same day)

The company confirmed pieces-per-pallet is **per product**, not the single
global "12 pieces per pallet" figure business-blueprint section 2.7
previously assumed for every product.

Confirmed values:

| Operational name | Pieces per pallet |
|---|---|
| 4-inch | 18 |
| 6-inch | 12 |
| 300mm | 6 |
| 9-inch | Not confirmed — kept empty |

Rules:

- `Product.piecesPerPallet` is a nullable, configurable positive whole
  number, added alongside `operationalName`/`maxPiecesPerTruck` in Phase 6D.
- Production must use the selected product's own `piecesPerPallet` —
  `producedQuantity = pallets × product.piecesPerPallet`. There is no
  fixed, product-independent multiplier anywhere in the system any more.
- Production is **blocked** (a rejected request, not a silent default) for a
  product whose `piecesPerPallet` is not yet confirmed — currently the
  9-inch product (Hollow Blocks 9 × 9).
- Do not invent the 9-inch value. It stays empty until the company confirms
  it, the same "leave empty, don't guess" rule already applied to the two
  Hollow Pot operational names (section 12.1) and to 230MM (section 13).

**Status: implemented.** Phase 6D (`docs/implementation-plan.md`) added this
field, backfilled the three confirmed values plus left 9-inch's empty via
migration `20260803180000_phase6d_product_operational_fields`, and updated
`production.service.ts` to read it and block on `null`. See
`docs/database-notes.md`'s `products` table section for the schema detail.
