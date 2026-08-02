# Handoff — Starting Phase 5B

Written before Phase 5B implementation begins, so the next session can pick
this up without re-deriving it.

## 1. Phase 5A status

**Phase 5A — Quotations: COMPLETED.**

`docs/implementation-plan.md` progress table and the Phase 5A section both
say `COMPLETED`. Fully implemented, tested, and validated — **not yet
committed** (see section 5).

## 2. Important Quotation decisions (final, in effect)

These came from you directly and are the approved shape of Quotations —
`docs/implementation-plan.md` Phase 5A section has the full text; condensed
here:

- **Quotation PDF is in scope for 5A**, not deferred to Phase 9. This
  required finishing shared PDF/storage infrastructure that Phase 1 had
  deliberately left as a placeholder for this exact moment
  (`shared/storage/` was already complete; `shared/pdf/` had only a stub
  renderer). The real renderer is `PlaywrightPdfRenderer`
  (`shared/pdf/renderers/playwright.renderer.ts`); `PDF_RENDERER` now
  defaults to `playwright`.
- **New shared infrastructure**: `shared/documents/` — a reusable
  "generate and persist an official PDF" pipeline (render → decide if a new
  version is needed → store → record `GeneratedDocument`/`StoredFile`
  metadata → audit log, all in one transaction). Built generically so
  **Phase 9 reuses it for Invoices/Receipts without rework.**
