# Phase 8 handoff (2026-08-03)

Written for a fresh agent (or engineer) picking up Phase 8 — Finished Stock
and Deliveries — with no other context. Read this in full before touching
any code. It supersedes nothing in `docs/business-blueprint.md`,
`docs/technical-blueprint.md`, or `docs/implementation-plan.md`; it points at
the relevant sections of each and adds the operational detail a planning
document doesn't carry (which files to open, which mistakes already
happened once, which commands to run).

## 1. Current branch and latest commit

- Branch: `main`
- Latest commit: `c6df1ae` — "feat: add purchase payments and supplier
  balance tracking"
- Nothing from Phase 8 has been implemented — no schema changes, no
  migrations, no application code. This document and the following planning
  doc edits are the only Phase 8 artifacts that exist so far (all
  documentation, not yet committed as of this handoff):
  - `docs/business-blueprint.md` §2.19 — resolved lifecycle, delivery
    breakage, and PREPAID sections.
  - `docs/technical-blueprint.md` §4.11 — resolved lifecycle/credit-check/
    PREPAID notes, expanded Delivery Item field list.
  - `docs/implementation-plan.md` §12 (Phase 8) — full 8A–8F sub-phase
    breakdown.
  - `docs/database-notes.md` §5 — concrete `deliveries`/`delivery_items`
    column plan.
  - `docs/permissions-matrix.md` — `delivery:complete` action added.
  - `docs/handoffs/phase-8-deepseek-handoff.md` — this file.

## 2. Completed phases

Everything through Phase 7D is implemented, tested, and pushed:

- Phases 1–5: core setup, auth, customers, products, orders, credit.
- Phase 6A–6F: production, curing, finished stock (balances/movements exist
  but `reservedQuantity` is unwired — see §5), broken products
  (`FINISHED_STOCK` stage wired, others pre-declared), truck capacity
  (`Product.maxPiecesPerTruck`), drivers, vehicles, vehicle owners.
- Phase 7A: supplier opening balances.
- Phase 7B: raw-material reference data (Cement/Sack, Dust/Tonne,
  Pumice/Cubic Metre).
- Phase 7C: Purchases (`purchases`/`purchase_items`), immutable once
  created.
- Phase 7D: Purchase Payments (`purchase_payments`/
  `purchase_payment_allocations`), multer file upload, three-state
  PENDING/APPROVED/REVERSED lifecycle, supplier-balance formula complete
  (`opening balance + purchases − approved payments`).

Read `docs/implementation-plan.md` for the authoritative phase list and
status table before assuming anything else is or isn't done.

## 3. Exact remaining Phase 8 sub-phases

Work one at a time, in this order. Each is a full vertical slice (schema →
backend → frontend → tests) and should be reviewable/mergeable on its own —
do not start the next one until the current one is approved, per this
project's standing phase-discipline rule (`CLAUDE.md`: plan → wait for
explicit approval → implement only the approved scope → validate → report).

1. **8A — Delivery planning and stock reservation.** `Delivery`/
   `DeliveryItem` schema, `DEL-YYYY-0001` numbering, one order + one
   snapshotted customer address + one driver + one vehicle per delivery,
   credit-block check + override wiring, create/list/detail, permissions,
   audit log. No dispatch yet.
2. **8B — Trip and transport-cost calculation.** Single-product
   `requiredTrips` auto-calc with capacity snapshot; manual entry for
   multi-product deliveries; transport rate entry + total cost; payee
   snapshot.
3. **8C — Dispatch.** Physical stock reduction, `DELIVERY_DISPATCH` ledger
   write, PREPAID dispatch block. Does not touch `OrderItem`/`Order.status`.
4. **8D — Delivery completion and broken-product recording.** Actual
   quantity received + broken quantity, advances
   `OrderItem.deliveredQuantity`/`remainingQuantity`, recomputes
   `Order.status`, writes `BrokenProductRecord` (`stage: DELIVERY`).
