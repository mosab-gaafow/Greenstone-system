# Handoff — Business Workflow Update (2026-08-02)

Written after this session's documentation-only update, so the next session
can pick up implementation without re-deriving what changed or why.

## 1. What happened this session

New confirmed company information changed several approved workflow
assumptions made during Phases 3–6B (Quotations were built in Phase 5A before
this information existed). Per your explicit instruction, this session was
**documentation and impact planning only**:

- No application code was written or changed.
- No migrations were created or run.
- No existing code was deleted (Quotations, `Order.paymentType`/
  `sourceQuotationId`, `Vehicle.ownershipType`/`hireCost` all remain exactly
  as they were).
- Nothing was committed or pushed.

## 2. Documents changed this session

1. `docs/decisions/business-workflow-update-2026-08-02.md` — **new.** The
   authoritative record of all 13 confirmed rule changes, in full detail,
   including the "Interactions between these changes" and "Unconfirmed
   rules" sections.
2. `docs/business-blueprint.md` — updated throughout: Quotations section
   rewritten as removed, Product operational names/truck capacity, direct
   13-step Order workflow, PREPAID/CREDIT renaming, Pumice/Cement purchase
   formulas, Vehicle Owners, transport payment, two-calculation customer
   credit, customer balance filters, document-numbering table, permissions
   bullets, MVP module list, phase list.
3. `docs/technical-blueprint.md` — updated throughout: module table,
   Product/Order/PurchaseItem/Vehicle/Delivery entity definitions, PDF plan,
   numbering table, module/feature-folder lists, Implementation Phase 5/7/8
   text, end-to-end test list, MVP scope list.
4. `docs/implementation-plan.md` — progress table annotated (5A marked
   "removed from plan, code removal pending" without rewriting the historical
   COMPLETED record); four new sub-phases added under the Phase 6 umbrella —
   **6C** (remove Quotations, rework Order), **6D** (Product operational
   names/truck capacity), **6E** (customer credit projection formula,
   balance filters), **6F** (Vehicle Owners, rework Vehicle) — each with
   expected scope written but explicitly marked NOT_STARTED and not yet
   planned/approved for implementation; Phase 7 enriched with Pumice/Cement
   detail; Phase 8 enriched with transport-payment/truck-capacity detail.
5. `docs/database-notes.md` — new "Planned schema changes (not yet applied)"
   section covering the Product additive migration, Order rename/add/drop,
   Quotation table drop (and its ordering dependency on the Order migration),
   Vehicle/VehicleOwner rework, and future Purchase Item/Delivery snapshot
   columns; a note added to the existing `quotations`/`quotation_items` table
   section pointing at the removal.
6. `docs/permissions-matrix.md` — `vehicle-owner` resource row added
   (create/read/update, all three roles, matching the driver/vehicle
   pattern); a note added under Sales and Credit that `quotation` is removed
   from the plan but still exists in code pending Phase 6C.
7. `CLAUDE.md` (root) — Data Rules line corrected: "Historical prices must
   use quotation, order, and invoice item snapshots" → "...order and invoice
   item snapshots" (Quotations are no longer part of the pricing-snapshot
   chain).

No other files were touched. No frontend or backend source file was edited.

## 3. What still exists in the codebase, unchanged

Everything flagged for future removal/rework is still live and working
exactly as before this session:

- `backend/src/modules/quotations/` (full module), `Quotation`/
  `QuotationItem` Prisma models, `QuotationStatus` enum, the `QUOTATION`
  quotation PDF pipeline, `frontend/app/(system)/quotations/`,
  `frontend/features/quotations/`.
- `Order.paymentType` (`CASH`/`CREDIT`), `Order.sourceQuotationId`,
  `OrderItem.sourceQuotationItemId` (verify the exact `order_items` column
  name against `schema.prisma` before writing the Phase 6C migration).
- `Vehicle.ownershipType`/its `COMPANY`/`HIRED` enum, and the Phase 4C
  volumetric fields (`truckLengthM`, `truckWidthM`, `truckHeightM`,
  `calculationFactor` defaulting to `1100`, `calculatedLoadKg`,
  `calculatedLoadTonnes`).
