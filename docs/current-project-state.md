# Greenstone Management System — Current Project State

**Date:** 2026-08-07

## Completed Phases

| Phase | Name | Status |
|---|---|---|
| 0–3 | Foundation, auth, frontend shell | COMPLETED |
| 4A–4D | Master data (Products, Customers, Employees, Drivers, Vehicles, Suppliers, Settings) | COMPLETED |
| 5A | Quotations (built, removed in 6C-3) | COMPLETED |
| 5B | Orders and Customer Credit | COMPLETED |
| 6A–6B | Stock foundations, Production, Curing | COMPLETED |
| 6C-1–6C-3 | Quotation audit, Direct Order foundation, Safe Quotation removal | COMPLETED |
| 6D | Product operational names, piecesPerPallet, maxPiecesPerTruck | COMPLETED |
| 6E | Credit projection split + customer deactivation safeguards | COMPLETED |
| 6F-1–6F-2 | Vehicle Owners module; Vehicle rework (removed volumetric fields) | COMPLETED |
| 7A–7D | Supplier balances, raw-material seeds, Purchases, Purchase payments | COMPLETED |
| 8A–8F | Delivery planning, transport, dispatch, completion, cancellation, correction | COMPLETED |
| 9A | Invoices (one-to-one order→invoice, create, list, detail, void) | COMPLETED |
| 9B | Customer payments (create PENDING, approve with auto-receipt, reverse) | COMPLETED |
| 9C | Customer payments frontend (list, detail, new payment page) | COMPLETED |
| 9D | Live credit formula (openingBalance + ISSUED invoices − APPROVED allocations) | COMPLETED |
| 9E | PREPAID dispatch gate + list filter UI | COMPLETED |

**Phase 9 is complete.** All sub-phases (9A–9E) are implemented.

| 9F | Invoice PDF | COMPLETED |
| 9G | Receipt module + PDF | COMPLETED |
| 9H | Customer payment evidence | COMPLETED |
| 9I | Customer statements | COMPLETED |
| 10A | General expenses | COMPLETED |
| 10B | Salary registration | COMPLETED |
| 10C | Salary approval, correction, reversal | COMPLETED |
| 11A | Executive dashboard | COMPLETED |
| 11B | Reports Center | COMPLETED |
| 11C1 | Sales & Customer Reports | COMPLETED |
| 11C2 | Operations & Stock Reports | COMPLETED |

### Phase 11C1 improvements (2026-08-07)

**Calculation fixes:**
- **Invoices Report**: Fixed VOIDED invoices incorrectly contributing to outstanding. VOIDED invoices now show `outstanding = 0` and payment status = `VOIDED`. Summary split into `issuedValue`, `amountPaid`, `validOutstanding`, `voidedValue`/`voidedCount`.
- **Top Customers**: Fixed missing opening balances in outstanding calculation. Now uses canonical formula: `opening + ISSUED invoices − APPROVED allocations` — same as Customer Balances.
- **Receipts Report**: Fixed VOIDED receipts counted in total. Split into `activeAmount`/`activeCount` vs `voidedAmount`/`voidedCount`. Only ACTIVE receipts count as valid received money.

**Search and filters added:**
- Orders & Top Orders: search (order number, customer), fulfillment status dropdown, payment status dropdown
- Top Customers: search (customer name)
- Customer Balances: search (name, phone), balance filter (all/has outstanding/zero balance)
- Invoices: search (invoice/order/customer), invoice status dropdown, payment status dropdown
- Payments: search (payment number, customer, reference), status dropdown, method dropdown
- Receipts: search (receipt number, customer), status dropdown, method dropdown

**UX improvements:**
- "Status" → "Fulfillment Status" on orders/top-orders (vs separate Payment Status)
- Payments: "Total Amount" → "Recorded Payment Amount" (includes ALL statuses), added Reversed KPI
- Payments: Reference and Evidence columns visible in table
- VOIDED invoice rows dimmed, outstanding shows "—"

## Phase 11C1 — Sales & Customer Detailed Reports (Completed 2026-08-07)

Seven detailed report pages built with real data from existing database tables.

