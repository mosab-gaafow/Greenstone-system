# Permissions Matrix

Approved role and permission design for the Greenstone Management System.

This document is derived from `docs/business-blueprint.md` section 5. It adds no
permission that is not approved there.

Roles and permissions are implemented once, using Better Auth custom access
control in `backend/src/shared/auth/`. Do not create module-level permission
files.

## 1. Roles

| Role        | Better Auth name | Admin role |
| ----------- | ---------------- | ---------- |
| Super Admin | `super_admin`    | Yes        |
| Admin       | `admin`          | Yes        |
| Accountant  | `accountant`     | No         |

There is no custom role builder in the MVP. These three roles are fixed.

Roles are declared with `createAccessControl` and passed to the Better Auth
Admin plugin. `super_admin` and `admin` are configured as admin roles, which is
what allows them to manage users.

## 2. Permission matrix

`✅` full access · `✗` no access · a list means only those actions.

### System and users

| Resource     | Actions                                           | super_admin | admin | accountant |
| ------------ | ------------------------------------------------- | ----------- | ----- | ---------- |
| `user`       | create, read, update, set-role, set-password, ban | ✅          | ✅    | ✗          |
| `session`    | list, revoke                                      | ✅          | ✅    | ✗          |
| `capability` | grant, revoke, read                               | ✅          | ✅    | ✗          |
| `settings`   | read, update                                      | ✅          | ✅    | ✗          |
| `audit-log`  | read                                              | ✅          | ✅    | ✗          |

### Master data

| Resource           | Actions              | super_admin | admin | accountant |
| ------------------ | -------------------- | ----------- | ----- | ---------- |
| `customer`         | create, read, update | ✅          | ✅    | ✅         |
| `customer-address` | create, read, update | ✅          | ✅    | ✅         |
| `product`          | create, read, update | ✅          | ✅    | read       |
| `measurement-unit` | create, read, update | ✅          | ✅    | read       |
| `raw-material`     | create, read, update | ✅          | ✅    | ✅         |
| `supplier`         | create, read, update | ✅          | ✅    | ✅         |
| `employee`         | create, read, update | ✅          | ✅    | read       |
| `driver`           | create, read, update | ✅          | ✅    | ✅         |
| `vehicle-owner`    | create, read, update | ✅          | ✅    | ✅         |
| `vehicle`          | create, read, update | ✅          | ✅    | ✅         |

### Sales and credit

| Resource          | Actions                             | super_admin | admin | accountant |
| ----------------- | ----------------------------------- | ----------- | ----- | ---------- |
| `order`           | create, read, update, cancel         | ✅          | ✅    | ✅         |
| `customer-credit` | read, set-opening-balance, override | ✅          | ✅    | read       |

Only Super Admin and Admin may override a customer credit block. Every override
requires a written reason and an audit log.

**`order:cancel` (added 2026-08-02, Phase 6C-2):** every order starts
`PENDING` and moves only through explicit service actions. Cancellation
requires a written reason and an audit log, and is only allowed while the
order has not yet reached `COMPLETED`. There is no generic status-update
action — the remaining statuses (`IN_PRODUCTION`, `CURING`,
`READY_FOR_DELIVERY`, `PARTIALLY_DELIVERED`, `COMPLETED`) are set only by
Production, Curing, and Delivery as those phases ship, never by a direct
permission grant.

**`quotation` removed (2026-08-02, Phase 6C-3):** Quotations are not part of
the system — see `docs/decisions/business-workflow-update-2026-08-02.md`.
The `quotation` resource, its module, its tests, and its Prisma tables have
all been removed from the codebase.

### Production and stock

| Resource             | Actions                                | super_admin | admin | accountant                                |
| -------------------- | -------------------------------------- | ----------- | ----- | ----------------------------------------- |
| `production`         | create, read, allocate                 | ✅          | ✅    | ✅                                        |
| `curing`             | create, read, change-duration, release | ✅          | ✅    | create, read (release needs a capability) |
| `finished-stock`     | read, set-opening, adjust              | ✅          | ✅    | read, adjust                              |
| `broken-product`     | create, read                           | ✅          | ✅    | ✅                                        |
| `raw-material-stock` | read, set-opening, adjust              | ✅          | ✅    | read, adjust                              |

### Purchasing and delivery

| Resource           | Actions                                 | super_admin | admin | accountant                     |
| ------------------ | --------------------------------------- | ----------- | ----- | ------------------------------ |
| `purchase`         | create, read                            | ✅          | ✅    | ✅                             |
| `purchase-payment` | create, read, approve, reverse          | ✅          | ✅    | create, read                   |
| `delivery`         | create, read, dispatch, cancel, correct | ✅          | ✅    | create, read, dispatch, cancel |

### Finance

| Resource           | Actions                                   | super_admin | admin | accountant                         |
| ------------------ | ----------------------------------------- | ----------- | ----- | ---------------------------------- |
| `invoice`          | create, read, void                        | ✅          | ✅    | create, read                       |
| `customer-payment` | create, read, approve, reverse            | ✅          | ✅    | create, read                       |
| `receipt`          | read, print                               | ✅          | ✅    | ✅                                 |
| `expense`          | create, read                              | ✅          | ✅    | ✅                                 |
| `salary`           | register, read, approve, correct, reverse | ✅          | ✅    | read (register needs a capability) |

### Reporting

| Resource       | Actions                          | super_admin | admin | accountant       |
| -------------- | -------------------------------- | ----------- | ----- | ---------------- |
| `dashboard`    | read                             | ✅          | ✅    | ✅               |
| `report`       | read-operational, read-financial | ✅          | ✅    | read-operational |
| `notification` | read                             | ✅          | ✅    | ✅               |

The Accountant must not receive unapproved financial reports.

## 3. What the Accountant cannot do

From business blueprint section 5.3, the Accountant cannot:

- Approve or reverse customer payments.
- Approve, correct, or reverse salary payments.
- Override customer credit blocks.
- Manage users or system-wide security settings.
- View audit logs.
- Permanently delete financial records.

## 4. Capability grants

Two per-user permissions are approved, and only for the Accountant role. They
are a Greenstone-specific system, kept separate from Better Auth roles because
they are granted per user rather than per role.

| Capability        | Effect                                                    |
| ----------------- | --------------------------------------------------------- |
| `CURING_RELEASE`  | Allows an authorised Accountant to release cured products |
| `SALARY_REGISTER` | Allows a permitted Accountant to register salary payments |

Rules:

- Only Super Admin and Admin may grant or revoke a capability.
- Every grant and revocation is audited.
- A capability is checked **after** the role check, never instead of it.
- No other capability may be added without approval.

## 5. Enforcement

Backend permission checks are mandatory. Frontend permission checks control
interface visibility only, and hiding a button is not security.

Order of checks for a protected request:

1. Better Auth resolves the session. A deactivated user has no valid session.
2. Better Auth access control checks the role permission.
3. The capability is checked where one is required.
4. The service validates business state — stock, credit, status transitions,
   duplicate periods, and similar rules.
5. Sensitive actions run in a transaction and write an audit log.

Steps 4 and 5 remain Greenstone's responsibility. Better Auth controls system
access; it does not know Greenstone business rules.

## 6. Status

The matrix above is approved design. It is implemented in Phase 2.

Resources belonging to modules that do not exist yet are declared in Phase 2 but
only take effect when their module ships, from Phase 4 onward.