- `backend/src/modules/vehicles/vehicles.service.ts` line ~47:
  `DEFAULT_CALCULATION_FACTOR = 1100` — the value that conflicts in meaning
  with the new Pumice rate (also 1100, but KES/m³ not kg/m³).
- `backend/tests/api/quotations.test.ts`,
  `backend/tests/api/vehicles.test.ts` (extensive `ownershipType`/`hireCost`/
  volumetric-field assertions), `backend/tests/api/orders.test.ts`
  (extensive `paymentType`/`CASH`/`sourceQuotationId` assertions),
  `backend/tests/integration/permissions.test.ts` (a `quotation` permission
  assertion at roughly line 78-79).

## 4. Second-round confirmations (2026-08-02, same day)

All five items originally left open were confirmed by the business owner in
a follow-up round on the same day. Full detail is in
`docs/decisions/business-workflow-update-2026-08-02.md` section 12; summary:

1. **Hollow Pot 150mm/200mm operational names** — confirmed to stay empty
   permanently, not a pending placeholder.
2. **Mixed-product truck-load calculation** — confirmed deferred/out of
   scope; `maxPiecesPerTruck` only ever applies to a single-product delivery.
3. **`Order.status` lifecycle** — confirmed, seven statuses: `PENDING`,
   `IN_PRODUCTION`, `CURING`, `READY_FOR_DELIVERY`, `PARTIALLY_DELIVERED`,
   `COMPLETED`, `CANCELLED`. System-controlled, never user-writable;
   cancellation requires a written reason and audit log; payment status and
   delivery status stay separate concepts. The exact transition graph is
   left to Phase 6C's detailed planning, not invented ahead of it.
4. **Vehicle volumetric calculation** — confirmed **removed**. Final Vehicle
   fields: `registrationNumber`, `vehicleType`, `vehicleOwnerId`, `isActive`.
   `vehicleOwnerId` must be added nullable first, backfilled against
   existing rows, then made required — never edit an already-applied
   migration to do this.
5. **`Product.operationalName` uniqueness** — confirmed unique when present,
   via the same `operationalName`/`operationalNameNormalized` dual-column
   pattern already used for Customer phone/email, Driver `nationalId`, and
   Vehicle `registrationNumber`.

Additionally, Quotation removal (Phase 6C) gained explicit migration-safety
steps: check quotation row counts and any `Order.sourceQuotationId`
references before dropping anything, report findings before proceeding, and
never silently discard real data.

**No unconfirmed rules remain from this decision as of 2026-08-02.** Any
future rule change needs its own confirmation round.

## 5. Third-round clarifications (2026-08-03) — documentation only

A third round of business clarifications was applied, again documentation
only — no application code, migrations, or deletions. Full detail is in
`docs/decisions/business-workflow-update-2026-08-02.md` sections 13 and 14.

1. **230MM — pending product identification.** The company confirmed it uses
   the label "230MM," but not which official product it refers to. Recorded
   as an explicitly unresolved, non-blocking pending item — no `Product` row,
   no seed entry, no connection to an existing Hollow Pot/Hollow Block, no
   rename of an existing product. Must not be confused with the already
   confirmed "300mm" operational name (Hollow Pot 380 × 200 × 300 mm).