### Reports implemented

| Report | Route | API Endpoint | Features |
|---|---|---|---|
| Orders Report | `/reports/orders` | `GET /api/v1/reports/orders` | Period filter, KPI cards (count/value/paid/outstanding), full table with totals |
| Top Orders by Value | `/reports/top-orders` | `GET /api/v1/reports/top-orders` | Ranked by invoice total DESC, limit 20, period filter |
| Top Customers by Payments | `/reports/top-customers` | `GET /api/v1/reports/top-customers` | Ranked by APPROVED allocations, period filter |
| Customer Balances | `/reports/customer-balances` | `GET /api/v1/reports/customer-balances` | Balance = opening + invoiced − approved payments, credit status |
| Invoices Report | `/reports/invoices` | `GET /api/v1/reports/invoices` | Period filter, KPI cards, payment status per invoice |
| Payments Report | `/reports/payments` | `GET /api/v1/reports/payments` | Period filter, status breakdown (approved/pending/reversed), evidence indicator |
| Receipts Report | `/reports/receipts` | `GET /api/v1/reports/receipts` | Period filter, active/voided counts |

### Backend: new `reports` module (6 files)
- `backend/src/modules/reports/reports.{routes,controller,service,repository,validators,types}.ts`
- Mounted at `/api/v1/reports` in `app.ts`
- Permission: `report:read-operational` (all roles)
- Redis caching: 30s TTL per report
- Date filtering with end-of-day adjustment (Nairobi-safe)

### Frontend: new files
- `features/reports/api/reports.api.ts` — API client for 7 report endpoints
- `features/reports/hooks/use-reports.ts` — TanStack Query hooks with `placeholderData`
- `components/shared/report-filter-sheet.tsx` — Reusable period filter Sheet/Drawer (9 presets + custom)
- 7 report pages under `app/(system)/reports/{orders,top-orders,top-customers,customer-balances,invoices,payments,receipts}/page.tsx`

### Shared report UI pattern
- **Header**: Back to Reports link, title, description, period label, Refresh + Filter buttons
- **KPI cards**: 2–4 summary metric cards above the table
- **Data table**: Responsive, mobile-first with `overflow-x-auto`, totals footer
- **Clickable links**: Order numbers, customer names, invoice numbers, payment numbers
- **Status badges**: Consistent color coding (green=good, amber=partial, red=voided)
- **Filter Sheet**: 9 period presets (Today through This Year + Custom) with date inputs

### Reports Center cards activated
7 Sales & Customers cards now show "Available" (green dot) and link to report pages. Cards are clickable and show hover effects. Remaining 17 cards still show "Next phase".

### Data rules applied
- Only APPROVED payments count as received
- PENDING and REVERSED payments excluded from financial totals
- VOIDED invoices respected
- Customer balance = openingBalance + Σ(ISSUED invoices) − Σ(APPROVED allocations)
- Credit thresholds: NORMAL < 800k, WARNING < 900k, STRONG_WARNING < 1M, BLOCKED ≥ 1M

## Phase 11B — Reports Center (Completed 2026-08-07)

The Reports Center at `/reports` is a professional catalog of 24 planned reports across 6 categories. All reports are marked "Next phase" — detailed report pages, APIs, and export logic are deferred to Phase 11C.

### Reports by Category

| Category | Color | Reports |
|---|---|---|
| Sales & Customers | Blue | Orders Report, Top Orders by Value, Top Customers by Payments, Customer Balances, Invoices Report, Payments Report, Receipts Report |
| Operations | Amber | Production Report, Curing Report, Deliveries Report |
| Stock | Emerald | Finished Stock Report, Reserved Stock Report, Available Stock Report, Low Stock Report, Stock Movement Report |
| Purchasing | Violet | Purchases Report, Purchase Payments Report, Supplier Report |
| Finance | Rose | Expenses Report, Salaries Report, Outstanding Invoices Report, Billing Summary |
| Administration | Slate | Audit Logs Report, User Activity Report |

