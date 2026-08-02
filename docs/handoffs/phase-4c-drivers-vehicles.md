# Handoff — Phase 4C: Employees, Drivers, Vehicles

Written before a context compaction, so the next session (or the next
`claude` invocation) can pick this up without re-deriving it.

## 1. Current phase and status

**Phase 4C — Employees, Drivers, and Vehicles: COMPLETED.**

`docs/implementation-plan.md` progress table and the Phase 4C section header
both say `COMPLETED`. All three modules are implemented, tested, and
**committed** (see section 9).

Next phase up: **Phase 4D — Suppliers, Company Settings, and the development
demo seed** (not started, not approved yet — see section 12).

## 2. Approved Driver and Vehicle decisions (final)

These came from the user directly and override the original Phase 4C draft.
Full text is in `docs/implementation-plan.md`, Phase 4C section — this is the
condensed version:

- **Drivers and Employees are separate.** A driver is not automatically an
  employee. Do not add salary/employee fields to Driver, ever.
- **Driver fields**: `name`, `phone`, `nationalId` (required, unique),
  `isActive`. No other fields.
- **Vehicles are hired-only for the MVP.** Greenstone owns no vehicles today.
  `ownershipType` stays in the schema (enum `COMPANY`/`HIRED`, default
  `HIRED`) for future extensibility, but it is **never accepted from a
  request** — every vehicle is created as `HIRED`, decided entirely
  server-side. The frontend has no ownership choice at all.
- **`hireCost` is removed from Vehicle entirely** (it existed in an earlier
  draft). This does **not** mean hire cost is out of business scope — a
  vehicle just doesn't have one *permanent* hire cost. Actual transport cost
  varies per delivery trip and belongs to a later Delivery/Expense/
  transport-payment workflow. Do not invent a rate or formula now, and do not
  drop transport cost from future business scope when that workflow is
  designed.
- **Vehicle fields**: `registrationNumber` (unique), `vehicleType`,
  `truckLengthM`, `truckWidthM`, `truckHeightM`, `calculationFactor`,
  `calculatedLoadKg`, `calculatedLoadTonnes`, `isActive`. Dimensions are
  **required** on every vehicle (reversed from the original draft, where they
  were optional) — every vehicle needs a known load capacity.

## 3. Driver `nationalId` normalization rules

Two columns, same pattern as Customer phone/email and Product name:

- `nationalId` — the readable value, trimmed only. This is what's displayed.
- `nationalIdNormalized` — trimmed, **uppercased**, all internal whitespace
  **removed** (not just collapsed). This is the column with the `@unique`
  constraint, built by `normalizeNationalId()` in
  `backend/src/modules/drivers/drivers.repository.ts`.
- The duplicate check (`assertNationalIdAvailable` in `drivers.service.ts`)
  runs on **both** create and update, excluding the record's own id — editing
  a driver can never silently turn it into a duplicate of another.

## 4. Vehicle measurement formula

```text
calculatedLoadKg = truckLengthM × truckWidthM × truckHeightM × calculationFactor
calculatedLoadTonnes = calculatedLoadKg ÷ 1000
```

- Dimensions entered in metres, each **required**, each greater than zero,
  each **capped at 50m** (added after a real bug — see section 8).
- Decimal-safe throughout: `Prisma.Decimal` end to end, no floats, in
  `backend/src/modules/vehicles/vehicles.service.ts`
  (`calculateTruckLoad()`).
- Recalculated on create, and on update whenever **any** dimension changes —
  all three snapshot values (`calculationFactor`, `calculatedLoadKg`,
  `calculatedLoadTonnes`) are recomputed together so they never drift apart.
- Never recalculated in bulk, never on a plain read. A future change to the
  default factor must not rewrite an already-saved vehicle's stored figures —
  this is enforced simply by the fact that nothing ever touches a vehicle's
  row except that vehicle's own create/update call.

## 5. Backend-controlled calculation factor (1100)

- `DEFAULT_CALCULATION_FACTOR = 1100` is a constant in
  `vehicles.service.ts`. **Not a request field** — `createVehicleBodySchema`
  and `updateVehicleBodySchema` (`.strict()`) reject it if sent.
- Frontend (`features/vehicles/components/vehicle-form.tsx`) shows `1100` in
  a **disabled, read-only** field, and computes a live "Estimated load"
  preview client-side using the same formula — explicitly labelled "Preview
  only — the saved figure always comes from the backend." The persisted,
  authoritative figures always come from the API response.

## 6. Driver and Vehicle remain independent

No `driverId` and no `usualDriverId` exist on Vehicle — required or optional,
built or not. The two are fully separate master-data lists in Phase 4C. One
driver may (eventually) be used on many vehicles' deliveries; one vehicle may
be used by many drivers. Nothing in the current schema decides that pairing.

## 7. Driver/Vehicle connect per Delivery (future, Phase 8 — not built)

When Deliveries is built:

- One Delivery belongs to exactly one Driver and one Vehicle.
- One Driver may be used on many deliveries; one Vehicle may be used on many
  deliveries.
- Different drivers may use the same vehicle on different trips; the same
  driver may use different vehicles. The pairing is chosen **per delivery**,
  never fixed on the vehicle record.

**Required snapshot fields on the future Delivery record** (documented in
`docs/implementation-plan.md`, not yet modelled anywhere in code):

- `driverId`
- `vehicleId`
- vehicle registration number (snapshot)
- truck dimension snapshots (length, width, height)
- calculation factor snapshot
- calculated load kilograms snapshot
- calculated load tonnes snapshot

Reason: a vehicle's dimensions or a driver's details could change later, and
a past delivery's record must not silently change with them.

## 8. Redis cache rules (preserved, unchanged)