2. **Cement measurement unit corrected to "Sack."** Earlier documentation
   (this file's section 2, and the blueprints) used "Bag" — the company
   confirmed the company-facing name is "Sack." Measurement units remain
   fully configurable (`MeasurementUnit`, already built in Phase 6A) — this
   is a naming correction, not a schema or code change.
3. **Cement usage rules confirmed.** The 170–190 sacks/day figure is
   informational reference only: production always records the actual
   number of sacks used; the system must never auto-consume 170/190, never
   derive usage from a formula, never block production on the range, and
   never auto-create a General Expense from daily usage.
4. **Cement purchase/usage/stock separation confirmed.** Three distinct
   records — purchase (supplier, sacks, unit cost, total cost, payment
   status), usage (production record, date, actual sacks used), and stock
   (`opening + purchased − used ± adjustments`, calculated, not manually
   tracked). All three already map onto existing Phase 6A/6B generic
   entities (`RawMaterial`, `RawMaterialUsage`,
   `RawMaterialStockBalance`/`RawMaterialMovement`) — no new schema needed.
   KES 850/sack is a reference cost only; every purchase must snapshot its
   own unit cost, and a Cement purchase must never double as a General
   Expense.

None of this expands Phase 6D. Phase 6D still adds only
`Product.operationalName`/`Product.maxPiecesPerTruck` for the products
already confirmed in section 2 of the decision document, and does not touch
Cement, Raw Materials, Purchases, or Production usage — that remains Phase 7.

## 6. Phase 6D implemented (2026-08-03)

Superseding section 6's original next-step guidance below: Phase 6C (all
three sub-steps) and Phase 6D are now **both complete**.

Phase 6D added `Product.operationalName`/`operationalNameNormalized`/
`piecesPerPallet`/`maxPiecesPerTruck` (migration
`20260803180000_phase6d_product_operational_fields`), backfilled the four
confirmed products, removed the old global "12 pieces per pallet" rule from
`production.service.ts` in favour of each product's own confirmed value, and
updated the Product and Production frontend accordingly. 230MM remains
unresolved and untouched, per section 13 of the decision document. Full
detail is in `docs/implementation-plan.md`'s Phase 6D section.

**Next available phases, unstarted (at the time of writing):** 6E (customer
credit projection formula and balance filters) and 6F (Vehicle Owners;
rework Vehicle) — neither depends on the other; either may be planned next
once explicitly requested.

## 6a. Phase 6E implemented (2026-08-03, same day)

Superseding the note above: Phase 6E is now also **complete**. No migration
— pure service-logic plus one new read-only endpoint.

Split the accounting outstanding balance (`openingBalance` alone today —
orders are never part of it) from the projected credit exposure (adds
active, non-cancelled CREDIT orders and the new order's own total — the real
fix for the gap Phase 5B left, per section 6 of the decision document). Added
`GET /customers/:id/credit-projection`, wired `orders.service.ts`'s
order-creation check to it, and added the customer-list
`hasOutstandingBalance` filter. Full detail is in
`docs/implementation-plan.md`'s Phase 6E section.

**Next available phase, unstarted (at the time of writing):** 6F (Vehicle
Owners; rework Vehicle) — the only remaining sub-phase under the Phase 6
umbrella.

## 6b. Phase 6E addendum implemented (2026-08-03, same day) — Customer deactivation safeguards

A new confirmed business rule, added after 6E's original scope shipped:
migration `20260803190000_phase6e_customer_deactivation_reason` (adds
`Customer.deactivationReason`, nullable).

Normal deactivation is now blocked in the service layer
(`assertCustomerDeactivatable`) unless every Order is
`COMPLETED`/`CANCELLED` and the accounting outstanding balance is exactly
KES 0 — never silent, always a clear composed error naming the active
orders and/or balance. New `POST /customers/:id/force-deactivate`
(`customer:force-deactivate`, Super Admin/Admin only) bypasses this for an
exceptional reason, always audited with a full snapshot, and never
auto-cancels Orders or auto-erases the balance.

**Important, confirmed-before-implementing consequence:** Delivery, Stock
Reservation, Invoice, and Customer Payment don't exist yet (Phases 8/9), so
three of the six conditions are vacuously satisfied — genuinely unchecked,
not simulated — until those phases ship. And because no code path sets
`Order.status` to anything but `PENDING`/`CANCELLED` today, a customer with
any non-cancelled order cannot be normally deactivated right now, only
force-deactivated. Full detail in `docs/implementation-plan.md`'s Phase 6E
addendum section and `docs/decisions/business-workflow-update-2026-08-02.md`
section 16.