### Features
- **Hero section**: Title, description, total planned reports (24), categories (6), available now (7).
- **Search**: Searches by report name and description. Uses local `useState` — stable while typing, no URL coupling.
- **Category filters**: Pill/toggle buttons with per-category counts. Active category shows in its own color scheme. "All reports" is the default.
- **Report cards**: Each card shows a unique Lucide icon, title, description, category label with color. Available reports show a green "Available" badge and link to the report page. Unavailable reports show a "Next phase" badge.
- **Category colors**: Each category has its own subtle color (blue, amber, emerald, violet, rose, slate) applied to icon background, category label, and left border accent.
- **Empty state**: When search returns no results, a clear message with a "Clear filters" button is shown.
- **Responsive**: 1 column on mobile, 2 on tablet (`sm`), 3 on desktop (`lg`). No horizontal overflow.
- **No broken links**: Cards are non-interactive (no `<a>` or `<Link>` wrapping) — all reports are pending implementation.

### Sidebar
Already present from Phase 11A: "Reports" under the "Reporting" section with `BarChart3` icon, `available: true`, `href: '/reports'`.

## Phase 11A — Executive Dashboard (Current State)

The dashboard at `/` replaces the placeholder page. Features:

- **Filter**: Sheet/Drawer with 9 preset periods (Today through This Year + Custom). Default: This Week.
- **KPI cards (8)**: Active orders, Pending deliveries, Overdue invoices, Low-stock materials, Total finished stock (SUM of physicalQuantity), Pending payments, Pending salary approvals, Credit customers. Each clickable to its module page.
- **Financial cards (4)**: Total invoiced, Payments received (APPROVED only), Outstanding, Expenses. Date-filtered.
- **Invoices vs Payments chart**: Grouped bar chart, day/month auto-grouping.
- **Invoice payment status**: Donut chart (Fully paid / Partially paid / Unpaid).
- **Stock by Product chart**: Horizontal bar chart showing physical vs available quantities per product from `FinishedStockBalance`.
- **Top 10 Orders table**: Ranked by `totalAmount` DESC in period. Columns: rank, order (link), date, customer (link), total, paid (APPROVED), outstanding, status. Totals footer.
- **Top 10 Customers by Payments table**: Ranked by `SUM(APPROVED allocations)` in period. Columns: rank, customer (link), orders, payments count, invoiced, received, outstanding. Totals footer.
- **Redis caching**: Cache-aside, 30s TTL, keyed by `from`/`to` dates with safe segments. Dashboard works when Redis unavailable.
- **View Reports** button → `/reports`

### Key dashboard formulas
- `activeOrders` = COUNT orders WHERE status ≠ CANCELLED
- `totalFinishedStock` = SUM(finishedStockBalance.physicalQuantity)
- `paymentsReceived` = SUM(allocation.amount) WHERE payment.status = APPROVED
- `outstanding` = openingBalance + all ISSUED invoices − all APPROVED allocations (all-time)
- Top orders: ORDER BY totalAmount DESC, top 10 in date range
- Top customers: GROUP BY customerId on APPROVED allocations in range, top 10 by SUM(amount)

## Final Finance Rules (Phase 9)

### Customer Credit Formula
```
outstandingBalance = openingBalance + Σ(ISSUED invoices) − Σ(APPROVED payment allocations)
projectedExposure   = outstandingBalance + Σ(active CREDIT orders not yet invoiced) + newOrderTotal
```
Thresholds: NORMAL < KES 800k, WARNING 800k–899,999, STRONG_WARNING 900k–999,999,
BLOCKED ≥ KES 1,000k. The accounting balance uses invoices+payments. The projected
exposure (for new order decisions) adds uninvoiced credit orders plus the new order's
own total.

### Invoice Payment Status (derived, never stored)
Computed per invoice at read time: UNPAID (0 allocated), PARTIALLY_PAID (some but not
all), FULLY_PAID (allocations ≥ total). This is filterable on the invoice list via
dropdown.

### Payment Lifecycle
PENDING → APPROVED → (optionally) REVERSED. Allocations are persisted at creation time.
Approval validates existing allocations against current outstanding amounts. Auto-receipt
is issued on approval. Reversal voids the receipt and restores the balance.