5. **8E — Pre-dispatch cancellation.** Releases the reservation, written
   reason, audit log. Only from `PLANNED`.
6. **8F — Administrative correction.** Separate action for fixing an
   incorrectly recorded dispatch/delivery quantity — written reason, audit
   log, `CORRECTION` movement. Never used for ordinary delivery breakage
   (that's 8D).

Full detail for each is in `docs/implementation-plan.md` section 12 (Phase
8), which was just rewritten to match this handoff — read it, not just this
file.

## 4. Approved delivery lifecycle

Four statuses: `PLANNED`, `DISPATCHED`, `DELIVERED`, `CANCELLED`.
**`DISPATCHED` is not delivery completion** — this was the single biggest
correction from the original Phase 8 plan draft, so do not collapse it back
down.

- `PLANNED`: created, stock reserved atomically, nothing else.
- `DISPATCHED`: truck left the yard. Reduce reserved and physical finished
  stock, write `DELIVERY_DISPATCH`. Do **not** touch
  `OrderItem.deliveredQuantity`/`remainingQuantity`, do not complete the
  Order.
- `DELIVERED`: customer received the goods. Record actual quantity received
  + quantity broken. Increase `deliveredQuantity` by the actual-received
  amount only, recalculate `remainingQuantity`, recalculate `Order.status`
  (complete only once every item's `remainingQuantity` is 0).
- `CANCELLED`: only from `PLANNED`. Releases the reservation. Written reason
  + audit log required.

No `REVERSED`/un-dispatch status exists — once dispatched, fixing a mistake
goes through the separate 8F correction action, never a rollback.

## 5. Stock reservation and dispatch rules

Two independent earmarking layers already exist in the schema — know the
difference before writing reservation logic:

- **Order-level** (`OrderItem.allocatedQuantity`, already written by
  Production/Phase 6C): how much stock has been produced *for this order*.
- **Product-level** (`FinishedStockBalance.reservedQuantity`, currently
  always 0 — nothing writes it yet): a product-wide "spoken for by some
  delivery" pool. `availableQuantity = physicalQuantity − reservedQuantity`
  (the formula already exists on the model; the field is just unfed).

Before reserving a `DeliveryItem`, validate all three:
1. `quantity ≤ OrderItem.remainingQuantity`
2. `quantity ≤ OrderItem.allocatedQuantity − OrderItem.deliveredQuantity`
3. `quantity ≤ FinishedStockBalance.availableQuantity` for that product

Reservation (`PLANNED`) writes **no** `FinishedStockMovement` row — only
physical-stock-affecting changes get a ledger entry. Dispatch is the only
Phase 8 step that writes one (`DELIVERY_DISPATCH`, already pre-declared in
the enum since Phase 6A). `finished-stock.repository.ts`'s existing
`setBalanceQuantities` does not touch `reservedQuantity` and has 4 existing
call sites — do not change its signature; add a new function alongside it.

## 6. Broken-product rules

Recorded only at the `DELIVERED` step (8D), never combined with an 8F
correction. Worked example: dispatched 1,000, broken during delivery 20,
actually delivered 980.

- Finished stock stays reduced by the full 1,000 — it already left the yard
  at dispatch.
- `OrderItem.deliveredQuantity` increases by 980 only.
- A `BrokenProductRecord` (`stage: DELIVERY` — pre-declared in the enum,
  currently unwired) is created for the 20.
- The 20 broken pieces are never returned to finished stock.
- `broken-products.service.ts`'s `recordBrokenProductInTransaction` is
  already stage-agnostic — this becomes its second real caller after
  `FINISHED_STOCK`. Read that file before wiring `DELIVERY`.

## 7. PREPAID payment limitation

The Customer Payments module doesn't exist until Phase 9. `PREPAID` is
**never** treated as already paid.

- `CREDIT` deliveries reuse the existing credit-status check
  (`computeCreditStatus` in the `customer-credit` module — the same
  current-balance check already used for CREDIT orders) and the existing
  override workflow. Do **not** use `computeProjectedExposure` — the order
  was already checked for projected exposure at its own creation; re-running
  that check at delivery time would double-count it.
- A `PREPAID` delivery may reach `PLANNED` (reserved).
- A `PREPAID` delivery must be rejected at the `DISPATCHED` transition with a
  clear business-rule error, until Phase 9 exists to replace that block with
  a real "approved payment covers this order" check.
- Do not add a temporary "paid" checkbox. Do not create placeholder/fake
  Customer Payment records. Do not build any part of Phase 9 early to work
  around this — the block is deliberate and temporary.
- For browser/manual testing during Phase 8, use `CREDIT` orders — `PREPAID`
  orders will always fail dispatch by design until Phase 9 ships.

## 8. Driver, Vehicle, Vehicle Owner, and payee rules

No changes from the approved Phase 6F design — Phase 8 only *reads* these
records, it doesn't change their shape:

- Driver and Vehicle are selected separately on every delivery. There is no
  permanent Driver↔Vehicle pairing anywhere in the schema.
- The payee is always the Vehicle Owner linked to the selected Vehicle
  (`vehicle.vehicleOwnerId`) at delivery-creation time — resolved by that
  FK, **never** by matching names or phone numbers.
- Snapshot the payee (vehicle-owner id + name + phone) onto the `Delivery`
  row so a later edit to that `VehicleOwner` record never rewrites delivery
  history — same reasoning as `Order`'s address snapshot.
- If the Driver happens to own the vehicle, that person has their own,
  separate `VehicleOwner` record — never auto-merged with their `Driver`
  record.

## 9. Files and modules to inspect before writing any code

Read these fully, in this rough order:

- `docs/business-blueprint.md` §2.19 (Deliveries), §2.20 (Drivers/Vehicle
  Owners/Vehicles), §2.24 (credit block/override wording — note "Related
  order or delivery").
- `docs/technical-blueprint.md` §4.11 (Delivery/Delivery Item field lists —
  now annotated with the 2026-08-03 resolutions), §4.4 (`maxPiecesPerTruck`).
- `docs/database-notes.md` §5 ("Future Delivery schema") — the concrete
  column-level plan.
- `docs/permissions-matrix.md` — `delivery` row (now includes `complete` as
  its own action, added this session).
- `backend/prisma/schema.prisma` — `FinishedStockBalance`,
  `FinishedStockMovementType`/`FinishedStockMovement`, `BrokenProductStage`/
  `BrokenProductRecord`, `Customer`/`CustomerAddress`, `Driver`,
  `VehicleOwner`, `Vehicle`, `Order`/`OrderItem`, `CustomerCreditOverride`.
- `backend/src/modules/finished-stock/{finished-stock.service,repository}.ts`
  — confirms `setBalanceQuantities` doesn't touch `reservedQuantity`; the
  pattern for a new tx-aware function alongside it.
- `backend/src/modules/broken-products/broken-products.service.ts` —
  confirms `recordBrokenProductInTransaction` is stage-agnostic already.
- `backend/src/modules/customers/customers.service.ts` around line 420–467
  — `assertCustomerDeactivatable` has a standing placeholder noting it can't
  check unfinished deliveries or reserved stock yet ("Phases 8 and 9... revisit
  when those phases ship"). Extend this once `Delivery` exists — flagged as
  in-scope-by-necessity even though not itemized as its own sub-phase.
- `backend/src/modules/purchases/*` and `backend/src/modules/
  purchase-payments/*` — the most recent six-file modules; mirror their
  shape (routes → controller → service → repository → validators → types),
  their cross-module service-call pattern (never cross-module repository
  imports), and their audit-log/permission wiring.
- `backend/src/shared/utils/nairobi.ts` — **do not** apply
  `isNotFutureNairobiDate` to `Delivery.deliveryDate`. That restriction
  exists for Purchases/Purchase Payments (money already spent); a delivery
  is inherently scheduled for today or later, so a future-date block there
  would be a real regression, not a reused safeguard.

## 10. Migration risks

Every migration this session (`phase7a`, `phase7c`, `phase7d`) has hit the
same issue and will very likely hit it again for Phase 8's migration:

**Better Auth index drift.** Two Better Auth indexes
(`account_userId_idx`, `session_userId_idx`) exist in the live dev database
but are not tracked in migration history. `prisma migrate dev` includes
extraneous `CREATE INDEX` statements for them in every new migration, which
fail with "Duplicate key name" (MySQL 1061). Fix, every time:
1. Remove the two extraneous `CREATE INDEX` statements from the generated
   `migration.sql`.
2. Drop any partially-created tables from the failed attempt via a direct
   one-off script.
3. `prisma migrate resolve --rolled-back "<migration_name>"`.
4. `prisma migrate deploy`.
5. `prisma generate`.

Do not work around this by skipping/forcing migrations or touching Better
Auth's own tables.

Separately: `backend/tests/setup/test-database.ts`'s `TABLES` array drives
`truncateAll()` between tests. Every new table Phase 8 adds
(`deliveries`, `delivery_items`) must be added to that list immediately —
missing an entry has twice caused spurious 409 Conflict errors from leftover
rows colliding with freshly-allocated document numbers (it happened for
`purchases`/`purchase_items` in 7C and was proactively avoided for 7D's
tables). Add Phase 8's tables to this list in the very first commit that
creates them, not as an afterthought.

## 11. Validation and test commands

Backend (`cd backend`):
- `npm run typecheck` — `tsc --noEmit -p tsconfig.check.json`
- `npm run lint`
- `npm run test` — `vitest run`, full suite
- `npm run prisma:migrate` — interactive dev migration (expect the Phase 8A
  migration to hit §10's Better Auth drift issue)

Frontend (`cd frontend`):
- `npm run typecheck` — `next typegen && tsc --noEmit`
- `npm run lint`
- `npm run test` — `vitest run`

## 12. Known existing warnings (as of this handoff, commit `c6df1ae`)

- Backend: `npm run typecheck`, `npm run lint`, `npm run test` are all clean
  — 0 errors, 0 warnings, 658/658 tests passing (47 files).
- Frontend: `npm run typecheck` is clean. `npm run test` is clean (23/23,
  5 files). `npm run lint` reports **5 pre-existing warnings**, all the same
  shape — React Compiler skipping memoization because React Hook Form's
  `watch()` "cannot be memoized safely":
  - `features/production/components/production-form.tsx:108`
  - `features/purchase-payments/components/purchase-payment-form.tsx:73`
  - `features/purchases/components/purchase-form.tsx:96`
  - (plus 2 more of the same category in the same lint run)

  These are pre-existing and harmless — the component just isn't
  auto-memoized, no functional bug. Phase 8's delivery form will very likely
  use `watch()` the same way (it's the established pattern for showing live
  totals — trip count, transport cost, running allocation totals) and will
  probably add 1–2 more of the same warning. That is expected, not a
  regression to chase down; do not restructure the form to avoid `watch()`
  just to silence it, since every existing form in this codebase already
  accepts this trade-off.

## 13. Working instructions

- One sub-phase at a time (§3). Present a plan for the sub-phase, wait for
  explicit approval, implement only that sub-phase, run §11's validation
  commands, report files changed/migration details/test results honestly,
  then stop and wait for the next instruction.
- Do not start 8B before 8A is approved and merged, and so on down the list.
- Do not implement any part of Phase 9 (Customer Payments) to work around
  the PREPAID limitation in §7.
- Do not use browser automation (`frontend/CLAUDE.md` / root `CLAUDE.md`
  both forbid it) — ask the user to check a screenshot when visual
  verification is needed.
- Do not stop, kill, or restart the user's frontend/backend terminal
  processes.
- Do not commit or push unless explicitly instructed to.