**Next available phase, unstarted:** 6F (Vehicle Owners; rework Vehicle) —
the only remaining sub-phase under the Phase 6 umbrella.

## 6c. Phase 6F implemented (2026-08-04) — Vehicle Owners; rework Vehicle

Phase 6F is now **complete**, closing out the last remaining sub-phase under
the Phase 6 umbrella. Two migrations, run in sequence:
`20260804100000_phase6f1_vehicle_owners` (new `vehicle_owners` table, new
`vehicles.vehicleOwnerId` added nullable) and
`20260804110000_phase6f2_vehicle_rework` (column made required, old
`ownershipType` enum and all six Phase 4C volumetric fields dropped).

New `vehicle-owners` backend module (six files, mirroring `drivers` exactly)
and matching frontend feature/pages/nav entry. `Vehicle` now requires an
active `VehicleOwner`, validated via a one-directional
`vehicles → vehicle-owners` service import — never the reverse, to avoid a
circular module dependency; the trade-off (a renamed/deactivated owner's
name can be briefly stale in a cached vehicle list) self-heals within the
existing 300s TTL and was accepted deliberately rather than fought.

The 3 pre-existing `Vehicle` rows (all confirmed non-production dev/demo
data) had no owner information anywhere to derive from safely — flagged per
the migration-safety rule, then backfilled with two new demo `VehicleOwner`
records via a one-off script (deleted after use), never inventing
production data. Backend 534/534 tests passing (one confirmed-transient
CSRF-cookie flake under full-suite load, not a regression). Frontend
typecheck/lint/9 tests/26-route build all clean. Full detail in
`docs/implementation-plan.md`'s Phase 6F section.

**Next available phase, unstarted (at the time of writing):** none approved.
Phase 6F was the last remaining sub-phase under the Phase 6 umbrella —
Phase 7 (Purchases and Supplier Balances) is the next item in
`docs/implementation-plan.md`'s progress table, but it has not been
discussed, planned, or approved.

## 6d. Phase 7A and 7B implemented (2026-08-03) — Supplier opening balances; raw-material reference data

Phase 7 (Purchases and Supplier Balances) was planned in full (16-section
plan: conflicts, entities, workflows, permissions, audit, numbering, Redis,
files, migrations/tests, excluded work, sub-phases) and approved in
principle, then split into four sub-phases — 7A–7D — the same way every
earlier multi-part phase in this project has been. Only 7A and 7B are
implemented so far.

**Phase 7A — Supplier opening balances and balance display.** Migration
`20260803145847_phase7a_supplier_opening_balances` added `SupplierOpeningBalance`
(mirrors `CustomerOpeningBalance` exactly: corrected in place, one row per
supplier, full history in the audit log). Lives inside the existing
`suppliers` module rather than a new `supplier-balances` module — unlike the
customer side, there is no separate pre-declared permission resource forcing
a split, so `supplier:update`/`supplier:read` (already granted to all three
roles) gate the new endpoints. This is a deliberate asymmetry from the
customer equivalent (Admin/Super Admin only): flagged for awareness, not
changed, since inventing a new restricted permission was out of scope. New
`PATCH /suppliers/:id/opening-balance` and `GET /suppliers/:id/balance`
(`outstandingBalance` equals `openingBalance` alone until 7C/7D exist).
Balance is never cached, matching customer credit status. Frontend gained a
`SupplierBalanceCard` + opening-balance dialog on the supplier detail page,
mirroring the customer credit-status card file-for-file.

**Phase 7B — Raw-material reference data.** No schema change. Fixed a gap
found during Phase 7 planning: the `raw-materials`/`measurement-units`
modules have existed since Phase 6A but had zero rows in any environment —
the development demo seed never got a `raw-materials.ts` file. Cement, Dust,
and Pumice, and their measurement units (Sack, Cubic Metre, Tonne), are
confirmed real system data (business-blueprint sections 2.12–2.13), so they
were added to the **production** seed, not the dev demo seed — the same
reasoning already applied to the confirmed initial products. Idempotent;
reorder levels left unset; every raw material gets its normal zero-balance
stock row via the existing `insertRawMaterial` repository function, reused
rather than duplicated. No stock movement, no audit-log entry, no opening
quantity of any kind is created by this seed — a real opening quantity is
still entered later, during production setup, through the existing Phase 6A
`set-opening` action.