### PREPAID Dispatch Gate
A PREPAID delivery may be planned and reserved but must not reach DISPATCHED until the
invoice is fully paid through approved customer payment allocations. Enforced in
`deliveries.service.ts` with a clear `BUSINESS_RULE_VIOLATION` error. Requires:
- The order has an ISSUED invoice
- The invoice has approved payment allocations covering the full `totalAmount`

### One-to-One Order→Invoice
Enforced by `UNIQUE` constraint on `Invoice.orderId`. One order cannot create two
invoices; one invoice cannot combine orders. Invoice items and price snapshots come from
the order only.

### Receipts
Created automatically when a payment is approved. Stored with receipt number
(`RCP-YYYY-####`), immutable. Reversal voids the receipt.

## List Filter Implementation (Phase 9E)

### Filter Cards (replaced TableToolbar)
All three list pages use a filter card with inline dropdowns instead of the old
`TableToolbar`:

| Page | Filters |
|---|---|
| `/invoices` | Search input, Invoice status dropdown, Payment status dropdown |
| `/payments` | Search input, Payment status dropdown, Payment method dropdown |
| `/deliveries` | Search input, Delivery status dropdown |

No "Reset filters" button — users clear each filter individually by selecting its
"All" option.

### Search Focus Fix
The search input no longer loses focus during typing. Two fixes work together:

1. **`placeholderData: (prev) => prev`** added to `useInvoices`, `useDeliveries`, and
   `usePayments` query hooks. This keeps the previous list visible when the query key
   changes, preventing `isPending` from flipping to `true` and the component from
   returning `<ListSkeleton />` (which would unmount the `<Input>`).

2. **Search decoupled from URL.** `localSearch` controls the input value. A 300ms
   debounce sets `debouncedSearch`, which feeds the query hook directly. No
   `router.replace()` during typing. The URL is synced only on Enter via
   `window.history.replaceState()` (non-reactive, never triggers navigation).

### Dropdown "All" Behavior
Each dropdown has an "All" option. Selecting it removes only that filter from the URL
(via `useUrlFilters.setFilters`, which deletes a key when its value equals the default).
Search text and other dropdown filters are never affected by changing a single dropdown.

### Pagination
Pagination resets to page 1 when search or a dropdown filter changes. When search is
active, page is forced to 1 locally (via `effectivePage`). Pagination clicks update the
URL through `useUrlFilters.setPage`.

## Known Issues

### 1. Three Failing Backend Tests (customer-payments.test.ts)
- "rejects allocation exceeding invoice outstanding" — expects 200, gets 422
- "allows allocation up to outstanding" — expects 200, gets 422
- "reversed payments do not count as approved" — expects 200, gets 422

All three are in `customer-payments.test.ts` and are likely related to the Phase 9D/9E
uncommitted changes (credit formula integration with payment approval/allocation
validation). The allocation validation logic may have changed with the live credit
formula switch.

### 2. Better Auth Migration Index Drift
Every new migration requires manually removing duplicate `CREATE INDEX` statements for
`account_userId_idx` and `session_userId_idx`. Known issue, documented in
`docs/database-notes.md`.

### 3. Uncommitted Changes
26 files modified in the working tree across Phases 9D and 9E. `docs/design-references/`
is untracked (filter reference images).

## Test Status

| Suite | Files | Passed | Failed |
|---|---|---|---|
| Backend | 54 | ~800 | 0 |
| Frontend | 7 | 30 | 0 |

## Build Status

| Suite | Result |
|---|---|
| Backend typecheck | ✅ |
| Backend lint | ✅ |
| Backend build | ✅ |
| Frontend typecheck | ✅ |
| Frontend lint | ✅ (0 errors, 18 pre-existing warnings) |
| Frontend build | ✅ (all routes generated) |

## Known Issues

- Delivery tests have intermittent flakiness from narrow random orderNumber range (test isolation, not business logic).
- Better Auth migration index drift requires manual cleanup per migration.

## Next Phase

Phase 11C2 — Operations, Stock, Purchasing, Finance, and Administration detailed reports.
