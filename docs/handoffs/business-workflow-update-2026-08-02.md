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

**Next available phases, unstarted:** 6E (customer credit projection formula
and balance filters) and 6F (Vehicle Owners; rework Vehicle) — neither
depends on the other; either may be planned next once explicitly requested.

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