All three modules (`employees`, `drivers`, `vehicles`) follow the existing
cache-aside pattern, same as Customers/Products:

- List reads go through `cache.getOrSet()` with a 300-second TTL, keyed by
  `buildCacheKey({ module, resource: 'list', identifier })` where the
  identifier encodes every filter/sort/page combination.
- Every create, update, activate, and deactivate calls
  `invalidate*Cache()` → `cache.delByPrefix(buildCacheKeyPrefix(module))`
  **after** the transaction commits, never before.
- MySQL is always the source of truth; a cache failure never fails the
  request (this is the shared `cache.service.ts` behaviour, not something
  these modules implement themselves).

## 9. Exact files changed (already committed — see section 11)

Full list is in commit `a850a5d` (see `git show --stat a850a5d`). Summary:

**Backend** (new): `src/modules/{employees,drivers,vehicles}/*` (6 files
each), `tests/api/{employees,drivers,vehicles}.test.ts`.
**Backend** (changed): `prisma/schema.prisma`, `src/app.ts`,
`tests/setup/test-database.ts` (added `employees`/`drivers`/`vehicles` to the
truncate list — this was a real bug fix, see section 8 of the prior report).

**Frontend** (new): `features/{employees,drivers,vehicles}/*` (api, hooks,
schemas, types, components), `app/(system)/{employees,drivers,vehicles}/`
(list, new, detail, edit routes — 4 each).
**Frontend** (changed): `components/layout/nav-items.ts`.

**Docs** (changed): `docs/implementation-plan.md`, `docs/database-notes.md`.

**This handoff's own changes** (uncommitted as of writing — see section 11):
`docs/implementation-plan.md` (Phase 4C status flipped to `COMPLETED` in the
progress table and section header), `docs/handoffs/phase-4c-drivers-vehicles.md`
(this file, new).

## 10. Migration status

Two migrations, both applied cleanly to the dev database
(`greenstone_dev`), confirmed via `prisma migrate status` →
"Database schema is up to date!":

1. `20260802040854_phase4c_employees_drivers_vehicles` — created
   `employees`, `drivers`, `vehicles` tables.
2. `20260802050406_phase4c_driver_national_id_vehicle_hired_only` — added
   Driver `nationalId`/`nationalIdNormalized`; Vehicle: dropped `hireCost`,
   made dimensions/factor/calculated fields required, dropped the
   `ownershipType` index.

Both migrations had to be applied by hand (`prisma migrate diff` → write the
`migration.sql` file → `prisma migrate resolve --applied` →
`prisma db execute --file`), because `prisma migrate dev` refuses to run
non-interactively in this environment. Both migration files include a note
about two harmless pre-existing `CREATE INDEX` statements (on `account`/
`session`, unrelated Phase-2 drift) that were deliberately omitted because
those indexes already exist.

**One real data event during this phase**: before the second migration, a
row count check found 1 existing test driver ("richard", no national ID) and
0 vehicles. Per the user's explicit "stop and report" instruction, work
paused; the user chose to delete that one test row, which was done with
their approval before the migration was written. Nothing else was ever at
risk — both tables started and remain otherwise empty in dev.

## 11. Uncommitted Git changes (as of writing this handoff)

Everything from the Phase 4C rework itself **is already committed**
(commit `a850a5d`, on `main`, 1 commit ahead of `origin/main` — not pushed).

Still uncommitted right now, from writing this handoff:
- `docs/implementation-plan.md` (Phase 4C status → `COMPLETED`)
- `docs/handoffs/phase-4c-drivers-vehicles.md` (this file, new)

Per the user's explicit instruction for this turn: **do not commit, do not
push.** These two files are left staged-or-not as plain working-tree changes
for the user to review.

## 12. Tests already run (all passing at last check)

- Backend: `pnpm --filter backend run typecheck` ✅,
  `pnpm --filter backend run lint` ✅ (0 errors),
  `pnpm --filter backend run test` ✅ **336/336 passing**.
- Frontend: `pnpm --filter frontend run typecheck` ✅,
  `pnpm --filter frontend run lint` ✅ (0 errors; 2 informational
  React-Compiler warnings about TanStack Table / React Hook Form `watch()`,
  same pre-existing class as earlier phases, not a problem),
  `pnpm --filter frontend run test` ✅ 9/9,
  `pnpm --filter frontend run build` ✅ (all Employees/Drivers/Vehicles
  routes present: list, new, `[id]`, `[id]/edit` × 3 modules = 12 routes).

None of this has been re-run since the handoff edits above (they're docs-only
changes with no code impact, so re-running isn't expected to change anything,
but it hasn't been done in this exact moment).

## 13. Exact next implementation step

**Phase 4D — Suppliers, Company Settings, and the development demo seed.**
Not started. Not approved. Before touching it:

1. Read `docs/business-blueprint.md` sections on Suppliers (2.16, 2.17,
   2.18) and Settings, plus `docs/technical-blueprint.md`'s Supplier/Settings
   entity notes.
2. Prepare a detailed plan the same way Phase 4C was planned (Prisma models,
   backend files, frontend files, API endpoints, validation, UI behaviour,
   tests, docs, excluded work) and present it for approval — **do not
   implement anything until the user approves that plan.**
3. The development demo seed (`prisma/seed/development/`) is part of 4D too —
   it doesn't exist yet for Employees/Drivers/Vehicles/Suppliers, and needs
   its own design (clearly marked demo data, easy to remove, never inserted
   in production — per `docs/business-blueprint.md` section 4).

Also still true and unaffected by this phase: `RawMaterial` and
`MeasurementUnit` remain **deferred to Phase 7** — do not implement them as
part of 4D either.