Both sub-phases: backend 570/570 tests passing, backend/frontend
typecheck/lint/build all clean. Full detail in `docs/implementation-plan.md`'s
Phase 7A/7B sections.

**Next available phase, unstarted (at the time of writing):** 7C (Purchases
module) — planned in principle as part of the full Phase 7 plan, but not yet
separately approved for implementation. 7D (Purchase Payments module) follows
after it.

## 6e. Phase 7C and 7D implemented (2026-08-03) — Purchases; Purchase Payments

Phase 7 is now **complete** — 7C and 7D were the last two sub-phases under
the Phase 7 umbrella. Two migrations, one per sub-phase:
`20260803160927_phase7c_purchases` (`purchases`, `purchase_items`) and
`20260803171800_phase7d_purchase_payments` (`purchase_payments`,
`purchase_payment_allocations`) — both hit the same pre-existing Better Auth
index drift every Phase 7 migration has hit since 7A, fixed the same way
each time.

New `purchases` and `purchase-payments` backend modules (six files each).
Purchases are immutable once created — creating one *is* receiving it,
crediting the Phase 6A raw-material ledger in the same transaction. Purchase
Payments carry the same `PENDING → APPROVED → REVERSED` lifecycle already
anticipated for customer payments, complete the supplier
outstanding-balance formula
(`openingBalance + Σ(Purchase.totalCost) − Σ(APPROVED PurchasePayment.amount)`),
and introduce this codebase's first real file-upload endpoint (evidence,
via `multer`, with genuine magic-byte signature validation and
transaction-failure cleanup). Full detail, including the Pumice/Cement
calculation design and a real bug found and fixed in the Purchase form
before commit, is in `docs/implementation-plan.md`'s Phase 7C/7D sections.

A same-day addendum added a future-date restriction to both `purchaseDate`
and `paymentDate` (Nairobi-calendar-aware on both frontend and backend, not
just a browser-local check).

Backend 658/658 tests passing; frontend 23/23 tests passing, both builds
clean.

**Next available phase, unstarted (at the time of writing):** Phase 8
(Finished Stock and Deliveries) — the next item in
`docs/implementation-plan.md`'s progress table. Not yet planned or approved.

## 7. Exact next step (original, first-round session — historical)

This session (including the second-round confirmations) still did not plan
or approve any implementation phase — everything above is documentation and
impact planning only. The next session should:

1. Plan **Phase 6C** first (Remove Quotations; rework Order — status,
   `paymentArrangement`, `sourceQuotationId` removal). It is the natural
   starting point: Quotation removal and the Order rework are bundled
   because they touch the same table, and Phase 6E (customer credit
   projection) reads the order's payment arrangement, so 6C landing first
   avoids rework in 6E.
2. Re-read `docs/decisions/business-workflow-update-2026-08-02.md` section
   12 (the second-round confirmations) before planning, since it changes the
   shape of 6C's `Order.status` work and 6F's Vehicle work from what the
   first-round document alone would suggest.
3. Prepare a detailed phase plan for 6C in the same format every phase has
   used (Proposed phase / Files to create / Files to change / Dependencies /
   Database impact / Validation / Excluded work) and **wait for explicit
   approval** before writing any migration or code, per the project's
   standing phase-discipline rule.
4. `docs/business-blueprint.md`, `docs/technical-blueprint.md`,
   `docs/implementation-plan.md`, and `docs/database-notes.md` still reflect
   only the **first-round** decision (they describe several of these items
   as "not yet confirmed"). They were not updated in the second round because
   the business owner's instruction that turn scoped the update to only the
   decision and handoff documents. Propagating the second-round
   confirmations into those four documents is worth doing before or during
   Phase 6C planning, so the blueprints don't contradict the decision record.
