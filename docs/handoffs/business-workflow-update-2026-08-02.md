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

## 5. Exact next step

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