- **Two new tables**: `stored_files` (file metadata; binary lives in the
  storage provider, never MySQL) and `generated_documents` (the relation
  table linking a business record to its PDF, restricted by
  `GeneratedDocumentType` to `QUOTATION`/`INVOICE`/`RECEIPT` — "other PDFs
  must not be added unless approved", business-blueprint 9.1).
- **Only `DRAFT` quotations are editable.** Every other status change is a
  one-way, explicit service action, never a plain field update. Allowed
  transitions: `DRAFT → ACCEPTED | REJECTED | CANCELLED`,
  `ACCEPTED → CANCELLED`. `REJECTED`/`CANCELLED` are terminal. Quotations
  are never deleted.
- **The backend calculates everything** — every `lineTotal`
  (`quantity × agreedUnitPrice`) and `totalAmount` (sum of line totals),
  using `Prisma.Decimal`, never trusted from a request, never JavaScript
  floating-point arithmetic.
- **Creation is one transaction**: allocate the yearly number, create the
  quotation and items, save totals, write the audit log. Any failure rolls
  back all of it, including the number.
- Before create/update, the service confirms the customer exists and is
  active, and every product exists and is active.
- **PDF version reuse rule**: a new version is rendered only when the
  source quotation's `updatedAt` is newer than the latest version's
  `generatedAt`. Deliberately **not** a checksum comparison of rendered
  bytes — Chromium embeds its own generation timestamp, so two renders of
  identical input are never byte-identical. This was a real bug found and
  fixed during testing (see section 4).
- **Frontend is a full page, not a Dialog** — the multi-item form needs more
  room than the master-data pattern. Customer/product pickers use the
  pre-existing `SearchableSelect` component (built earlier, unused until
  now). Repeatable items use a new generic
  `components/forms/item-row-list.tsx`, written so Orders (5B) can reuse it.

## 3. Migrations created

Both applied cleanly to `greenstone_dev`, confirmed via `prisma migrate
status` → "Database schema is up to date!". No existing-data risk — all new
tables.

1. `20260802113702_phase5a_quotations` — creates `stored_files`,
   `generated_documents`, `quotations`, `quotation_items`.
2. `20260802114739_phase5a_quotation_item_sort_order` — adds
   `quotation_items.sortOrder`. Added after a real bug: `createdAt` cannot
   order items reliably, because several items created together in one
   nested write can tie at the same millisecond. `sortOrder` is set from the
   request array's position and is the only thing the repository orders by.

Both applied by hand (`migrate diff` → hand-written `migration.sql` →
`migrate resolve --applied` → `db execute`), the same process used every
phase so far, each omitting the two harmless pre-existing
`account`/`session` index statements the diff always proposes.

## 4. Tests and validation results

- Backend: `typecheck` clean, `lint` clean, **396/396 tests passing**
  (re-run multiple times to confirm stability — no flakes).
- Frontend: `typecheck` clean, `lint` clean (only the pre-existing
  React-Compiler informational warnings — TanStack Table, React Hook Form
  `watch()` — same class as earlier phases, one more instance now in the
  quotation form), **9/9 tests passing**, `build` clean, all Quotations
  routes present.

**Two real infrastructure bugs found and fixed along the way** (both now
part of the codebase, not just noted):

1. `tests/setup/test-database.ts`'s `truncateAll()` issued
   `SET FOREIGN_KEY_CHECKS = 0` and the `DELETE`s as separate
   `$executeRawUnsafe` calls on the plain client. The mariadb driver adapter
   can hand separate calls different pooled connections, so the `SET` isn't
   guaranteed to apply to a later `DELETE` on another connection — harmless
   until a table has a real FK into an "earlier" table, which
   `quotation_items → products` introduced for the first time. Fixed by
   wrapping the whole truncate in one `$transaction`.
2. The PDF version-reuse logic originally compared rendered PDF byte
   checksums, which is unreliable (see section 2) — fixed by comparing
   `sourceUpdatedAt` against the latest version's `generatedAt` instead,
   which is also cheaper (skips rendering entirely on a cache hit).

**Post-completion bug fix** (found by you testing the running app, not by
the test suite): the quotation form's Customer/Product `SearchableSelect`
dropdowns requested `pageSize: 200` for their option lists, but
`products.validators.ts`/`customers.validators.ts` cap `pageSize` at 100 —
every request was silently rejected with a 422, and the form had no error
state for that case, so it looked like an empty list. Fixed by lowering the
request to `pageSize: 100` and adding a real error banner with a retry
button, so a future load failure is visible instead of looking like "no
records."

## 5. Current Git state

- Branch `main`, 1 commit ahead is **not** the case — HEAD is still at
  `2536652` ("completed pHASE 4D, added suppliers and settings"), which
  **is** pushed to `origin/main`.
- Everything from Phase 5A (backend module, shared PDF/documents
  infrastructure, two migrations, frontend feature, doc updates) is
  **uncommitted working-tree changes**, per your explicit instruction this
  turn: **do not commit, do not push.**
- Changed/new files: `backend/{.env.example,package.json,prisma/schema.prisma,src/app.ts,src/config/env.ts,src/shared/pdf/pdf.service.ts,tests/setup/test-database.ts,tests/unit/env.test.ts}`,
  `backend/prisma/migrations/{20260802113702_phase5a_quotations,20260802114739_phase5a_quotation_item_sort_order}/`,
  `backend/src/modules/quotations/`, `backend/src/shared/documents/`,
  `backend/src/shared/pdf/renderers/playwright.renderer.ts`,
  `backend/tests/api/quotations.test.ts`, `docs/{database-notes.md,implementation-plan.md}`,
  `frontend/components/layout/nav-items.ts`,
  `frontend/components/forms/item-row-list.tsx`, `frontend/app/(system)/quotations/`,
  `frontend/features/quotations/`, `pnpm-lock.yaml`.

## 6. Phase 5B — approved scope (planning only; not implemented)

Per your explicit instruction this turn: **do not implement Phase 5B yet.**
This section records the scope already agreed during Phase 5A's planning
corrections, so the next session doesn't have to re-derive it — a detailed
file-by-file plan still needs to be written and approved before any code is
written, the same process every phase has followed.

### Orders from accepted quotations

An Order can be created by converting an `ACCEPTED` Quotation — copying its
customer and items (product, quantity, agreed unit price) into the new
Order, preserving the original price snapshot. Per business-blueprint
section 4.5, a Quotation "may create one order" — this is a one-to-one
conversion, not a many-to-one merge.

### Direct orders

An Order can also be created directly, with no source quotation — the
agreed price is entered on the order item at creation time (business-
blueprint section 2.6).

### CASH and CREDIT payment types

Order gains an explicit `paymentType` field (`CASH` or `CREDIT`) — this
did not exist in the original technical-blueprint Order entity and was
added as an explicit decision during 5A planning, because business-blueprint
2.6/2.24 describe "credit orders" vs "fully paid orders" without ever naming
the mechanism. `CASH` orders skip the credit check entirely — a fully paid
order may proceed even when the customer is credit-blocked. `CREDIT` orders
are checked and blocked/warned per the thresholds below.

### Customer credit thresholds

Per business-blueprint section 2.24, based on outstanding balance:

| Outstanding balance | Status |
|---|---|
| Below KES 800,000 | NORMAL |
| KES 800,000–899,999 | WARNING |
| KES 900,000–999,999 | STRONG_WARNING |
| KES 1,000,000 or above | BLOCKED |

WARNING/STRONG_WARNING are informational only — they never block an order.
Only BLOCKED does, and only for `CREDIT` orders.

**Interim formula, until Invoices exist (Phase 9)**: outstanding balance =
opening balance + the customer's not-yet-invoiced `CREDIT` orders — not
opening balance alone, or blocking would never actually trigger before
Phase 9 ships. This switches to the real
`opening balance + issued invoices − approved payments` formula once
Invoices exist, and that interim term is removed.

### Customer opening balances

A `CustomerOpeningBalance` record: customer, amount, effective date, reason,
entered-by user, audit reference (technical-blueprint 4.3). Not an invoice.
Setting one recalculates the customer's credit status immediately.
`customer-credit: ['set-opening-balance']` is already granted to
admin/super_admin only (pre-declared in `permissions.ts`, accountant has
`read` only) — confirmed no permission changes needed, same situation every
phase so far has found.

### Admin and Super Admin credit overrides

A `CustomerCreditOverride` record: customer, related order, previous credit
status, written reason, approved-by user, timestamp (technical-blueprint
4.3). Lets a BLOCKED customer's new credit order proceed anyway. Requires a
written reason and is always audited. `customer-credit: ['override']` is
already admin/super_admin only.

## 7. Work excluded from Phase 5B

- Invoices, customer payments, receipts (Phase 9).
- Suppliers' purchases/purchase payments, raw materials (Phase 7).
- Production, curing, finished-stock reservation (Phase 6).
- Deliveries, vehicle/driver pairing per trip (Phase 8) — Driver/Vehicle
  remain independent master records, as already decided in Phase 4C.
- Discounts, VAT, taxes, fixed product pricing (never, per blueprint).
- Any real invoice-based credit formula — that's the Phase 9 switch-over
  noted above, not something to build now.

## 8. Exact next step

1. Read `docs/business-blueprint.md` sections 2.6 (Orders), 2.24 (Customer
   credit), 2.25 (Customer opening balances), and
   `docs/technical-blueprint.md` section 4.3/4.5 Order/Customer-credit
   entities — already read once during 5A planning, worth a fresh pass
   before writing the 5B plan since it's a different session.
2. Prepare a detailed Phase 5B plan in the same format as 5A (Proposed
   phase / Files to create / Files to change / Dependencies / Database
   impact / Validation / Excluded work), incorporating the approved scope in
   section 6 above.
3. Present the plan and **wait for explicit approval** before writing any
   migration or code — per the project's phase-discipline rules and this
   turn's explicit instruction not to implement yet.
4. `RawMaterial`/`MeasurementUnit` remain deferred to Phase 7, unaffected by
   Phase 5B.
